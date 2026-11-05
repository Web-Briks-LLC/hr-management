"""Deployment integration tests using local Git repositories and mocked npm/PM2.

Run: python3 -m unittest discover -s scripts/tests -v
No network, package installation, or real PM2 processes are used.
"""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.remote = self.base / 'remote.git'
        self.upstream = self.base / 'upstream'
        self.repo = self.base / 'checkout'
        self.bin = self.base / 'bin'
        self.bin.mkdir()
        self.log = self.base / 'commands.log'
        self.env = {
            **os.environ,
            'PATH': f'{self.bin}:{os.environ["PATH"]}',
            'TEST_LOG': str(self.log),
            'PM2_CLIENT': 'test-client',
            'PM2_SERVER': 'test-server',
            'PM2_PAYMENT': 'test-payment',
            'FORCE': '0',
            'CLEAN_CACHE': '0',
            'GIT_CONFIG_GLOBAL': '/dev/null',
            'GIT_CONFIG_NOSYSTEM': '1',
        }
        self.run_command(['git', 'init', '--bare', str(self.remote)], self.base)
        self.run_command(['git', 'init', '-b', 'main', str(self.upstream)], self.base)
        (self.upstream / 'scripts').mkdir()
        shutil.copy(ROOT / 'scripts/deploy.sh', self.upstream / 'scripts/deploy.sh')
        for app in ('client', 'server', 'payment'):
            (self.upstream / app).mkdir()
            (self.upstream / app / 'source.txt').write_text('initial\n')
        (self.upstream / 'README.md').write_text('docs\n')
        self.commit('initial')
        self.git('remote', 'add', 'origin', str(self.remote))
        self.git('push', '-u', 'origin', 'main')
        self.run_command(['git', '--git-dir', str(self.remote), 'symbolic-ref', 'HEAD', 'refs/heads/main'], self.base)
        self.run_command(['git', 'clone', str(self.remote), str(self.repo)], self.base)
        for name, body in {
            'npm': '''printf 'npm|%s|%s\\n' "${PWD##*/}" "$*" >> "$TEST_LOG"
if [[ "$*" == 'run build' && ${FAIL_BUILD:-} == "${PWD##*/}" ]]; then exit 1; fi
''',
            'pm2': '''printf 'pm2|%s\\n' "$*" >> "$TEST_LOG"
if [[ "$*" == "${FAIL_PM2:-never}" ]]; then exit 1; fi
''',
        }.items():
            script = self.bin / name
            script.write_text('#!/usr/bin/env bash\nset -eu\n' + body)
            script.chmod(0o755)

    def run_command(self, args, cwd, env=None):
        result = subprocess.run(args, cwd=cwd, env=env or self.env, text=True, capture_output=True)
        if result.returncode:
            self.fail(f'{args}: {result.stdout}\n{result.stderr}')
        return result

    def git(self, *args):
        return self.run_command(['git', *args], self.upstream)

    def commit(self, message):
        self.git('add', '.')
        self.git('-c', 'user.name=Deploy Test', '-c', 'user.email=deploy@example.test', 'commit', '-m', message)

    def update(self, path):
        with (self.upstream / path).open('a') as file:
            file.write('change\n')
        self.commit('change')
        self.git('push')

    def deploy(self, **options):
        self.log.write_text('')
        result = subprocess.run(['bash', 'scripts/deploy.sh'], cwd=self.repo,
                                env={**self.env, **options}, text=True, capture_output=True)
        return result, self.log.read_text().splitlines()

    def successful_deploy(self):
        result, commands = self.deploy()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return commands

    def test_first_deploy_builds_all_before_any_restart(self):
        commands = self.successful_deploy()
        for app in ('client', 'server', 'payment'):
            self.assertIn(f'npm|{app}|ci --include=dev', commands)
            self.assertIn(f'npm|{app}|run build', commands)
        first_restart = next(i for i, command in enumerate(commands) if command.startswith('pm2|restart'))
        self.assertTrue(all(i < first_restart for i, command in enumerate(commands) if command.endswith('|run build')))
        self.assertEqual(commands[-1], 'pm2|save')
        self.assertEqual(len(list((self.repo / '.git/hr-deploy-state').iterdir())), 3)

    def test_unchanged_and_docs_only_skip(self):
        self.successful_deploy()
        self.assertEqual(self.deploy()[1], [])
        self.update('README.md')
        self.assertEqual(self.deploy()[1], [])

    def test_only_changed_app_is_deployed(self):
        self.successful_deploy()
        self.update('client/source.txt')
        commands = self.successful_deploy()
        self.assertEqual(commands, ['pm2|describe test-client', 'npm|client|ci --include=dev',
                                    'npm|client|run build', 'pm2|restart test-client', 'pm2|save'])

    def test_shared_deployment_changes_select_all_apps(self):
        self.successful_deploy()
        self.update('scripts/deploy.sh')
        commands = self.successful_deploy()
        self.assertEqual(sum(command.endswith('|ci --include=dev') for command in commands), 3)

    def test_unconfigured_process_name_stops_before_install(self):
        result, commands = self.deploy(PM2_CLIENT='')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Set PM2_CLIENT', result.stderr)
        self.assertEqual(commands, [])

    def test_failed_build_preserves_state_and_retries_after_pull(self):
        self.successful_deploy()
        marker = self.repo / '.git/hr-deploy-state/client'
        previous = marker.read_text()
        self.update('client/source.txt')
        result, commands = self.deploy(FAIL_BUILD='client')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(command.startswith('pm2|restart') for command in commands))
        self.assertEqual(marker.read_text(), previous)
        self.assertIn('npm|client|run build', self.successful_deploy())
        self.assertNotEqual(marker.read_text(), previous)

    def test_failed_save_does_not_advance_state(self):
        result, _ = self.deploy(FAIL_PM2='save')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.repo / '.git/hr-deploy-state/client').exists())
        self.assertIn('pm2|save', self.successful_deploy())

    def test_force_and_cache_cleanup(self):
        self.successful_deploy()
        result, commands = self.deploy(FORCE='1', CLEAN_CACHE='1')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(sum(command.endswith('|cache clean --force') for command in commands), 3)

    def test_missing_process_and_dirty_checkout_stop_before_install(self):
        result, commands = self.deploy(FAIL_PM2='describe test-server')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(command.startswith('npm|') for command in commands))
        (self.repo / 'client/source.txt').write_text('local edit')
        result, commands = self.deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(commands, [])


if __name__ == '__main__':
    unittest.main()

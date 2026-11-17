import net from 'node:net';
import { spawn } from 'node:child_process';
import { mkdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const socketPath = path.join(root, '.runtime', 'dev.sock');
const command = process.argv[2];
const apps = [['client', 3000], ['payment', 3001], ['server', 5000]];

function request(message) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let response = '';
    socket.setTimeout(2000, () => socket.destroy(new Error('Dev manager did not respond.')));
    socket.on('connect', () => socket.write(message));
    socket.on('data', chunk => { response += chunk; });
    socket.on('end', () => resolve(response));
    socket.on('error', reject);
  });
}

if (command === 'stop' || command === 'status') {
  try { console.log((await request(command)).trim()); }
  catch (error) {
    if (['ENOENT', 'ECONNREFUSED'].includes(error.code)) console.log('Development apps are not running.');
    else { console.error(error.message); process.exitCode = 1; }
  }
} else if (command === 'dev') {
  await mkdir(path.dirname(socketPath), { recursive: true });
  try {
    console.log((await request('status')).trim());
    console.error('Development apps are already running. Use make stop first.');
    process.exit(1);
  } catch (error) {
    if (!['ENOENT', 'ECONNREFUSED'].includes(error.code)) throw error;
    if (error.code === 'ECONNREFUSED') await unlink(socketPath).catch(() => {});
  }

  const children = [];
  let stopping = false;
  const signalGroups = signal => {
    for (const child of children) {
      if (!child.pid) continue;
      try { process.kill(-child.pid, signal); }
      catch (error) { if (error.code !== 'ESRCH') console.error(error.message); }
    }
  };
  const shutdown = (code = 0) => {
    if (stopping) return;
    stopping = true;
    signalGroups('SIGTERM');
    // Keep ownership of the socket until descendants have been stopped.
    setTimeout(() => {
      signalGroups('SIGKILL');
      manager.close(() => process.exit(code));
    }, 1500);
  };
  const manager = net.createServer(socket => {
    socket.once('data', data => {
      if (data.toString() === 'stop') {
        socket.end('Stopping development apps.\n');
        shutdown();
      } else socket.end(`${stopping ? 'Stopping' : 'Running'}: client :3000, payment :3001, API :5000\n`);
    });
    socket.on('error', () => {});
  });
  manager.on('error', error => { console.error(error.message); process.exit(1); });
  manager.listen(socketPath, () => {
    console.log('Starting client :3000, payment :3001, API :5000. Ctrl+C or make stop stops all apps.');
    for (const [app, port] of apps) {
      const args = ['run', 'dev'];
      // Payment already declares its port in package.json.
      if (app === 'client') args.push('--', '--port', String(port));
      const child = spawn('npm', args, {
        cwd: path.join(root, app),
        env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
        stdio: 'inherit',
        detached: true,
      });
      children.push(child);
      child.on('error', error => { console.error(`${app}: ${error.message}`); shutdown(1); });
      child.on('exit', (code, signal) => {
        if (!stopping) {
          console.error(`${app} exited (${signal || code}); stopping all development apps.`);
          shutdown(code || 1);
        }
      });
    }
  });
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());
} else {
  console.error('Usage: node scripts/dev.mjs dev|stop|status');
  process.exitCode = 1;
}

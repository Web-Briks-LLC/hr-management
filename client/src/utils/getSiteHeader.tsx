export function getSiteHeader(path: string) {
    if (!path) return '';

    const clean = path.split('?')[0].split('#')[0];

    const parts = clean
        .split('/')
        .filter(Boolean)
        .filter((part) => !/^\d+$/.test(part))
        .filter((part) => !/[a-f0-9]{6,}/i.test(part));

    if (parts.length === 0) return 'Dashboard';

    const last = parts[parts.length - 1];

    return last.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

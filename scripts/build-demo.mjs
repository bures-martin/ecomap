/*
 * Builds the read-only demo: the web app with VITE_DEMO=true, plus the map's
 * data as JSON files next to it - a folder any static host can serve, such as
 * GitHub Pages. No server and no database needed.
 *
 *   npm run demo:build                 -> apps/web/dist-demo, served from /ecomap/
 *   npm run demo:build -- /            -> served from the root of a domain
 *
 * Try it locally: npx vite preview --outDir dist-demo (in apps/web, with the
 * same VITE_BASE). A Node script rather than shell variables, so it works the
 * same in PowerShell, Git Bash and on GitHub's Linux runners.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? '/ecomap/';
const community = process.argv[3] ?? 'bornholm';
const out = join(root, 'apps', 'web', 'dist-demo');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true, cwd: root, ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

rmSync(out, { recursive: true, force: true });
run('npm', ['run', 'build', '-w', '@ecomap/shared']);
run('npx', ['vite', 'build', '--outDir', 'dist-demo'], {
  cwd: join(root, 'apps', 'web'),
  env: { ...process.env, VITE_DEMO: 'true', VITE_BASE: base },
});
run('npx', ['tsx', 'src/demo/exportStatic.ts', join(out, 'demo'), community], {
  cwd: join(root, 'apps', 'api'),
});
/* GitHub Pages answers unknown paths with 404.html: the app, which then shows the right page. */
copyFileSync(join(out, 'index.html'), join(out, '404.html'));
console.log(`Demo built in ${out}, served from ${base}`);

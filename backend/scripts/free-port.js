/**
 * Free a TCP port before starting the dev server (Windows-friendly).
 */
const { execSync } = require('child_process');

const port = Number(process.argv[2] || 5000);
if (!port) process.exit(0);

if (process.platform === 'win32') {
  try {
    execSync(
      `powershell -NoProfile -Command "$c=Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue; if($c){$c|ForEach-Object{Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue}}"`,
      { stdio: 'ignore' }
    );
  } catch {
    // Port was not in use.
  }
  process.exit(0);
}

try {
  execSync(`npx --yes kill-port ${port}`, { stdio: 'ignore' });
} catch {
  // Port was not in use.
}

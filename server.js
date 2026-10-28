const { spawn } = require('child_process');
process.chdir(__dirname);
process.env.PORT = process.env.SERVER_PORT || process.env.PORT || '3000';
process.env.NEXT_TELEMETRY_DISABLED = '1';
console.log(`Luna Baby — starting production server on port ${process.env.PORT}`);
const child = spawn('./node_modules/.bin/next', ['start', '-p', process.env.PORT], { stdio: 'inherit', env: process.env });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

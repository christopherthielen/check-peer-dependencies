const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');

async function command(executable, args, { cwd, env = process.env, logFile, timeout = 60000, stream = false } = {}) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, env, detached: process.platform !== 'win32' });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f']);
      } else {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') reject(error);
        }
      }
    }, timeout);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stream) process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (stream) process.stderr.write(chunk);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      const output = `$ ${[executable, ...args].join(' ')}\ncwd: ${cwd}\nexit: ${exitCode}${signal ? ` (${signal})` : ''}\n${stdout}${stderr}`;
      resolve({ exitCode, stdout, stderr, output, timedOut });
    });
  });
  if (logFile) await fs.appendFile(logFile, result.output + '\n');
  if (result.timedOut) throw new Error(`Command timed out after ${timeout}ms\n${result.output}`);
  return result;
}

function npm(args, options) {
  if (!process.env.npm_execpath) throw new Error('Run this suite through npm run test:downstream.');
  return command(process.execPath, [process.env.npm_execpath, ...args], options);
}

module.exports = { command, npm };

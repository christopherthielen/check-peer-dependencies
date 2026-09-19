const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { command, npm } = require('./helpers/command');

async function main() {
  const repo = path.resolve(__dirname, '..');
  const cases = path.join(__dirname, 'downstream');
  const args = process.argv.slice(2);
  const filters = args.filter((arg) => arg !== '--keep');
  assert.ok(
    filters.length <= 1 && !filters[0]?.startsWith('--'),
    'Usage: npm run test:downstream -- [folder-name] [--keep]'
  );
  const filter = filters[0] || '';
  const files = [];
  for (const entry of (await fs.readdir(cases, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || !entry.name.includes(filter)) continue;
    const file = path.join(cases, entry.name, 'test.js');
    await fs.access(file);
    files.push(file);
  }
  assert.ok(files.length, `No downstream fixture folders match ${JSON.stringify(filter)}`);
  const root = await fs.mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'peer-downstream-'));
  console.log(`Downstream fixtures: ${root}`);
  let passed = false;
  try {
    const packed = await npm(['pack', '--ignore-scripts', '--json', '--pack-destination', root], { cwd: repo });
    assert.equal(packed.exitCode, 0, packed.output);
    const [artifact] = JSON.parse(packed.stdout);
    const consumer = path.join(root, 'consumer');
    await fs.mkdir(consumer);
    await fs.writeFile(
      path.join(consumer, 'package.json'),
      JSON.stringify({ name: 'downstream-consumer', private: true })
    );
    const installed = await npm(
      ['install', path.join(root, artifact.filename), '--ignore-scripts', '--no-audit', '--no-fund'],
      {
        cwd: consumer,
        timeout: 180000,
        logFile: path.join(root, 'setup.log'),
      }
    );
    assert.equal(installed.exitCode, 0, installed.output);
    const result = await command(process.execPath, ['--test', '--test-concurrency=1', ...files], {
      cwd: repo,
      env: {
        ...process.env,
        PEER_TEST_ROOT: root,
        PEER_TEST_TOOL: path.join(consumer, 'node_modules/check-peer-dependencies'),
      },
      timeout: 600000,
      stream: true,
      logFile: path.join(root, 'tests.log'),
    });
    passed = result.exitCode === 0;
    process.exitCode = result.exitCode || (passed ? 0 : 1);
  } finally {
    if (passed && !args.includes('--keep')) {
      await fs.rm(root, { recursive: true, force: true });
    } else {
      console.log(`Kept downstream fixtures and logs: ${root}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

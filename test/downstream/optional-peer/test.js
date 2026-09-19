const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

const fs = require('node:fs/promises');
const path = require('node:path');
test('an absent optional peer is fine', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run(['--verbose']);
  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.stdout, /OPTIONAL/);
});
test('an incompatible optional peer still fails', async (t) => {
  const project = await createProject(t, __dirname);
  await fs.cp(path.join(__dirname, 'registry/peer/2.0.0'), path.join(project.directory, 'node_modules/peer'), {
    recursive: true,
  });
  const result = await project.run();
  assert.equal(result.exitCode, 1, result.output);
  assert.match(result.stdout, /OPTIONAL.*2\.0\.0 is installed/);
});

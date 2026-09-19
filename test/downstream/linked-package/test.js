const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

const fs = require('node:fs/promises');
const path = require('node:path');
test('a linked package has its peers checked', async (t) => {
  const project = await createProject(t, __dirname);
  const installed = path.join(project.directory, 'node_modules/plugin');
  const linked = path.join(project.directory, 'linked-plugin');
  await fs.rename(installed, linked);
  await fs.symlink(linked, installed, process.platform === 'win32' ? 'junction' : 'dir');
  const result = await project.run(['--verbose']);
  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.stdout, /required by plugin@1\.0\.0/);
});

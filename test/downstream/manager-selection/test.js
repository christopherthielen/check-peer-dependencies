const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

const fs = require('node:fs/promises');
const path = require('node:path');
test('lockfiles choose the manager and an explicit flag overrides them', async (t) => {
  const project = await createProject(t, __dirname);
  await fs.writeFile(path.join(project.directory, 'package-lock.json'), '{}');
  const npm = await project.run(['--findSolutions']);
  assert.match(npm.stdout, /npm install -- peer/);
  await fs.writeFile(path.join(project.directory, 'yarn.lock'), '# yarn lockfile v1\n');
  const yarn = await project.run(['--findSolutions']);
  assert.match(yarn.stdout, /yarn add -- peer/);
  const forced = await project.run(['--findSolutions', '--npm']);
  assert.match(forced.stdout, /npm install -- peer/);
  const invalid = await project.run(['--npm', '--yarn']);
  assert.equal(invalid.exitCode, 1, invalid.output);
  assert.match(invalid.stderr, /Specify either --yarn or --npm but not both/);
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('solutions must satisfy every depender', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run(['--findSolutions', '--npm']);
  assert.equal(result.exitCode, 1, result.output);
  assert.match(result.stderr, /Unable to find a version of peer/);
  assert.ok(!result.stdout.includes('npm install --'), result.output);
});

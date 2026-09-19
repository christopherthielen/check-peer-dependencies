const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('an unknown registry package fails without a suggested install', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run(['--findSolutions', '--npm']);
  assert.equal(result.exitCode, 1, result.output);
  assert.match(result.stderr, /Error fetching npm versions/);
  assert.ok(!result.stdout.includes('npm install --'), result.output);
});

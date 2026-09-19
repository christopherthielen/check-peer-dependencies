const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('satisfied peers pass and verbose output explains why', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run(['--verbose']);
  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.stdout, /1\.2\.0 is installed/);
  assert.match(result.stdout, /All peer dependencies are met/);
});
test('debug objects remain readable', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run(['--debug']);
  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.stdout, /\n  name: 'peer'/);
  assert.ok(!result.stdout.includes('\\u000a'), result.output);
});

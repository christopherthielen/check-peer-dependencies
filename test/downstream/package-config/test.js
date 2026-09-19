const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('package.json options apply and explicit CLI options take precedence', async (t) => {
  const project = await createProject(t, __dirname);
  const configured = await project.run();
  assert.equal(configured.exitCode, 0, configured.output);
  assert.match(configured.stdout, /IGNORED/);
  const overridden = await project.run(['--ignore', 'another-peer']);
  assert.equal(overridden.exitCode, 1, overridden.output);
  assert.match(overridden.stdout, /peer is not installed/);
});

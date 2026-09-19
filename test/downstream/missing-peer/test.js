const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('a missing peer fails the check and can be explicitly ignored', async (t) => {
  const project = await createProject(t, __dirname);
  const missing = await project.run();
  assert.equal(missing.exitCode, 1, missing.output);
  assert.match(missing.stdout, /peer is not installed/);
  const ignored = await project.run(['--ignore', 'peer', '--verbose']);
  assert.equal(ignored.exitCode, 0, ignored.output);
  assert.match(ignored.stdout, /IGNORED/);
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('transitive peers are checked unless root-only mode is requested', async (t) => {
  const project = await createProject(t, __dirname);
  const nested = await project.run();
  assert.equal(nested.exitCode, 1, nested.output);
  assert.match(nested.stdout, /required by child@1\.0\.0/);
  const rootOnly = await project.run(['--runOnlyOnRootDependencies']);
  assert.equal(rootOnly.exitCode, 0, rootOnly.output);
});

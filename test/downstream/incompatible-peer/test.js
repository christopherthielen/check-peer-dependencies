const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('an installed but incompatible peer fails the check', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run();
  assert.equal(result.exitCode, 1, result.output);
  assert.match(result.stdout, /2\.0\.0 is installed/);
});

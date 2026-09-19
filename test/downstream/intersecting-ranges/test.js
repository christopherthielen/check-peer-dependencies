const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('a shared version satisfies intersecting peer ranges', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run(['--findSolutions', '--npm']);
  assert.equal(result.exitCode, 1, result.output);
  assert.match(result.stdout, /npm install -- peer@1\.2\.0/);
});

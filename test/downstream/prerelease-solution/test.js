const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('prerelease ranges can select a compatible prerelease', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run(['--findSolutions', '--npm']);
  assert.equal(result.exitCode, 1, result.output);
  assert.match(result.stdout, /peer@2\.0\.0-beta\.1/);
});

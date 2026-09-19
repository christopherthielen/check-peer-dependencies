const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('aliases and scoped packages without a JavaScript entry point resolve', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run(['--verbose']);
  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.stdout, /@fixture\/peer.*required by plugin@1\.0\.0/);
});

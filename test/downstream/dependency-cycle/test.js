const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('a dependency cycle finishes without revisiting packages forever', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run();
  assert.equal(result.exitCode, 0, result.output);
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

const fs = require('node:fs/promises');
const path = require('node:path');
test('missing manifests produce a readable error and a failing exit status', async (t) => {
  const project = await createProject(t, __dirname);
  await fs.unlink(path.join(project.directory, 'package.json'));
  const result = await project.run();
  assert.equal(result.exitCode, 1, result.output);
  assert.match(result.stderr, /package.json missing/);
  assert.match(result.stderr, /\n    at /);
  assert.ok(!result.stderr.includes('\\u000a'), result.output);
});
test('invalid JSON produces a readable error and a failing exit status', async (t) => {
  const project = await createProject(t, __dirname);
  await fs.writeFile(path.join(project.directory, 'package.json'), '{invalid');
  const result = await project.run();
  assert.equal(result.exitCode, 1, result.output);
  assert.match(result.stderr, /SyntaxError/);
  assert.match(result.stderr, /\n    at /);
});

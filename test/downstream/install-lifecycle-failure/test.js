const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

for (const manager of ['npm', 'yarn']) {
  test(`${manager}: stop when a package lifecycle script fails`, async (t) => {
    const project = await createProject(t, __dirname);
    const result = await project.run(['--install', `--${manager}`]);
    assert.equal(result.exitCode, 1, result.output);
    assert.match(result.output, /fixture lifecycle failed intentionally/);
    assert.ok(result.stderr.includes(`${manager} failed`), result.output);
    assert.ok(!result.output.includes('Recursion limit reached'), result.output);
    assert.ok(!result.stdout.includes('All peer dependencies are met'), result.output);
  });
}

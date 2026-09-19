const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

for (const manager of ['npm', 'yarn']) {
  test(`${manager}: suggest the highest compatible version without installing it`, async (t) => {
    const project = await createProject(t, __dirname);
    const result = await project.run(['--findSolutions', `--${manager}`]);
    assert.equal(result.exitCode, 1, result.output);
    assert.ok(
      result.stdout.includes(`${manager} ${manager === 'npm' ? 'install' : 'add'} -- peer@1.2.0`),
      result.output
    );
    assert.equal(await project.installedVersion('peer'), undefined);
  });
}

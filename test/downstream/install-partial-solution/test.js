const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

for (const manager of ['npm', 'yarn']) {
  test(`${manager}: a partial installation must not report success`, async (t) => {
    const project = await createProject(t, __dirname);
    const result = await project.run(['--install', `--${manager}`]);
    assert.equal(result.exitCode, 1, result.output);
    assert.equal(await project.installedVersion('peer'), '1.0.0');
    assert.equal(await project.installedVersion('other-peer'), undefined);
    assert.match(result.stderr, /Unable to find a version of other-peer/);
    assert.ok(!result.stdout.includes('All peer dependencies are met'), result.output);
    const check = await project.run();
    assert.equal(check.exitCode, 1, check.output);
  });
}

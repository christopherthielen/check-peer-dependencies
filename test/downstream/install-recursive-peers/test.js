const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

for (const manager of ['npm', 'yarn']) {
  test(`${manager}: install peers discovered after the first installation`, async (t) => {
    const project = await createProject(t, __dirname);
    const result = await project.run(['--install', `--${manager}`]);
    assert.equal(result.exitCode, 0, result.output);
    assert.match(result.stdout, /Found 1 new unmet peerDependencies/);
    assert.equal(await project.installedVersion('bridge'), '1.0.0');
    assert.equal(await project.installedVersion('peer'), '1.0.0');
    const check = await project.run();
    assert.equal(check.exitCode, 0, check.output);
  });
}

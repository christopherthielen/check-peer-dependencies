const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

for (const manager of ['npm', 'yarn']) {
  test(`${manager}: replace an incompatible installed version`, async (t) => {
    const project = await createProject(t, __dirname);
    // Start with the manager's own lockfile; Yarn requires one for upgrades.
    const setup = await project.packageManager(manager, ['install']);
    assert.equal(setup.exitCode, 0, setup.output);
    assert.equal(await project.installedVersion('peer'), '2.0.0');
    const result = await project.run(['--install', `--${manager}`]);
    assert.equal(result.exitCode, 0, result.output);
    assert.equal(await project.installedVersion('peer'), '1.2.0');
    const check = await project.run();
    assert.equal(check.exitCode, 0, check.output);
  });
}

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

for (const manager of ['npm', 'yarn']) {
  test(`${manager}: install multiple dev peers as separate packages`, async (t) => {
    const project = await createProject(t, __dirname);
    const result = await project.run(['--install', `--${manager}`]);
    assert.equal(result.exitCode, 0, result.output);
    assert.equal(await project.installedVersion('peer'), '1.2.0');
    assert.equal(await project.installedVersion('other-peer'), '1.0.0');
    const manifest = await project.readPackageJson();
    for (const name of ['peer', 'other-peer']) {
      assert.ok(manifest.devDependencies[name]);
      assert.equal(manifest.dependencies?.[name], undefined);
    }
    const check = await project.run();
    assert.equal(check.exitCode, 0, check.output);
  });
}

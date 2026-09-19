const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

for (const manager of ['npm', 'yarn']) {
  test(`${manager}: install a missing production peer`, async (t) => {
    const project = await createProject(t, __dirname);
    const result = await project.run(['--install', `--${manager}`]);
    assert.equal(result.exitCode, 0, result.output);
    assert.equal(await project.installedVersion('peer'), '1.2.0');
    const manifest = await project.readPackageJson();
    assert.ok(manifest.dependencies.peer);
    assert.equal(manifest.devDependencies?.peer, undefined);
    const check = await project.run();
    assert.equal(check.exitCode, 0, check.output);
  });
}

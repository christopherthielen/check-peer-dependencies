const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

for (const manager of ['npm', 'yarn']) {
  test(`${manager}: keep production and dev peers in their respective groups`, async (t) => {
    const project = await createProject(t, __dirname);
    const result = await project.run(['--install', `--${manager}`]);
    assert.equal(result.exitCode, 0, result.output);
    const manifest = await project.readPackageJson();
    assert.ok(manifest.dependencies.peer);
    assert.ok(manifest.devDependencies['other-peer']);
    assert.equal(manifest.devDependencies.peer, undefined);
    assert.equal(manifest.dependencies['other-peer'], undefined);
    const check = await project.run();
    assert.equal(check.exitCode, 0, check.output);
  });
}

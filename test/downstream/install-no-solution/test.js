const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

for (const manager of ['npm', 'yarn']) {
  test(`${manager}: fail when no published version can satisfy the peer`, async (t) => {
    const project = await createProject(t, __dirname);
    const result = await project.run(['--install', `--${manager}`]);
    assert.equal(result.exitCode, 1, result.output);
    assert.match(result.stderr, /Unable to find a version of peer/);
    assert.equal(await project.installedVersion('peer'), undefined);
    assert.ok(!result.stdout.includes('All peer dependencies are met'), result.output);
  });
}

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

const { pathToFileURL } = require('node:url');
test('the installed CLI works in an empty project and exposes help', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run();
  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.stdout, /All peer dependencies are met/);
  const help = await project.run(['--help']);
  assert.equal(help.exitCode, 0, help.output);
  assert.match(help.stdout, /--findSolutions/);
});
test('downstream code can call the public CommonJS and ESM API', async (t) => {
  const project = await createProject(t, __dirname);
  const options = JSON.stringify({ ignore: [], orderBy: 'dependee' });
  const call = `checkPeerDependencies('npm', ${options});`;
  const cjs = await project.exec(process.execPath, [
    '-e',
    `const { checkPeerDependencies } = require(${JSON.stringify(project.toolDirectory)}); ${call}`,
  ]);
  assert.equal(cjs.exitCode, 0, cjs.output);
  assert.match(cjs.stdout, /All peer dependencies are met/);
  const entry = pathToFileURL(require.resolve(project.toolDirectory)).href;
  const esm = await project.exec(process.execPath, [
    '--input-type=module',
    '-e',
    `import { checkPeerDependencies } from ${JSON.stringify(entry)}; ${call}`,
  ]);
  assert.equal(esm.exitCode, 0, esm.output);
  assert.match(esm.stdout, /All peer dependencies are met/);
});

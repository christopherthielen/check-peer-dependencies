const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { command, npm } = require('./command');
const { startRegistry } = require('./registry');

const repo = path.resolve(__dirname, '../..');
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

async function createProject(t, fixture) {
  assert.ok(process.env.PEER_TEST_ROOT, 'Run this suite through npm run test:downstream.');
  const directory = await fs.mkdtemp(path.join(process.env.PEER_TEST_ROOT, `${path.basename(fixture)}-`));
  const project = path.join(directory, 'project');
  await fs.mkdir(project);
  for (const name of await fs.readdir(fixture)) {
    if (['test.js', 'packages', 'registry', 'README.md'].includes(name)) continue;
    await fs.cp(path.join(fixture, name), path.join(project, name), { recursive: true });
  }
  const installed = path.join(fixture, 'packages');
  try {
    await fs.cp(installed, path.join(project, 'node_modules'), { recursive: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const registry = await startRegistry(fixture, directory);
  t.after(() => registry.close());
  await fs.appendFile(
    path.join(project, '.npmrc'),
    `\nregistry=${registry.url}\naudit=false\nfund=false\nupdate-notifier=false\n`
  );
  await fs.appendFile(path.join(project, '.yarnrc'), `\nregistry "${registry.url}"\nignore-scripts false\n`);
  await fs.writeFile(path.join(directory, 'user.npmrc'), '');
  await fs.writeFile(path.join(directory, 'global.npmrc'), '');
  const env = { ...process.env };
  // Ignore the contributor's registry settings while keeping the fixture's .npmrc options.
  for (const key of Object.keys(env)) {
    if (/^npm_config_/i.test(key) || key.toUpperCase() === 'PATH') delete env[key];
  }
  const inheritedPath = process.env.PATH || process.env.Path;
  Object.assign(env, {
    PATH: [path.join(repo, 'node_modules/.bin'), inheritedPath].join(path.delimiter),
    npm_config_registry: registry.url,
    npm_config_userconfig: path.join(directory, 'user.npmrc'),
    npm_config_globalconfig: path.join(directory, 'global.npmrc'),
    npm_config_cache: path.join(directory, 'npm-cache'),
    YARN_CACHE_FOLDER: path.join(directory, 'yarn-cache'),
    YARN_IGNORE_PATH: '1',
    NO_COLOR: '1',
    CI: '1',
  });
  delete env.FORCE_COLOR;
  const options = { cwd: project, env, logFile: path.join(directory, 'commands.log') };
  const toolDirectory = process.env.PEER_TEST_TOOL;
  const tool = await readJson(path.join(toolDirectory, 'package.json'));
  return {
    directory: project,
    toolDirectory,
    run: (args = []) =>
      command(process.execPath, [path.join(toolDirectory, tool.bin['check-peer-dependencies']), ...args], options),
    exec: (executable, args) => command(executable, args, options),
    packageManager: (manager, args) => {
      assert.ok(['npm', 'yarn'].includes(manager), `Unknown package manager: ${manager}`);
      return manager === 'npm'
        ? npm(args, options)
        : command(process.execPath, [require.resolve('yarn/bin/yarn.js'), ...args], options);
    },
    readPackageJson: () => readJson(path.join(project, 'package.json')),
    async installedVersion(name) {
      try {
        return (await readJson(path.join(project, 'node_modules', name, 'package.json'))).version;
      } catch (error) {
        if (error.code === 'ENOENT') return undefined;
        throw error;
      }
    },
  };
}

module.exports = { createProject };

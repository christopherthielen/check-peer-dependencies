const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { findPossibleResolutions } = require('../dist/solution');
const { getInstallCommands, getCommandLines, formatCommand, runInstallCommand } = require('../dist/packageManager');

const { getPackageManagerProcess } = require('../dist/packageManagerProcess');
const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
// Unit tests below cover the POSIX invocation; Windows routing is tested separately.
Object.defineProperty(process, 'platform', { value: 'linux' });
let passed = 0;
function test(name, fn) {
  fn();
  console.log(`ok ${++passed} - ${name}`);
}
function withMocks(mocks, fn) {
  const originals = {};
  for (const key of Object.keys(mocks)) {
    originals[key] = childProcess[key];
    childProcess[key] = mocks[key];
  }
  const error = console.error;
  console.error = () => {};
  try {
    fn();
  } finally {
    Object.assign(childProcess, originals);
    console.error = error;
  }
}
function resolve(name, version = '^1.0.0') {
  const dep = { name, version };
  return findPossibleResolutions([dep], [dep])[0].resolution;
}
const resolution = (value, type = 'install') => ({ resolution: value, resolutionType: type });

test('registry lookup uses separate arguments and JSON, choosing the highest satisfying version', () => {
  const calls = [];
  withMocks(
    {
      execFileSync: (executable, args, options) => {
        calls.push({ executable, args, options });
        return '["1.0.0", "2.0.0", "1.9.0"]';
      },
    },
    () => assert.strictEqual(resolve('@scope/peer'), '@scope/peer@1.9.0')
  );
  assert.deepStrictEqual(calls, [
    {
      executable: 'npm',
      args: ['view', '@scope/peer', 'versions', '--json'],
      options: { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    },
  ]);
});

test('single-version JSON responses work', () => {
  withMocks({ execFileSync: () => '"1.2.3"' }, () => assert.strictEqual(resolve('peer'), 'peer@1.2.3'));
});

test('scoped names with archive suffixes remain valid registry names', () => {
  const names = ['@scope/peer.tgz', '@scope/peer.tar.gz', '@scope/peer.tar'];
  const calls = [];
  withMocks(
    {
      execFileSync: (_executable, args) => {
        calls.push(args);
        return '["1.0.0"]';
      },
    },
    () => {
      for (const name of names) assert.strictEqual(resolve(name), `${name}@1.0.0`);
    }
  );
  assert.deepStrictEqual(
    calls,
    names.map((name) => ['view', name, 'versions', '--json'])
  );
});

test('malicious names, options, paths and URLs never reach npm', () => {
  const calls = [];
  withMocks(
    {
      execFileSync: (...args) => {
        calls.push(args);
        return '[]';
      },
    },
    () => {
      for (const name of [
        'peer;touch marker',
        'peer$(touch marker)',
        'peer`touch marker`',
        'peer\nwhoami',
        'peer\n',
        '--registry=https://example.invalid',
        '-x',
        '../peer',
        'file:peer',
        'https://example.invalid',
        'peer@1.0.0',
        'peer.tgz',
        'peer.tar.gz',
        'peer.TGZ',
        'peer.tar',
      ]) {
        assert.strictEqual(resolve(name), null);
      }
    }
  );
  assert.deepStrictEqual(calls, [], 'invalid names must not trigger registry lookups');
});

test('malicious version ranges cannot become commands or install targets', () => {
  const calls = [];
  const ranges = ['*;touch marker', '$(touch marker)', '`touch marker`', '--prefix=/tmp'];
  withMocks(
    {
      execFileSync: (executable, args, options) => {
        calls.push({ executable, args, options });
        return '["1.0.0"]';
      },
    },
    () => {
      for (const range of ranges) {
        assert.strictEqual(resolve('peer', range), null);
      }
    }
  );
  assert.deepStrictEqual(
    calls,
    ranges.map(() => ({
      executable: 'npm',
      args: ['view', 'peer', 'versions', '--json'],
      options: { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    }))
  );
});

test('malformed JSON, invalid versions and registry failures yield no solution', () => {
  for (const output of ['not json', '{}', 'null', '["1.0.0;touch marker"]', '[1]', '[]']) {
    withMocks({ execFileSync: () => output }, () => assert.strictEqual(resolve('peer'), null));
  }
  withMocks(
    {
      execFileSync: () => {
        throw new Error('npm failed');
      },
    },
    () => assert.strictEqual(resolve('peer'), null)
  );
});

test('npm and yarn preserve install groups and separate multiple dev dependencies', () => {
  const resolutions = [
    resolution('a@1'),
    resolution('b@2', 'upgrade'),
    resolution('c@3', 'devInstall'),
    resolution('d@4', 'devInstall'),
    resolution(null),
  ];
  assert.deepStrictEqual(getInstallCommands('npm', resolutions), [
    { executable: 'npm', args: ['install', '--', 'a@1', 'b@2'] },
    { executable: 'npm', args: ['install', '-D', '--', 'c@3', 'd@4'] },
  ]);
  assert.deepStrictEqual(getInstallCommands('yarn', resolutions), [
    { executable: 'yarn', args: ['add', '--', 'a@1'] },
    { executable: 'yarn', args: ['add', '-D', '--', 'c@3', 'd@4'] },
    { executable: 'yarn', args: ['upgrade', '--', 'b@2'] },
  ]);
  assert.deepStrictEqual(getInstallCommands('sh', resolutions), []);
  assert.deepStrictEqual(getInstallCommands('npm', []), []);
});

test('installation passes literal arguments without executing rendered strings', () => {
  const payload = "peer@1; echo 'owned' $(touch marker) `touch marker`\nnext";
  for (const manager of ['npm', 'yarn']) {
    const command = getInstallCommands(manager, [resolution(payload), resolution('--prefix=/tmp')])[0];
    withMocks(
      {
        spawnSync: (executable, args, options) => {
          assert.strictEqual(executable, manager);
          assert.deepStrictEqual(args, [manager === 'npm' ? 'install' : 'add', '--', payload, '--prefix=/tmp']);
          assert.deepStrictEqual(options, { stdio: 'inherit' });
          return { status: 0 };
        },
      },
      () => runInstallCommand(command)
    );
    assert.deepStrictEqual(getCommandLines(manager, [resolution(payload), resolution('--prefix=/tmp')]), [
      formatCommand(command),
    ]);
  }
});

test('start errors, nonzero exits and signals stop installation', () => {
  const command = { executable: 'npm', args: ['install', '--', 'peer@1'] };
  for (const [result, message] of [
    [{ error: new Error('ENOENT'), status: null }, /Unable to start npm: ENOENT/],
    [{ status: 7 }, /npm failed \(exit 7\)/],
    [{ status: null, signal: 'SIGTERM' }, /npm failed \(signal SIGTERM\)/],
  ]) {
    withMocks({ spawnSync: () => result }, () => assert.throws(() => runInstallCommand(command), message));
  }
});

Object.defineProperty(process, 'platform', platformDescriptor);

test('Windows npm, Yarn and Corepack launch JS entry points directly through Node', () => {
  const existsSync = fs.existsSync;
  const originalPath = process.env.PATH;
  const dir = path.resolve(os.tmpdir(), 'package manager with spaces');
  try {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    process.env.PATH = dir;
    for (const [manager, relativeScript] of [
      ['npm', 'node_modules/npm/bin/npm-cli.js'],
      ['npm', 'node_modules/corepack/dist/npm.js'],
      ['yarn', 'node_modules/yarn/bin/yarn.js'],
      ['yarn', 'node_modules/corepack/dist/yarn.js'],
      ['yarn', 'yarn.js'],
    ]) {
      const script = path.resolve(dir, relativeScript);
      fs.existsSync = (file) => file === path.join(dir, `${manager}.cmd`) || file === script;
      const args = ['install', '--', 'peer@1;echo "quoted"'];
      assert.deepStrictEqual(getPackageManagerProcess(manager, args), {
        executable: process.execPath,
        args: [script, ...args],
      });
      withMocks(
        {
          spawnSync: (executable, actualArgs, options) => {
            assert.strictEqual(executable, process.execPath);
            assert.deepStrictEqual(actualArgs, [script, ...args]);
            assert.deepStrictEqual(options, { stdio: 'inherit' });
            return { status: 0 };
          },
        },
        () => runInstallCommand({ executable: manager, args })
      );
      if (manager === 'npm') {
        withMocks(
          {
            execFileSync: (executable, actualArgs, options) => {
              assert.strictEqual(executable, process.execPath);
              assert.deepStrictEqual(actualArgs, [script, 'view', 'peer', 'versions', '--json']);
              assert.ok(!options.shell);
              return '["1.0.0"]';
            },
          },
          () => assert.strictEqual(resolve('peer'), 'peer@1.0.0')
        );
      }
    }
    fs.existsSync = () => false;
    assert.throws(() => getPackageManagerProcess('npm', []), /Cannot locate a shell-free/);
    fs.existsSync = (file) => file.endsWith('npm.cmd');
    assert.throws(() => getPackageManagerProcess('npm', []), /Cannot locate a shell-free/);
  } finally {
    fs.existsSync = existsSync;
    process.env.PATH = originalPath;
    Object.defineProperty(process, 'platform', platformDescriptor);
  }
});

if (process.platform !== 'win32') {
  test('real child processes and copied POSIX commands preserve hostile arguments without side effects', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-security-'));
    const originalPath = process.env.PATH;
    try {
      const marker = path.join(dir, 'marker');
      const log = path.join(dir, 'args.json');
      const payload = `peer@1; touch ${marker}; echo 'quote' $(touch ${marker}) \`touch ${marker}\`\nend`;
      fs.writeFileSync(
        path.join(dir, 'npm'),
        `#!${process.execPath}\nrequire('fs').writeFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)));\n`,
        { mode: 0o755 }
      );
      process.env.PATH = dir + path.delimiter + originalPath;
      const command = getInstallCommands('npm', [resolution(payload)])[0];
      runInstallCommand(command);
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(log, 'utf8')), command.args);
      childProcess.execFileSync('/bin/sh', ['-c', formatCommand(command)]);
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(log, 'utf8')), command.args);
      assert.strictEqual(fs.existsSync(marker), false);
    } finally {
      process.env.PATH = originalPath;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('CLI handles dependency metadata safely and installs a valid peer end to end', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-cli-'));
    try {
      const bin = path.join(dir, 'bin');
      const provider = path.join(dir, 'node_modules', 'provider');
      const log = path.join(dir, 'calls.jsonl');
      const marker = path.join(dir, 'marker');
      fs.mkdirSync(bin);
      fs.mkdirSync(provider, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: 'fixture', version: '1.0.0', dependencies: { provider: '1.0.0' } })
      );
      fs.writeFileSync(path.join(provider, 'index.js'), '');
      fs.writeFileSync(
        path.join(bin, 'npm'),
        `#!${process.execPath}
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + '\\n');
if (args[0] === 'view') console.log('["1.0.0"]');
else {
  fs.mkdirSync('node_modules/safe-peer', { recursive: true });
  fs.writeFileSync('node_modules/safe-peer/package.json', JSON.stringify({ name: 'safe-peer', version: '1.0.0', main: 'index.js' }));
  fs.writeFileSync('node_modules/safe-peer/index.js', '');
}
`,
        { mode: 0o755 }
      );
      const run = (peers, flag) => {
        fs.writeFileSync(
          path.join(provider, 'package.json'),
          JSON.stringify({ name: 'provider', version: '1.0.0', main: 'index.js', peerDependencies: peers })
        );
        return childProcess.spawnSync(process.execPath, [path.resolve(__dirname, '../dist/cli.js'), '--npm', flag], {
          cwd: dir,
          env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH },
          encoding: 'utf8',
        });
      };
      for (const flag of ['--findSolutions', '--install']) {
        const result = run({ [`peer;touch ${marker}`]: '*' }, flag);
        assert.strictEqual(result.status, 1, result.stderr);
        assert.strictEqual(fs.existsSync(log), false);
        assert.strictEqual(fs.existsSync(marker), false);
      }
      const rangeResult = run({ 'safe-peer': `*;touch ${marker}` }, '--install');
      assert.strictEqual(rangeResult.status, 1, rangeResult.stderr);
      assert.strictEqual(fs.existsSync(marker), false);
      const display = run({ 'safe-peer': '^1.0.0' }, '--findSolutions');
      assert.strictEqual(display.status, 1, display.stderr);
      assert.match(display.stdout, /npm install -- safe-peer@1.0.0/);
      const installed = run({ 'safe-peer': '^1.0.0' }, '--install');
      assert.strictEqual(installed.status, 0, installed.stderr);
      assert.match(installed.stdout, /All peer dependencies are met/);
      const calls = fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
      assert.deepStrictEqual(calls, [
        ['view', 'safe-peer', 'versions', '--json'],
        ['view', 'safe-peer', 'versions', '--json'],
        ['view', 'safe-peer', 'versions', '--json'],
        ['install', '--', 'safe-peer@1.0.0'],
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
console.log(`${passed} security regression tests passed`);

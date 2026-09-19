# Testing check-peer-dependencies

The downstream tests are little projects that use this package. Open a fixture folder,
read its `package.json`, and then read the `test.js` next to it. Those two files should
tell you what the project needs and what we expect the checker to do.

We also keep the focused security regressions in `security.js`. Those tests exercise
hostile inputs and process-launching details that are harder to see from a downstream
project alone.

## Running the tests

From the repository root, after `npm ci`:

```sh
npm test
```

That builds the package and runs both suites. To work on downstream behavior only:

```sh
npm run test:downstream
npm run test:downstream -- missing-peer
npm run test:downstream -- install-
```

The optional argument matches fixture folder names, so `install-` runs all installation
scenarios. You don't have to edit a list of tests anywhere. Adding a folder with a
`test.js` is enough for the runner to find it.

For just the security suite, run `npm run build` and then `npm run test:security`.
All test tooling uses the development Node version listed in the root `package.json`.
CI also checks the published package separately on older Node versions.

## What's in a fixture?

Here's [missing-peer](downstream/missing-peer):

```text
missing-peer/
  package.json
  test.js
  packages/
    plugin/
      package.json
```

The root manifest is an ordinary downstream `package.json`. It lists `plugin` as a
dependency. The plugin's manifest declares a peer that isn't installed.

`packages/` describes what's already installed. We copy its contents into the temporary
project's `node_modules`, using the same directory layout. For a scoped package, use
`packages/@scope/name/`. For an alias, the directory can have a different name from the
package's manifest. Include JavaScript or other package files when the scenario needs
them; a manifest is enough for many checks.

We deliberately don't run `npm install` to set up every fixture. npm might install
the missing peers for us, which would erase the very situation we're trying to test.

The expectations are a normal Node test module:

```js
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProject } = require('../../helpers/project');

test('reports a missing peer', async (t) => {
  const project = await createProject(t, __dirname);
  const result = await project.run();

  assert.equal(result.exitCode, 1, result.output);
  assert.match(result.stdout, /peer is not installed/);
});
```

`createProject` gives each test a fresh copy. Changes made by a test never touch the
checked-in fixture, and two tests in the same folder don't share a project. A folder
can contain several closely related tests, but a different starting manifest usually
deserves its own folder.

The runner builds and packs the tool, then installs that tarball into a clean consumer
once per suite run. `project.run()` executes the installed package's CLI entry point
with the fixture as its working directory. It doesn't import our source or mock the
checker. The separate compatibility jobs also exercise the installed executable shim.
Preparing the consumer can download runtime dependencies from npm; fixture registry
requests and fixture installations use the local registry described below.

## Installation tests use a local registry

Look at [install-dev-peers](downstream/install-dev-peers) for an example:

```text
install-dev-peers/
  package.json
  test.js
  packages/
    plugin/
      package.json
  registry/
    peer/
      1.0.0/package.json
      1.2.0/package.json
      2.0.0/package.json
    other-peer/
      1.0.0/package.json
```

`registry/` describes available packages that aren't initially installed, including
alternate versions. The package's own `name` and `version` are authoritative; the
directories just make the files easy to find. Scoped names use the same layout, such
as `registry/@scope/name/1.0.0/package.json`.

Packages under `packages/` are also available from the registry at their declared
versions. That matters because npm or Yarn may fetch an existing dependency again
while updating the project. You don't need to repeat that manifest in `registry/`;
duplicate name/version pairs are rejected so there isn't an ambiguous source.

Each test gets a server bound to localhost. It serves npm-style metadata and real
tarballs created with `npm pack --ignore-scripts`. Archives are made only when queried,
so ordinary reporting tests don't pay the packaging cost. Both `npm view` and the real
package-manager install use this server. An unknown package gets a local 404; the
registry never falls back to npmjs.org. Keep fixture dependencies pointed at fixture
package names, rather than external URLs or Git repositories.

We run the main installation scenarios with both npm and Yarn Classic. Yarn is pinned
as a development dependency, so you don't need a separate global installation. The
project itself still uses npm and `package-lock.json` for development.

After an installation, check what happened on disk:

```js
const result = await project.run(['--install', '--npm']);
assert.equal(result.exitCode, 0, result.output);
assert.equal(await project.installedVersion('peer'), '1.2.0');

const manifest = await project.readPackageJson();
assert.ok(manifest.devDependencies.peer);
assert.equal(manifest.dependencies?.peer, undefined);

const check = await project.run();
assert.equal(check.exitCode, 0, check.output);
```

An exit code alone doesn't tell us whether a dev peer was saved as a production
dependency. Checking the manifest and then running the checker again catches those
mistakes without depending on npm's progress messages or exact lockfile formatting.

Some scenarios need a real starting lockfile. Call
`project.packageManager('yarn', ['install'])` explicitly in the test and assert that
it succeeds. The [upgrade test](downstream/install-upgrade/test.js) does this. Keeping
that step visible helps explain the state we're testing.

Fixture `.npmrc` options are respected. A few cases set `legacy-peer-deps=true` so npm
doesn't solve the peer tree automatically: we want to test the checker's recursive or
partial installation behavior. Most cases use npm's normal peer-resolution behavior.

Lifecycle scripts run during fixture installations. For a failure case, include a
small script like the one in [install-lifecycle-failure](downstream/install-lifecycle-failure).
Avoid scripts with side effects outside the temporary project.

## Adding your own case

Copy the closest fixture, update its manifests, and write expectations in `test.js`.
Usually that's all you need. Use `npm run test:downstream -- your-folder` while working,
then `npm test` before opening a PR. `npm run format` formats the test code too.

Prefer assertions about behavior: exit status, a useful diagnostic, the chosen version,
or which dependency group changed. Pass `result.output` as the assertion message when
checking a process result, so a failure includes its command and captured output.
Avoid snapshots of entire stack traces, timings, or package-manager output.

For unusual filesystem arrangements, write the setup plainly in the test.
[linked-package](downstream/linked-package/test.js) creates a link explicitly, and
[manifest-errors](downstream/manifest-errors/test.js) writes malformed JSON at runtime.
That keeps checked-in manifests valid and avoids growing a special fixture language.

The small helper API is:

| Member                                  | What it gives you                                                  |
| --------------------------------------- | ------------------------------------------------------------------ |
| `project.run(args)`                     | Run the installed checker; arguments default to `[]`.              |
| `project.packageManager(manager, args)` | Run real npm or the pinned Yarn in this project.                   |
| `project.readPackageJson()`             | Read the current root manifest.                                    |
| `project.installedVersion(name)`        | Read an installed package's version, or `undefined` if absent.     |
| `project.directory`                     | The temporary project path, for explicit filesystem setup.         |
| `project.exec(executable, args)`        | Run another process with the project's isolated registry settings. |
| `project.toolDirectory`                 | The installed checker package, for public API tests.               |

Process results have `exitCode`, `stdout`, `stderr`, and `output`. Commands have timeouts
so a broken scenario can't hang the suite indefinitely.

## Inspecting a failure

The runner prints its temporary directory when it starts. A failed run keeps that
directory and prints its location again. To keep a successful run too:

```sh
npm run test:downstream -- install-dev-peers --keep
```

Inside you'll find the packed consumer, each test's project, command logs, and registry
requests. Open the project's `package.json` and `node_modules` to see what actually
changed. CI uploads failed runs as `downstream-failures-<OS>` artifacts too.
The fixture registry closes when the test finishes, so rerun the test rather
than trying to reuse the saved localhost registry URL for another install.

Successful runs clean up after themselves unless you pass `--keep`. Failed directories
are yours to inspect and remove when you're done. None of the tests or fixture scripts
are included in the published npm package.

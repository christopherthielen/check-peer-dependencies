# check-peer-dependencies-optional-dependency

## This is a hack to make check-peer-dependency output visible as a postinstall script when using yarn.

### Motivation

I wanted to create a meta-package that provides a set of peerDependencies to downstream projects.
I wanted to run `check-peer-dependencies` as a `postinstall` script to inform users which dependencies are not met and offer a solution.

### Problem

By default, `yarn` package manager hides output from postinstall scripts.
I noticed, however, that output from `optionalDependencies` is visible.

### Using

To run `check-peer-dependencies` as when your package is installed, add `check-peer-dependencies-optional-dependency` as an optional dependency.
This package has a `postinstall` script which invokes `check-peer-dependencies`.

```
{
  "name": "my-installable-package",
  ...
  "dependencies": {
    ...
    "check-peer-dependencies": "latest"
  },
  "peerDependencies": {
    "this-package-should-be-installed-downstream": "10.0.0"
  },
  "optionalDependencies: {
    "check-peer-dependencies-optional-dependency": "latest"
  }
}
```


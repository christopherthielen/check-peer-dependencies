## check-peer-dependencies

**Checks peer dependencies of the current NodeJS package.  Offers solutions for any that are unmet.**

This utility will recursively find all `peerDependencies` in your project's `dependencies` list.
It checks if you have installed a package that meets the required peer dependency versions.
If any peer dependencies are *unmet*, it will search for a compatible version to install.

Note: you must run `npm install` or `yarn` first in order to install all normal dependencies.

usage:

```bash
npx check-peer-dependencies [--yarn|--npm] [--install] [--help]
```


Options:
```
  --help, -h  Print usage information                                  [boolean]
  --version   Show version number                                      [boolean]
  --yarn      Use yarn package manager                                 [boolean]
  --npm       Use npm package manager                                  [boolean]
  --install   Install missing or incorrect peerDependencies            [boolean]
```

---

## Example outputs:

### No problems 

```bash
~/projects/uirouter/sample-app-react master
❯ npx check-peer-dependencies
✅  @uirouter/visualizer@6.0.2 requires @uirouter/core >=5.0.0 (5.0.23 is installed)
✅  ajv-keywords@3.4.1 requires ajv ^6.9.1 (6.10.2 is installed)
✅  @uirouter/react@0.8.9 requires react ^16.3.0 (16.10.1 is installed)
✅  react-dom@16.10.1 requires react ^16.0.0 (16.10.1 is installed)
✅  file-loader@1.1.11 requires webpack ^2.0.0 || ^3.0.0 || ^4.0.0 (4.39.1 is installed)
No problems found!
```

### Missing peer dependency, solution found

```bash
~/projects/uirouter/angular-hybrid master ⇣
❯ npx check-peer-dependencies
✅  @uirouter/angular@5.0.0 requires @angular/common ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (5.2.11 is installed)
✅  @uirouter/angular-hybrid@9.0.0 requires @angular/core ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (5.2.11 is installed)
❌  @uirouter/angular@5.0.0 requires @angular/router ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (@angular/router is not installed)
✅  @uirouter/angular-hybrid@9.0.0 requires @angular/upgrade ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (5.2.11 is installed)
✅  @uirouter/rx@0.6.0 requires @uirouter/core >=6.0.1 (6.0.1 is installed)
✅  @uirouter/angular-hybrid@9.0.0 requires angular ^1.5.0 (1.7.8 is installed)
✅  @uirouter/angularjs@1.0.23 requires angular >=1.2.0 (1.7.8 is installed)
✅  @uirouter/rx@0.6.0 requires rxjs ^6.0.0 (6.5.3 is installed)

Searching for solutions:
yarn add @angular/router@8.2.10
```

### Incorrect peer dependencies, some solutions found

```bash
❯ npx check-peer-dependencies
✅  @angular/forms@9.0.0-next.9 requires @angular/common 9.0.0-next.9 (9.0.0-next.9 is installed)
❌  @uirouter/angular@5.0.0 requires @angular/common ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (9.0.0-next.9 is installed)
✅  @angular/platform-browser-dynamic@9.0.0-next.9 requires @angular/compiler 9.0.0-next.9 (9.0.0-next.9 is installed)
✅  @angular/common@9.0.0-next.9 requires @angular/core 9.0.0-next.9 (9.0.0-next.9 is installed)
❌  @uirouter/angular@5.0.0 requires @angular/core ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (9.0.0-next.9 is installed)
✅  @angular/forms@9.0.0-next.9 requires @angular/platform-browser 9.0.0-next.9 (9.0.0-next.9 is installed)
❌  @uirouter/angular@5.0.0 requires @angular/router ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (9.0.0-next.9 is installed)
✅  @uirouter/rx@0.6.0 requires @uirouter/core >=6.0.1 (6.0.1 is installed)
✅  @uirouter/visualizer@6.0.2 requires @uirouter/core >=5.0.0 (6.0.1 is installed)
✅  ajv-keywords@3.1.0 requires ajv ^6.0.0 (6.10.2 is installed)
✅  @angular/common@9.0.0-next.9 requires rxjs ^6.5.3 (6.5.3 is installed)
✅  @uirouter/rx@0.6.0 requires rxjs ^6.0.0 (6.5.3 is installed)
✅  ts-helpers@1.1.2 requires typescript >=1.8.0  <2.1.0 || >=1.9.0-dev || >=2.0.0-dev || || >=2.1.0-dev (3.5.3 is installed)
✅  file-loader@1.1.11 requires webpack ^2.0.0 || ^3.0.0 || ^4.0.0 (4.41.0 is installed)
✅  @angular/core@9.0.0-next.9 requires zone.js ~0.10.2 (0.10.2 is installed)

Searching for solutions:
❌  Unable to find a version of @angular/common that satisfies the following peerDependencies: 9.0.0-next.9 and ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0
❌  Unable to find a version of @angular/core that satisfies the following peerDependencies: 9.0.0-next.9 and ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0

yarn upgrade @angular/router@8.2.10
```


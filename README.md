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

## Installing peerDependencies as devDependencies

If a package has a peerDependency that should be installed as a devDependency by,
it can list the package name in "peerDevDependencies".  
This is not a standard and is only understood by this `check-peer-dependencies`.

```json
{
  "name": "somepackage",
  "peerDependencies": {
    "react": "16.x",
    "react-dom": "16.x",
    "typescript": "~3.8.0",
    "eslint": "*"
  },
  "peerDevDependencies": ["typescript", "eslint"]
}
```

## Example outputs:

### No problems 

```bash
~/projects/uirouter/sample-app-react master
❯ npx check-peer-dependencies
✅  All peer dependencies are met
```

### Missing peer dependency, solution found

```bash
~/projects/uirouter/angular-hybrid master ⇣
❯ npx check-peer-dependencies
❌  @uirouter/angular@5.0.0 requires @angular/router ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (@angular/router is not installed)

Searching for solutions:
yarn add @angular/router@8.2.10
```

### Incorrect peer dependencies, some solutions found

```bash
❯ npx check-peer-dependencies
❌  @uirouter/angular@5.0.0 requires @angular/common ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (9.0.0-next.9 is installed)
❌  @uirouter/angular@5.0.0 requires @angular/core ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (9.0.0-next.9 is installed)
❌  @uirouter/angular@5.0.0 requires @angular/router ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0 (9.0.0-next.9 is installed)

Searching for solutions:
❌  Unable to find a version of @angular/common that satisfies the following peerDependencies: 9.0.0-next.9 and ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0
❌  Unable to find a version of @angular/core that satisfies the following peerDependencies: 9.0.0-next.9 and ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0

yarn upgrade @angular/router@8.2.10
```


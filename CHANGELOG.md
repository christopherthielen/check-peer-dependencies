# 4.0.0 (2020-12-27)
[Compare `check-peer-dependencies` versions 3.1.0 and 4.0.0](https://github.com/christopherthielen/check-peer-dependencies/compare/3.1.0...4.0.0)

### Features

* **prerelease:** include prerelease when  matching ranges, i.e. the range ">=6.0.0" matches "7.0.0-beta.1" ([0493379](https://github.com/christopherthielen/check-peer-dependencies/commit/0493379))


### BREAKING CHANGES

* **prerelease:** Matches prerelease versions




# 3.1.0 (2020-12-23)
[Compare `check-peer-dependencies` versions 3.0.0 and 3.1.0](https://github.com/christopherthielen/check-peer-dependencies/compare/3.0.0...3.1.0)

### Features

* **peerDependencyMeta:** support peerDependencyMeta in package.json to ignore optional peer dependencies ([4e3b757](https://github.com/christopherthielen/check-peer-dependencies/commit/4e3b757))
  * See: https://github.com/yarnpkg/rfcs/blob/master/accepted/0000-optional-peer-dependencies.md



# 3.0.0 (2020-12-22)
[Compare `check-peer-dependencies` versions 2.0.6 and 3.0.0](https://github.com/christopherthielen/check-peer-dependencies/compare/2.0.6...3.0.0)

### Features

* **findSolutions:** Add a toggle to find solutions and print installation commands. ([c34735a](https://github.com/christopherthielen/check-peer-dependencies/commit/c34735a))
* **orderBy:** Change default orderBy to 'dependee' ([e77e069](https://github.com/christopherthielen/check-peer-dependencies/commit/e77e069))
* **report:** For a given unmet peer dependency, show every related peer dependency, even if currently met ([516a259](https://github.com/christopherthielen/check-peer-dependencies/commit/516a259))


### BREAKING CHANGES

* **orderBy:** default order changed from 'depender' to 'dependee'
* **findSolutions:** no longer prints installation commands by default, instead prints a message about using --install




## 2.0.6 (2020-09-20)
[Compare `check-peer-dependencies` versions 2.0.5 and 2.0.6](https://github.com/christopherthielen/check-peer-dependencies/compare/2.0.5...2.0.6)

### Bug Fixes

* Ignore missing optionalDependencies ([25a89a7](https://github.com/christopherthielen/check-peer-dependencies/commit/25a89a7))




## 2.0.5 (2020-09-19)
[Compare `check-peer-dependencies` versions 2.0.3 and 2.0.5](https://github.com/christopherthielen/check-peer-dependencies/compare/2.0.3...2.0.5)

### Features

* Add an option to run tool in consumer package root dependencies only.  ([#7](https://github.com/christopherthielen/check-peer-dependencies/issues/7)) ([cd8f75a](https://github.com/christopherthielen/check-peer-dependencies/commit/cd8f75a))




## 2.0.4 (2020-09-19)
[Compare `check-peer-dependencies` versions 2.0.3 and 2.0.4](https://github.com/christopherthielen/check-peer-dependencies/compare/2.0.3...2.0.4)

### Features

* Add an option to run tool in consumer package root dependencies only.  ([#7](https://github.com/christopherthielen/check-peer-dependencies/issues/7)) ([cd8f75a](https://github.com/christopherthielen/check-peer-dependencies/commit/cd8f75a))




## 2.0.3 (2020-09-06)
[Compare `check-peer-dependencies` versions 2.0.2 and 2.0.3](https://github.com/christopherthielen/check-peer-dependencies/compare/2.0.2...2.0.3)

### Bug Fixes

* print warning if dependency path is not found instead of erroring. This allows optional dependencies to be ignored. ([37c0296](https://github.com/christopherthielen/check-peer-dependencies/commit/37c0296))
  




## 2.0.2 (2020-05-25)
[Compare `check-peer-dependencies` versions 2.0.1 and 2.0.2](https://github.com/christopherthielen/check-peer-dependencies/compare/2.0.1...2.0.2)

### Bug Fixes

* **peerDevDependencies:** Make peerDevDependency includes check a bit safer ([2a1a183](https://github.com/christopherthielen/check-peer-dependencies/commit/2a1a183))
* **walkPackageDependency:** only walk dev deps for the root package ([e69c385](https://github.com/christopherthielen/check-peer-dependencies/commit/e69c385))


### Features

* **walkPackageDependencyTree:** Check devDependencies too ([9eba197](https://github.com/christopherthielen/check-peer-dependencies/commit/9eba197))




## 2.0.1 (2020-04-10)
[Compare `check-peer-dependencies` versions 2.0.0 and 2.0.1](https://github.com/christopherthielen/check-peer-dependencies/compare/2.0.0...2.0.1)

### Bug Fixes

* **peerDevDependencies:** Use an array of package names in 'peerDevDependencies' in conjunction with the standard 'peerDependencies' object to install peer deps as devDependencies. ([681a80b](https://github.com/christopherthielen/check-peer-dependencies/commit/681a80b))




# 2.0.0 (2020-04-10)
[Compare `check-peer-dependencies` versions 1.0.11 and 2.0.0](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.11...2.0.0)

### Features

* **peerDevDependencies:** Add support for 'peerDevDependencies' -- 'peerDependencies' that should be installed as 'devDependencies' ([47d40ef](https://github.com/christopherthielen/check-peer-dependencies/commit/47d40ef))




## 1.0.11 (2020-03-16)
[Compare `check-peer-dependencies` versions 1.0.10 and 1.0.11](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.10...1.0.11)

**feat**: Exit with exit code 1 if unmet peer dependencies are detected

## 1.0.10 (2020-03-03)
[Compare `check-peer-dependencies` versions 1.0.9 and 1.0.10](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.9...1.0.10)

### Features

* **verbose:** Turn off verbose logging by default ([04cde8a](https://github.com/christopherthielen/check-peer-dependencies/commit/04cde8a))




## 1.0.9 (2019-12-31)
[Compare `check-peer-dependencies` versions 1.0.8 and 1.0.9](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.8...1.0.9)

### Features

* **debug:** Added a --debug cli flag ([862232e](https://github.com/christopherthielen/check-peer-dependencies/commit/862232e))
* **orderBy:** Added a --orderBy cli flag ([9e7b8af](https://github.com/christopherthielen/check-peer-dependencies/commit/9e7b8af))




## 1.0.8 (2019-12-27)
[Compare `check-peer-dependencies` versions 1.0.7 and 1.0.8](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.7...1.0.8)

### Bug Fixes

* Revert fix for breaking change in resolve package after they reverted the breaking change itself. ([d25c43a](https://github.com/christopherthielen/check-peer-dependencies/commit/d25c43a))




## 1.0.7 (2019-11-25)
[Compare `check-peer-dependencies` versions 1.0.6 and 1.0.7](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.6...1.0.7)

### Bug Fixes

* Update packageFilter for breaking change in resolve package ([15ade47](https://github.com/christopherthielen/check-peer-dependencies/commit/15ade47))




## 1.0.6 (2019-11-25)
[Compare `check-peer-dependencies` versions 1.0.5 and 1.0.6](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.5...1.0.6)

### Features

* sort peer dependencies by depender package name first ([3d656a6](https://github.com/christopherthielen/check-peer-dependencies/commit/3d656a6))
* when recursively installing peer deps, don't re-process previously unmet peer deps ([ce9fe3e](https://github.com/christopherthielen/check-peer-dependencies/commit/ce9fe3e))




## 1.0.5 (2019-11-24)
[Compare `check-peer-dependencies` versions 1.0.4 and 1.0.5](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.4...1.0.5)

### Features

* Recursively check for new unmet peer dependencies after installing when using --install ([b632efb](https://github.com/christopherthielen/check-peer-dependencies/commit/b632efb))




## 1.0.4 (2019-10-26)
[Compare `check-peer-dependencies` versions 1.0.3 and 1.0.4](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.3...1.0.4)

### Bug Fixes

* handle recursive package dependencies when walking package deps ([87f6e99](https://github.com/christopherthielen/check-peer-dependencies/commit/87f6e99))




## 1.0.3 (2019-10-26)
[Compare `check-peer-dependencies` versions 1.0.2 and 1.0.3](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.2...1.0.3)

### Features

* **findPossibleResolutions:** Log error message if there is a problem parsing npm view output ([a46c673](https://github.com/christopherthielen/check-peer-dependencies/commit/a46c673))




## 1.0.2 (2019-10-15)
[Compare `check-peer-dependencies` versions 1.0.1 and 1.0.2](https://github.com/christopherthielen/check-peer-dependencies/compare/1.0.1...1.0.2)

### Features

* Add better support for packages installed via yalc ([15af2ac](https://github.com/christopherthielen/check-peer-dependencies/commit/15af2ac))




## 1.0.1 (2019-10-15)
1.0.1

### Features

* add whitespace to output around package manager commands ([cdd56ed](https://github.com/christopherthielen/check-peer-dependencies/commit/cdd56ed))


## 1.0.0 (2019-10-14)

Initial release

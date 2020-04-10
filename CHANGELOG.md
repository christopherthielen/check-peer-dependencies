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

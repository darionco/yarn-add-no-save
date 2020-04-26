# yarn-add-no-save

Implements the [much requested feature](https://github.com/yarnpkg/yarn/issues/1743) of installing packages without
saving them with yarn.  

This package is intended to be used when testing packages that declare `peerDependencies` with `yarn link` but it can be
used in many environments/situations.

**NOTE:** I am fully aware of the irony, but this package has actually proven useful to me more than once.

### Getting started

#### Project Install  

Add the module to your project:
```shell script
$ yarn add yarn-add-no-save --dev
```

Run from the command line:
```shell script
$ yarn add-no-save rollup es-lint@0.6.1
```

Run from a script in your `package.json`:
```json
{
  ...
  "scripts": {
    "peer": "add-no-save --peer-deps"
  },
  ...
}
```

Usage and available options can be found at:
```shell script
$ yarn add-no-save --help
```

#### Global Install  

Add the module globally:
```shell script
$ yarn global add yarn-add-no-save
```

Run from the root folder of your project: 
```shell script
$ yarn-add-no-save rollup es-lint@0.6.1 --peer-deps
```

Usage and available options can be found at:
```shell script
$ yarn-add-no-save --help
```

### Usage

```
Usage: yarn-add-no-save [packages] [flags]

  Options:

    --peer-deps, -p			 Automatically installs peer dependencies listed in the package.json file
    --peer-version <string|path>	 Used with --peer-deps: How to define which version of a package to install.
					 Either 'first', 'last', 'latest' or a path to a package.json from which the
					 version will be inferred. Default: latest
    --help, -h				 Displays help information (this message).
    --version, -v			 Displays the version of this utility.

  NOTE: All unrecognized options are forwarded to the `yarn add` command.
```

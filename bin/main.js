const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const thisPkg = require('../package.json');
const which = require('which');

const logger = require('./logger.js');

function printHelp(local) {
    console.log(`\n  Usage: yarn${local ? ' add-no-save' : '-add-no-save'} [packages] [flags]\n`);

    console.log('  Options:\n');

    console.log('    --peer-deps, -p\t\t\t Automatically installs peer dependencies listed in the package.json file');
    console.log('    --peer-version <string|path>\t Used with --peer-deps: How to define which version of a package to install.');
    console.log('\t\t\t\t\t Either \'first\', \'last\', \'latest\' or a path to a package.json from which the');
    console.log('\t\t\t\t\t version will be inferred. Default: latest');
    console.log('    --help, -h\t\t\t\t Displays help information (this message).');
    console.log('    --version, -v\t\t\t Displays the version of this utility.');

    console.log('\n  NOTE: All unrecognized options are forwarded to the `yarn add` command.\n');
}

function printVersion() {
    console.log(`\x1b[37myarn-add-no-save VERSION:\x1b[0m ${thisPkg.version}`);
}

function parseArgs(args) {
    const result = {
        packages: [],
        options: {},
    };
    let optionsSection = false;
    let currentOption = null;
    for (let i = 0, n = args.length; i < n; ++i) {
        const arg = args[i];
        const isOptionName = arg.startsWith('-');
        optionsSection = optionsSection || isOptionName;
        if (!optionsSection) {
            result.packages.push(arg);
        } else {
            if (isOptionName) {
                currentOption = arg;
                result.options[arg] = [];
            } else if (currentOption) {
                result.options[currentOption].push(arg);
            }
        }
    }
    return result;
}

function getOptionValue(names, options, index = 0) {
    const namesArr = Array.isArray(names) ? names : [names];
    for (let i = 0, n = namesArr.length; i < n; ++i) {
        const name = namesArr[i];
        if (options[name]) {
            if (index >= 0 && index < options[name].length) {
                return options[name][index];
            }
            return options[name];
        }
    }
    return null;
}

function loadFile(filePath) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(filePath)) {
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        } else {
            resolve(null);
        }
    });
}

function writeFile(filePath, content) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, content, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function deleteFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function loadPackageJSON() {
    const filePath = path.resolve(process.cwd(), 'package.json');
    return loadFile(filePath);
}

async function restorePackageJSON(binPkg) {
    const filePath = path.resolve(process.cwd(), 'package.json');
    return writeFile(filePath, binPkg);
}

async function loadYarnLock() {
    const filePath = path.resolve(process.cwd(), 'yarn.lock');
    return loadFile(filePath);
}

async function restoreYarnLock(binLock) {
    const filePath = path.resolve(process.cwd(), 'yarn.lock');
    if (!binLock) {
        if (fs.existsSync(filePath)) {
            await deleteFile(filePath);
        }
        return;
    }
    return writeFile(filePath, binLock);
}

async function loadPeerPackage(peerVersion) {
    if (peerVersion && peerVersion.endsWith('.json')) {
        const baseFolder = process.env.INIT_CWD || process.cwd();
        const filePath = path.resolve(baseFolder, peerVersion);
        const file = await loadFile(filePath);
        if (file) {
            const json = JSON.parse(file.toString());
            json.dependencies = json.dependencies || {};
            json.devDependencies = json.devDependencies || {};
            return json;
        }
    }
    return null;
}

async function resolvePackages(binPkg, args) {
    const result = [...args.packages];

    if (getOptionValue(['--peer-deps', '-p'], args.options)) {
        const pkg = JSON.parse(binPkg.toString());
        if (pkg.peerDependencies) {
            const peerVersion = getOptionValue('--peer-version', args.options);
            const peerPackage = await loadPeerPackage(peerVersion);
            const verResolution = peerVersion === 'first' || peerVersion === 'last' ? peerVersion : 'latest';
            const peerDeps = Object.keys(pkg.peerDependencies);

            for (let i = 0, n = peerDeps.length; i < n; ++i) {
                if (peerPackage) {
                    let list = null;
                    if (peerPackage.dependencies[peerDeps[i]]) {
                        list = peerPackage.dependencies;
                    } else if (peerPackage.devDependencies[peerDeps[i]]) {
                        list = peerPackage.devDependencies;
                    }

                    if (list) {
                        result.push(`${peerDeps[i]}@${list[peerDeps[i]].trim()}`);
                        continue;
                    }
                }

                if (verResolution === 'latest') {
                    result.push(peerDeps[i]);
                    continue;
                }

                const versions = pkg.peerDependencies[peerDeps[i]].split('||');
                if (verResolution === 'first') {
                    result.push(`${peerDeps[i]}@${versions[0].trim()}`);
                    continue;
                }

                // verResolution === 'last'
                result.push(`${peerDeps[i]}@${versions[versions.length - 1].trim()}`);
            }
        }
    }

    return result;
}

function isKnownOption(option) {
    const knownOptions = [
        '--help',
        '-h',
        '--version',
        '-v',
        '--peer-deps',
        '-p',
        '--peer-version',
    ];

    for (let i = 0, n = knownOptions.length; i < n; ++i) {
        if (option === knownOptions[i]) {
            return true;
        }
    }

    return false;
}

function getUnknownOptions(options) {
    const result = {};
    const keys = Object.keys(options);
    for (let i = 0, n = keys.length; i < n; ++i) {
        if (!isKnownOption(keys[i])) {
            result[keys[i]] = options[keys[i]];
        }
    }
    return result;
}

function runTask(packages, unknownOptions) {
    return new Promise((resolve, reject) => {
        const args = ['add', ...packages];
        const unknownKeys = Object.keys(unknownOptions);
        for (let i = 0, n = unknownKeys.length; i < n; ++i) {
            args.push(unknownKeys[i], ...unknownOptions[unknownKeys[i]]);
        }

        const options = {
            cwd: process.cwd(),
            stdio: [process.stdin, process.stdout, process.stderr],
        };

        const yarnPath = which.sync('yarn');

        const child = childProcess.spawn(yarnPath, args, options);

        child.once('error', err => {
            reject(err);
        });

        child.once('close', code => {
            resolve(code);
        });
    });
}

async function main(local, rawArgs) {
    const args = parseArgs(rawArgs);
    if (
        getOptionValue(['--help', '-h'], args.options) ||
        (args.packages.length === 0 && Object.keys(args.options).length === 0)
    ) {
        printHelp(local);
        process.exit();
    }

    if (getOptionValue(['--version', '-v'], args.options)) {
        printVersion();
        process.exit();
    }

    const binPkg = await loadPackageJSON();
    const binLock = await loadYarnLock();

    if (!binPkg) {
        logger.logErr('No \'package.json\' file found!');
        process.exit(66);
    }

    if (!binLock) {
        logger.logWarn('No \'yarn.lock\' file found.');
        logger.logInfo('Any \'yarn.lock\' generated by the install will be deleted.');
    }

    const packages = await resolvePackages(binPkg, args);
    const unknownOptions = getUnknownOptions(args.options);

    const code = await runTask(packages, unknownOptions);

    if (code === 0) {
        await restorePackageJSON(binPkg);
        await restoreYarnLock(binLock);
    }

    process.exit(code);
}

module.exports = main;

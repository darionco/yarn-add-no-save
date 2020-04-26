#!/usr/bin/env node

const logger = require('./logger.js');

const local = Boolean(process.env.YARN_WRAP_OUTPUT);
if (local) {
    logger.logErr('This version can only run globally.');
    logger.logInfo('Run `yarn-add-no-save` from your project\'s folder.');
    logger.logInfo('If you intended to run this command locally use `yarn add-no-save` instead');
    process.exit(66);
}

const main = require('./main.js');
const [,, ...args] = process.argv;
main(local, args);

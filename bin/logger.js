
function logErr(str) {
    console.error(`\x1b[1;31mERR:\x1b[0m ${str}`);
}

function logWarn(str) {
    console.warn(`\x1b[33mWARN:\x1b[0m ${str}`);
}

function logInfo(str) {
    console.info(`\x1b[1;37mINFO:\x1b[0m ${str}`);
}

module.exports = {
    logErr,
    logWarn,
    logInfo
};

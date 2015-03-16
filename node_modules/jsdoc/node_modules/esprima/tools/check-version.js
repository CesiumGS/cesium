#!/usr/bin/env node

'use strict';

var fs = require('fs');

function findCanonicalVersion() {
    var matcher, lines, version;

    matcher = /exports\.version\s+=\s+\'([0-9\.\-a-zA-Z]+)\'/;
    lines = fs.readFileSync('esprima.js', 'utf-8').split('\n');
    lines.forEach(function (line) {
        if (matcher.test(line)) {
            version = matcher.exec(line)[1];
        }
    });

    return version;
}

function ensureVersion(manifestFile, expectedVersion) {
    var matcher, lines, version;

    console.log('Checking', manifestFile, '...');
    matcher = /"version"\s*\:\s*"([0-9\.\-a-zA-Z]+)"/;
    lines = fs.readFileSync(manifestFile, 'utf-8').split('\n');
    lines.forEach(function (line) {
        if (matcher.test(line)) {
            version = matcher.exec(line)[1];
        }
    });
    if (expectedVersion !== version) {
        console.log('ERROR: Wrong version for', manifestFile);
        console.log('Expected:', expectedVersion);
        console.log('  Actual:', version);
        process.exit(1);
    }
}

function checkVersion() {
    var version;

    console.log('Getting the canonical library version...');
    version = findCanonicalVersion();
    if (typeof version !== 'string') {
        console.log('ERROR: Can not get version number!', typeof version);
        process.exit(1);
    }
    console.log('Library version is', version);

    ensureVersion('package.json', version);
    ensureVersion('component.json', version);
}


checkVersion();

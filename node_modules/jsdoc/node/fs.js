'use strict';

var fs = require('fs');
var path = require('path');
var stream = require('stream');
var wrench = require('wrench');

var toDir = exports.toDir = function(_path) {
    var isDirectory;

    try {
        isDirectory = fs.statSync(_path).isDirectory();
    }
    catch(e) {
        isDirectory = false;
    }

    if (isDirectory){
       return _path;
    } else {
        return path.dirname(_path);
    }
};

exports.mkPath = function(/**Array*/ _path) {
    if ( Array.isArray(_path) ) {
        _path = _path.join('');
    }

    wrench.mkdirSyncRecursive(_path);
};

// adapted from http://procbits.com/2011/11/15/synchronous-file-copy-in-node-js
exports.copyFileSync = function(inFile, outDir, fileName) {
    var BUF_LENGTH = 64 * 1024;

    var read;
    var write;

    var buffer = new Buffer(BUF_LENGTH);
    var bytesRead = 1;
    var outFile = path.join( outDir, fileName || path.basename(inFile) );
    var pos = 0;

    wrench.mkdirSyncRecursive(outDir);
    read = fs.openSync(inFile, 'r');
    write = fs.openSync(outFile, 'w');

    while (bytesRead > 0) {
        bytesRead = fs.readSync(read, buffer, 0, BUF_LENGTH, pos);
        fs.writeSync(write, buffer, 0, bytesRead);
        pos += bytesRead;
    }

    fs.closeSync(read);
    return fs.closeSync(write);
};

Object.keys(fs).forEach(function(key) {
    exports[key] = fs[key];
});

var wrench = require('wrench/wrench');
var path = require('path');
var fs = require('fs');
var specs = [];

var createSpecObj = function(path, root) {
    return {
        path : function() {
            return path;
        },
        relativePath : function() {
            return path.replace(root, '').replace(/^[\/\\]/, '').replace(/\\/g, '/');
        },
        directory : function() {
            return path.replace(/[\/\\][\s\w\.-]*$/, "").replace(/\\/g, '/');
        },
        relativeDirectory : function() {
            return relativePath().replace(/[\/\\][\s\w\.-]*$/, "").replace(/\\/g, '/');
        },
        filename : function() {
            return path.replace(/^.*[\\\/]/, '');
        }
    };
};

var clearSpecs = exports.clearSpecs = function() {
    specs.splice(0, specs.length);
};

exports.load = function(loadpath, matcher, clear) {
    if(clear === true) {
        clearSpecs();
    }
    var wannaBeSpecs = wrench.readdirSyncRecursive(loadpath);
    for (var i = 0; i < wannaBeSpecs.length; i++) {
        var file = path.join(__dirname, loadpath, wannaBeSpecs[i]);
        try {
            if (fs.statSync(file).isFile()) {
                if (!/.*node_modules.*/.test(file) && matcher.test(path.filename(file))) {
                    specs.push(createSpecObj(file));
                }
            }
        } catch(e) {
            // nothing to do here
        }
    }
};

exports.getSpecs = function() {
    return specs;
};
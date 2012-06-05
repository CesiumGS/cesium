/*
 * Tests Steps:
 * 1. Get Jasmine
 * 2. Get the test options
 * 3. Get the list of directories to run tests from
 * 4. Run Jasmine on each directory
 */
var jasmine = require('test/jasmine-jsdoc');
var extensions = "js";
var match = ".";
var verbose = env.opts.verbose || false;
var coffee = env.opts.coffee || false;
var matches = env.opts.match || false;
if (coffee) {
    extensions = "js|coffee";
}
if (matches) {
    if (matches instanceof Array) {
        match = matches.join("|");
    } else {
        match = matches;
    }
}

var helperCollection = require('test/spec-collection');
var specFolders = ['test/specs', 'plugins/test/specs'];
var failedCount = 0;
var index = 0;

for (var key in jasmine) {
    this[key] = jasmine[key];
}

var onComplete = function(runner, log) {
    if (runner.results().failedCount != 0) {
        failedCount++;
    }
    index++;
    runNextFolder();
};

var specFolder = null;

var runNextFolder = function() {
    if (index < specFolders.length) {
        jasmine.loadHelpersInFolder(specFolders[index], new RegExp("helpers\\.(" + extensions + ")$", 'i'));

        var regExpSpec = new RegExp("(" + match + ")\\.(" + extensions + ")$", 'i');
        jasmine.executeSpecsInFolder(specFolders[index], onComplete, verbose, regExpSpec);
    }
};

runNextFolder();
process.exit(failedCount);
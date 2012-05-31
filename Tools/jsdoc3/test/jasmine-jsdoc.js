/*First load envjs to give us a browser environment for jasmine.
 *Jasmine wants things like set/clearInterval,set/clearTimeout.
 *Then load jasmine itself
 */
load('test/lib/env.rhino.js');
load('test/lib/jasmine.js');
load('test/async-callback.js');
var jasmineNode = require('./reporter').jasmineNode,
    util = require('common/util');

jasmine.loadHelpersInFolder = function(folder, matcher) {
    var helpers = [], helperCollection = require('./spec-collection');

    helperCollection.load(folder, matcher, true);
    helpers = helperCollection.getSpecs();
    for ( var i = 0, len = helpers.length; i < len; ++i) {
        var file = helpers[i].path();
        var helper = require(file.replace(/\.*$/, ""));

        for (var key in helper) {
            this[key] = helper[key];
        }
    }
};

function removeJasmineFrames(text) {
    var lines = [];
    text.split(/\n/).forEach(function(line) {
        if (line.indexOf(filename) == -1) {
            lines.push(line);
        }
    });
    return lines.join('\n');
}

var reporter = null;
jasmine.initialize = function(done, verbose) {
    var jasmineEnv = jasmine.getEnv();

    if (reporter !== null) {
        //If we've run before, we need to reset the runner
        jasmineEnv.currentRunner_ = new jasmine.Runner(jasmineEnv);
        //And clear the reporter
        jasmineEnv.reporter.subReporters_.splice(jasmineEnv.reporter.subReporters_.indexOf(reporter));
    }
    reporter = new (verbose ? jasmineNode.TerminalVerboseReporter : jasmineNode.TerminalReporter)({
        print : util.print,
        color : true,
        onComplete : done,
        stackFilter : removeJasmineFrames
    });
    jasmineEnv.addReporter(reporter);

    //updateInterval is set to 0 because there were not-fully-understood
    //issues with asynchronous behavior in jasmine otherwise.
    jasmineEnv.updateInterval = 0;

    return jasmineEnv;
};

/**
 * Execute the specs in the specified folder. Helpers in each folder will be
 * added to the environment.  Helpers in parent directories will be available to child
 * directories.
 * @param {string} folder the folder in which the specs are to be found
 * @param {function?} done callback function to execute when finished
 * @param {boolean} verbose whether or not output verbose results
 * @param {RegExp} matcher a regular expression to filter specs by.  Only matching specs will run
 */
jasmine.executeSpecsInFolder = function(folder, done, verbose, matcher) {
    var fileMatcher = matcher || new RegExp(".(js)$", "i"),
        specs = require('./spec-collection'),
        jasmineEnv = jasmine.initialize(done, verbose);

    //Load the specs
    specs.load(folder, fileMatcher, true);

    //Add the specs to the context
    var specsList = specs.getSpecs();
    for ( var i = 0, len = specsList.length; i < len; ++i) {
        var filename = specsList[i];
        require(filename.path().replace(/\.\w+$/, ""));
    }

    //Run Jasmine
    jasmineEnv.execute();
};

function now() {
    return new Date().getTime();
}

jasmine.asyncSpecWait = function() {
    var wait = this.asyncSpecWait;
    wait.start = now();
    wait.done = false;
    (function innerWait() {
        waits(10);
        runs(function() {
            if (wait.start + wait.timeout < now()) {
                expect('timeout waiting for spec').toBeNull();
            } else if (wait.done) {
                wait.done = false;
            } else {
                innerWait();
            }
        });
    })();
};
jasmine.asyncSpecWait.timeout = 4 * 1000;
jasmine.asyncSpecDone = function() {
    jasmine.asyncSpecWait.done = true;
};

for ( var key in jasmine) {
    exports[key] = jasmine[key];
}

exports.spyOn = spyOn;
exports.it = it;
exports.xit = xit;
exports.expect = expect;
exports.runs = runs;
exports.waitsFor = waitsFor;
exports.beforeEach = beforeEach;
exports.afterEach = afterEach;
exports.describe = describe;
exports.xdescribe = xdescribe;
/**
 * Define a test suite.
 * @param {Array} deps An array of dependencies, to be passed to require.
 * @param {String|Function} name Either the name of the test suite, or the test suite itself,
 * in which case the first dependency in the array will be used as the name.
 * @param {Function} [suite] The test suite.
 */
var defineSuite;

/**
 * Registers a function that is called before running all tests.
 *
 * @param {Function} beforeAllFunction The function to run before all tests.
 */
var beforeAll;

/**
 * Registers a function that is called after running all tests.
 *
 * @param {Function} afterAllFunction The function to run after all tests.
 */
var afterAll;

(function() {
    "use strict";
    /*global require,describe,specs,jasmine*/

    // patch in beforeAll/afterAll functions
    // based on existing beforeEach/afterEach

    jasmine.Env.prototype.beforeAll = function(beforeAllFunction) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll(beforeAllFunction);
        } else {
            this.currentRunner_.beforeAll(beforeAllFunction);
        }
    };

    jasmine.Env.prototype.afterAll = function(afterAllFunction) {
        if (this.currentSuite) {
            this.currentSuite.afterAll(afterAllFunction);
        } else {
            this.currentRunner_.afterAll(afterAllFunction);
        }
    };

    jasmine.Runner.prototype.beforeAll = function(beforeAllFunction) {
        beforeAllFunction.typeName = 'beforeAll';
        if (typeof this.beforeAll_ === 'undefined') {
            this.beforeAll_ = [];
        }
        this.beforeAll_.splice(0, 0, beforeAllFunction);
    };

    jasmine.Runner.prototype.afterAll = function(afterAllFunction) {
        afterAllFunction.typeName = 'afterAll';
        if (typeof this.afterAll_ === 'undefined') {
            this.afterAll_ = [];
        }
        this.afterAll_.splice(0, 0, afterAllFunction);
    };

    jasmine.Suite.prototype.beforeAll = function(beforeAllFunction) {
        beforeAllFunction.typeName = 'beforeAll';
        if (typeof this.beforeAll_ === 'undefined') {
            this.beforeAll_ = [];
        }
        this.beforeAll_.unshift(beforeAllFunction);
    };

    jasmine.Suite.prototype.afterAll = function(afterAllFunction) {
        afterAllFunction.typeName = 'afterAll';
        if (typeof this.afterAll_ === 'undefined') {
            this.afterAll_ = [];
        }
        this.afterAll_.unshift(afterAllFunction);
    };

    var originalAddBeforesAndAftersToQueue = jasmine.Spec.prototype.addBeforesAndAftersToQueue;
    jasmine.Spec.prototype.addBeforesAndAftersToQueue = function() {
        originalAddBeforesAndAftersToQueue.apply(this);

        var env = this.env;
        var runner = env.currentRunner();

        var suite = this.suite;
        var specs = suite.specs();
        var i = suite.queue.index;

        // check to see if all the previous specs were skipped
        // in which case this is the first spec
        while (i > 0 && specs[i - 1].results().skipped) {
            --i;
        }
        var firstSpec = i === 0;

        if (firstSpec) {
            if (typeof suite.beforeAll_ !== 'undefined') {
                for (i = 0; i < suite.beforeAll_.length; i++) {
                    this.queue.addBefore(new jasmine.Block(this.env, suite.beforeAll_[i], this));
                }
            }

            if (typeof runner.beforeAll_ !== 'undefined' && runner.queue.index === 0) {
                for (i = 0; i < runner.beforeAll_.length; i++) {
                    this.queue.addBefore(new jasmine.Block(this.env, runner.beforeAll_[i], this));
                }
            }
        }

        i = suite.queue.index;
        var lastIndex = suite.queue.blocks.length - 1;
        // check to see if all the remaining specs will be skipped
        // in which case this the last spec
        while (i < lastIndex && !env.specFilter(suite.queue.blocks[i + 1])) {
            ++i;
        }
        var lastSpec = i === lastIndex;

        if (lastSpec) {
            if (typeof suite.afterAll_ !== 'undefined') {
                for (i = 0; i < suite.afterAll_.length; i++) {
                    this.queue.add(new jasmine.Block(this.env, suite.afterAll_[i], this));
                }
            }

            if (typeof runner.beforeAll_ !== 'undefined' && runner.queue.index === runner.queue.blocks.length - 1) {
                for (i = 0; i < runner.afterAll_.length; i++) {
                    this.queue.add(new jasmine.Block(this.env, runner.afterAll_[i], this));
                }
            }
        }
    };

    beforeAll = function(beforeAllFunction) {
        jasmine.getEnv().beforeAll(beforeAllFunction);
    };

    afterAll = function(afterAllFunction) {
        jasmine.getEnv().afterAll(afterAllFunction);
    };

    var tests = [];
    var readyToCreateTests = false;
    var createTests;

    function getQueryParameter(name) {
        var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);

        if (match) {
            return decodeURIComponent(match[1].replace(/\+/g, ' '));
        }
    }

    require.config({
        baseUrl : getQueryParameter('baseUrl') || '../Source',
        paths : {
            'Specs' : '../Specs'
        }
    });

    //start loading all of Cesium early, so it's all available for code coverage calculations.
    require(['Cesium']);

    defineSuite = function(deps, name, suite) {
        if (typeof name === 'function') {
            suite = name;
            name = deps[0];
        }

        var test = {
            name : name
        };

        tests.push(test);

        require(deps, function() {
            var args = arguments;

            test.f = function() {
                return describe(name, function() {
                    suite.apply(null, args);
                });
            };

            createTestsIfReady();
        });
    };

    function createTestsIfReady() {
        if (readyToCreateTests && allTestsReady()) {
            tests.sort(function(a, b) {
                return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
            });

            tests.forEach(function(test, i) {
                //calling the function registers the test with Jasmine
                var suite = test.f();

                //keep track of the index of the test in the suite so the sort later is stable.
                suite.index = i;
            });

            createTests();
        }
    }

    function allTestsReady() {
        return tests.every(function(test) {
            return !!test.f;
        });
    }

    //specs is an array defined by SpecList.js
    require([
             'Specs/addDefaultMatchers',
             'Specs/equalsMethodEqualityTester'
         ].concat(specs), function(
             addDefaultMatchers,
             equalsMethodEqualityTester) {
        var env = jasmine.getEnv();

        env.beforeEach(addDefaultMatchers);
        env.addEqualityTester(equalsMethodEqualityTester);

        createTests = function() {
            var isSuiteFocused = jasmine.TrivialReporter.isSuiteFocused;
            var suites = jasmine.getEnv().currentRunner().suites();

            for ( var i = 1, insertPoint = 0, len = suites.length; i < len; i++) {
                var suite = suites[i];
                if (isSuiteFocused(suite)) {
                    suites.splice(i, 1);
                    suites.splice(insertPoint, 0, suite);
                    insertPoint++;
                    i--;
                }
            }
            var reporter = new jasmine.TrivialReporter();
            env.addReporter(reporter);
            env.specFilter = reporter.specFilter;
            env.execute();
        };

        readyToCreateTests = true;
        createTestsIfReady();
    });
}());
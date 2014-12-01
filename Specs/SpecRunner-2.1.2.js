/**
 * Define a test suite.
 * @param {Array} deps An array of dependencies, to be passed to require.
 * @param {String|Function} name Either the name of the test suite, or the test suite itself,
 * in which case the first dependency in the array will be used as the name.
 * @param {Function|Array} [suite] Either the test suite or an array of category names for the suite.
 * @param {Array} [categories] An optional array of category names for the test suite.
 */
var defineSuite;

/**
 * Defines a test suite that is skipped.
 *
 * @see defineSuite
 */
var xdefineSuite;

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

    function getQueryParameter(name) {
        var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }

    function defined(value) {
        return value !== undefined;
    }

    // patch in beforeAll/afterAll functions
    // based on existing beforeEach/afterEach

    jasmine.Env.prototype.beforeAll = function(beforeAllFunction) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll(beforeAllFunction);
        } else {
            throw 'Must call beforeAll while defining a suite.';
        }
    };

    jasmine.Env.prototype.afterAll = function(afterAllFunction) {
        if (this.currentSuite) {
            this.currentSuite.afterAll(afterAllFunction);
        } else {
            throw 'Must call beforeAll while defining a suite.';
        }
    };

    jasmine.Suite.prototype.beforeAll = function(beforeAllFunction) {
        beforeAllFunction.typeName = 'beforeAll';
        if (!defined(this.beforeAll_)) {
            this.beforeAll_ = [];
        }
        this.beforeAll_.unshift(beforeAllFunction);
    };

    jasmine.Suite.prototype.afterAll = function(afterAllFunction) {
        afterAllFunction.typeName = 'afterAll';
        if (!defined(this.afterAll_)) {
            this.afterAll_ = [];
        }
        this.afterAll_.unshift(afterAllFunction);
    };

    jasmine.Suite.prototype.allSpecsFiltered = function() {
        var i;
        var len;

        var specs = this.specs_;
        for (i = 0, len = specs.length; i < len; i++) {
            var spec = specs[i];
            if (spec.env.specFilter(spec)) {
                return false;
            }
        }

        var suites = this.suites_;
        for (i = 0, len = suites.length; i < len; i++) {
            var suite = suites[i];
            if (!suite.allSpecsFiltered()) {
                return false;
            }
        }

        return true;
    };

    jasmine.Suite.prototype.execute = (function(originalExecute) {
        return function(onComplete) {
            if (!this.allSpecsFiltered()) {
                var i;
                var len;
                var block;
                var results;

                var beforeAll = this.beforeAll_;
                if (defined(beforeAll)) {
                    var beforeSpec = new jasmine.Spec(this.env, this, 'beforeAll');
                    this.beforeSpec_ = beforeSpec;
                    results = function() {
                        return beforeSpec.results();
                    };
                    for (i = 0, len = beforeAll.length; i < len; i++) {
                        block = new jasmine.Block(this.env, beforeAll[i], beforeSpec);
                        block.results = results;
                        this.queue.addBefore(block);
                    }
                }

                var afterAll = this.afterAll_;
                if (defined(afterAll)) {
                    var afterSpec = new jasmine.Spec(this.env, this, 'afterAll');
                    this.afterSpec_ = afterSpec;
                    results = function() {
                        return afterSpec.results();
                    };
                    for (i = 0, len = afterAll.length; i < len; i++) {
                        block = new jasmine.Block(this.env, afterAll[i], afterSpec);
                        block.results = results;
                        this.queue.add(block);
                    }
                }
            }

            originalExecute.call(this, onComplete);
        };
    })(jasmine.Suite.prototype.execute);

    function wrapWithDebugger(originalFunction) {
        return function() {
            /*jshint debug:true*/
            var stepIntoThisFunction = originalFunction.bind(this);
            debugger;
            stepIntoThisFunction();
        };
    }

    var debug = getQueryParameter('debug');
    if (debug !== null) {
        jasmine.Spec.prototype.execute = (function(originalExecute) {
            return function(onComplete) {
                if (this.getFullName() === debug) {
                    var block = this.queue.blocks[0];
                    block.func = wrapWithDebugger(block.func);
                }

                originalExecute.call(this, onComplete);
            };
        })(jasmine.Spec.prototype.execute);
    }

    beforeAll = function(beforeAllFunction) {
        jasmine.getEnv().beforeAll(beforeAllFunction);
    };

    afterAll = function(afterAllFunction) {
        jasmine.getEnv().afterAll(afterAllFunction);
    };

    var tests = [];
    var readyToCreateTests = false;
    var createTests;

    var built = getQueryParameter('built');
    var release = getQueryParameter('release');
    var loadTests = true;

    require.config({
        waitSeconds : 30
    });

    // set up require for AMD, combined or minified and
    // start loading all of Cesium early, so it's all available for code coverage calculations.
    if (built) {
        require.config({
            baseUrl : getQueryParameter('baseUrl') || '../Build/Cesium',
            paths : {
                'Stubs' : '../Stubs'
            },
            shim : {
                'Cesium' : {
                    exports : 'Cesium'
                }
            }
        });

        require(['Cesium', 'Stubs/paths'], function(BuiltCesium, paths) {
            paths.Specs = '../../Specs';

            require.config({
                paths : paths
            });

            requireTests();
        });

        loadTests = false;
    } else {
        require.config({
            baseUrl : getQueryParameter('baseUrl') || '../Source',
            paths : {
                'Specs' : '../Specs'
            }
        });

        require(['Cesium']);
    }

    function allTestsReady() {
        return tests.every(function(test) {
            return !!test.f;
        });
    }

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

    defineSuite = function(deps, name, suite, categories) {
        if (typeof suite === 'object' || typeof suite === 'string') {
            categories = suite;
        }

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
                }, categories);
            };

            createTestsIfReady();
        });
    };

    xdefineSuite = function(deps, name, suite, categories) {
    };

    function requireTests() {
        //specs is an array defined by SpecList.js
        var modules = ['Specs/addDefaultMatchers', 'Specs/equalsMethodEqualityTester'].concat(specs);
        require(modules, function(addDefaultMatchers, equalsMethodEqualityTester) {
            var env = jasmine.getEnv();

            env.beforeEach(addDefaultMatchers(!release));
            env.addEqualityTester(equalsMethodEqualityTester);

            createTests = function() {
                var reporter = new jasmine.HtmlReporter();
                env.addReporter(reporter);
                env.specFilter = reporter.specFilter;
                env.execute();
            };

            readyToCreateTests = true;
            createTestsIfReady();
        });
    }

    if (loadTests) {
        requireTests();
    }
}());
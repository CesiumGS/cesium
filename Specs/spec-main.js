/**
 This is a version of Jasmine's boot.js modified to work with specs defined with AMD.  The original comments from boot.js follow.

 Starting with version 2.0, this file "boots" Jasmine, performing all of the necessary initialization before executing the loaded environment and all of a project's specs. This file should be loaded after `jasmine.js` and `jasmine_html.js`, but before any project source files or spec files are loaded. Thus this file can also be used to customize Jasmine for a project.

 If a project is using Jasmine via the standalone distribution, this file can be customized directly. If a project is using Jasmine via the [Ruby gem][jasmine-gem], this file can be copied into the support directory via `jasmine copy_boot_js`. Other environments (e.g., Python) will have different mechanisms.

 The location of `boot.js` can be specified and/or overridden in `jasmine.yml`.

 [jasmine-gem]: http://github.com/pivotal/jasmine-gem
 */

/*global define,require*/

(function() {
    'use strict';

    function getQueryParameter(name) {
        var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }

    var built = getQueryParameter('built');

    var toRequire = ['Cesium'];

    if (built) {
        require.config({
            waitSeconds: 30,
            baseUrl: getQueryParameter('baseUrl') || '../Build/Cesium',
            paths: {
                'Stubs': '../Stubs',
                'Specs': '../../Specs',
                'Source' : '../../Source'
            },
            shim: {
                'Cesium': {
                    exports: 'Cesium'
                }
            }
        });

        toRequire.push('./Stubs/paths');
    } else {
        require.config({
            waitSeconds: 30,
            baseUrl: getQueryParameter('baseUrl') || '../Source',
            paths: {
                'Specs': '../Specs',
                'Source' : '.'
            }
        });
    }

    require(toRequire, function(
            Cesium,
            paths) {

        /*global jasmineRequire,jasmine,exports,specs*/

        var when = Cesium.when;

        if (typeof paths !== 'undefined') {
            require.config({
                paths : paths
            });
        }

        /**
         * ## Require &amp; Instantiate
         *
         * Require Jasmine's core files. Specifically, this requires and attaches all of Jasmine's code to the `jasmine` reference.
         */
        window.jasmine = jasmineRequire.core(jasmineRequire);

        window.defineSuite = function(deps, name, suite, categories) {
            /*global define,describe*/
            if (typeof suite === 'object' || typeof suite === 'string') {
                categories = suite;
            }

            if (typeof name === 'function') {
                suite = name;
                name = deps[0];
            }

            define(deps, function() {
                var args = arguments;
                describe(name, function() {
                    suite.apply(null, args);
                }, categories);
            });
        };

        /**
         * Since this is being run in a browser and the results should populate to an HTML page, require the HTML-specific Jasmine code, injecting the same reference.
         */
        jasmineRequire.html(jasmine);

        /**
         * Create the Jasmine environment. This is used to run all specs in a project.
         */
        var env = jasmine.getEnv();

        /**
         * ## The Global Interface
         *
         * Build up the functions that will be exposed as the Jasmine public interface. A project can customize, rename or alias any of these functions as desired, provided the implementation remains unchanged.
         */
        var jasmineInterface = jasmineRequire['interface'](jasmine, env);

        /**
         * Helper function for readability below.
         */
        function extend(destination, source) {
            for (var property in source) {
                if (source.hasOwnProperty(property)) {
                    destination[property] = source[property];
                }
            }
            return destination;
        }

        /**
         * Add all of the Jasmine global/public interface to the proper global, so a project can use the public interface directly. For example, calling `describe` in specs instead of `jasmine.getEnv().describe`.
         */
        if (typeof window === 'undefined' && typeof exports === 'object') {
            extend(exports, jasmineInterface);
        } else {
            extend(window, jasmineInterface);
        }

        // Override beforeEach(), afterEach(), beforeAll(), afterAll(), and it() to automatically
        // call done() when a returned promise resolves.
        var originalIt = window.it;

        window.it = function(description, f, timeout, categories) {
            originalIt(description, function(done) {
                var result = f();
                when(result, function() {
                    done();
                }, function(e) {
                    done.fail('promise rejected: ' + e.toString());
                });
            }, timeout, categories);
        };

        var originalBeforeEach = window.beforeEach;

        window.beforeEach = function(f) {
            originalBeforeEach(function(done) {
                var result = f();
                when(result, function() {
                    done();
                }, function(e) {
                    done.fail('promise rejected: ' + e.toString());
                });
            });
        };

        var originalAfterEach = window.afterEach;

        window.afterEach = function(f) {
            originalAfterEach(function(done) {
                var result = f();
                when(result, function() {
                    done();
                }, function(e) {
                    done.fail('promise rejected: ' + e.toString());
                });
            });
        };

        var originalBeforeAll = window.beforeAll;

        window.beforeAll = function(f) {
            originalBeforeAll(function(done) {
                var result = f();
                when(result, function() {
                    done();
                }, function(e) {
                    done.fail('promise rejected: ' + e.toString());
                });
            });
        };

        var originalAfterAll = window.afterAll;

        window.afterAll = function(f) {
            originalAfterAll(function(done) {
                var result = f();
                when(result, function() {
                    done();
                }, function(e) {
                    done.fail('promise rejected: ' + e.toString());
                });
            });
        };


        /**
         * ## Runner Parameters
         *
         * More browser specific code - wrap the query string in an object and to allow for getting/setting parameters from the runner user interface.
         */

        var queryString = Cesium.queryToObject(window.location.search.substring(1));

        if (queryString.webglValidation !== undefined) {
            window.webglValidation = true;
        }

        if (queryString.webglStub !== undefined) {
            window.webglStub = true;
        }

        var queryStringForSpecFocus = Cesium.clone(queryString);
        if (queryStringForSpecFocus.category === 'none') {
            delete queryStringForSpecFocus.category;
        }

        var catchingExceptions = queryString['catch'];
        env.catchExceptions(typeof catchingExceptions === "undefined" ? true : catchingExceptions);

        /**
         * ## Reporters
         * The `HtmlReporter` builds all of the HTML UI for the runner page. This reporter paints the dots, stars, and x's for specs, as well as all spec names and all failures (if any).
         */
        var htmlReporter = new jasmine.HtmlReporter({
            env: env,
            onRaiseExceptionsClick: function() {
                queryString['catch'] = !env.catchingExceptions();
            },
            addToExistingQueryString: function(key, value) {
                queryStringForSpecFocus[key] = value;
                return '?' + Cesium.objectToQuery(queryStringForSpecFocus);
            },
            getContainer: function() {
                return document.body;
            },
            createElement: function() {
                return document.createElement.apply(document, arguments);
            },
            createTextNode: function() {
                return document.createTextNode.apply(document, arguments);
            },
            timer: new jasmine.Timer()
        });

        /**
         * The `jsApiReporter` also receives spec results, and is used by any environment that needs to extract the results  from JavaScript.
         */
        env.addReporter(jasmineInterface.jsApiReporter);
        env.addReporter(htmlReporter);

        var categoryString = queryString.category;

        var categories;
        if (categoryString) {
            categories = categoryString.split(',');
        }

        var notCategoryString = queryString.not;

        var notCategories;
        if (notCategoryString) {
            notCategories = notCategoryString.split(',');
        }

        /**
         * Filter which specs will be run by matching the start of the full name against the `spec` query param.
         */
        var specFilter = new jasmine.HtmlSpecFilter({
            filterString: function() {
                return queryString.spec;
            }
        });

        env.specFilter = function(spec) {
            if (!specFilter.matches(spec.getFullName())) {
                return false;
            }

            // If we're not filtering by category, include this spec.
            if (!categories && !notCategories) {
                return true;
            }

            // At least one of this spec's categories must match one of the selected categories.
            var keep = false;
            var toCheck;
            var i;

            if (categories && categories.indexOf('All') < 0) {
                toCheck = spec;
                while (!keep && toCheck) {
                    if (toCheck.categories) {
                        if (categories.indexOf(toCheck.categories) >= 0) {
                            keep = true;
                        }

                        for (i = 0; !keep && i < toCheck.categories.length; ++i) {
                            if (categories.indexOf(toCheck.categories[i]) >= 0) {
                                keep = true;
                            }
                        }
                    }

                    toCheck = toCheck.parentSuite;
                }
            } else {
                keep = true;
            }

            if (notCategories) {
                toCheck = spec;
                while (keep && toCheck) {
                    if (toCheck.categories) {
                        if (notCategories.indexOf(toCheck.categories) >= 0) {
                            keep = false;
                        }

                        for (i = 0; keep && i < toCheck.categories.length; ++i) {
                            if (categories.indexOf(toCheck.categories[i]) >= 0) {
                                keep = false;
                            }
                        }
                    }

                    toCheck = toCheck.parentSuite;
                }
            }

            return keep;
        };

        /**
         * Setting up timing functions to be able to be overridden. Certain browsers (Safari, IE 8, phantomjs) require this hack.
         */
        window.setTimeout = window.setTimeout;
        window.setInterval = window.setInterval;
        window.clearTimeout = window.clearTimeout;
        window.clearInterval = window.clearInterval;

        /**
         * ## Execution
         *
         * Load the modules via AMD, and then run all of the loaded specs. This includes initializing the `HtmlReporter` instance and then executing the loaded Jasmine environment.
         */
        var modules = ['Specs/addDefaultMatchers', 'Specs/equalsMethodEqualityTester'].concat(specs);
        require(modules, function(addDefaultMatchers, equalsMethodEqualityTester) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 6000;

            htmlReporter.initialize();

            var release = getQueryParameter('release');
            env.beforeEach(function() { addDefaultMatchers(!release).call(env); });
            env.beforeEach(function() { env.addCustomEqualityTester(equalsMethodEqualityTester); });

            env.execute();
        });
    });
})();

/**
 This is a version of Jasmine's boot.js modified to work with specs defined with AMD.  The original comments from boot.js follow.

 Starting with version 2.0, this file "boots" Jasmine, performing all of the necessary initialization before executing the loaded environment and all of a project's specs. This file should be loaded after `jasmine.js` and `jasmine_html.js`, but before any project source files or spec files are loaded. Thus this file can also be used to customize Jasmine for a project.

 If a project is using Jasmine via the standalone distribution, this file can be customized directly. If a project is using Jasmine via the [Ruby gem][jasmine-gem], this file can be copied into the support directory via `jasmine copy_boot_js`. Other environments (e.g., Python) will have different mechanisms.

 The location of `boot.js` can be specified and/or overridden in `jasmine.yml`.

 [jasmine-gem]: http://github.com/pivotal/jasmine-gem
 */

/*global define,require*/
require.config({
    //waitSeconds: 0
    baseUrl : '../Source',
    paths : {
        'Specs' : '../Specs'
    }
});

require(['./ThirdParty/when'], function(when) {
    'use strict';

    /*global jasmineRequire,jasmine,exports,specs*/

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

    window.it = function(description, f) {
        originalIt(description, function(done) {
            var result = f();
            when(result, function() {
                done();
            }, function(e) {
                done.fail('promise rejected: ' + e.toString());
            });
        });
    };

    var originalBeforeEach = window.beforeEach;

    window.beforeEach = function(f) {
        originalBeforeEach(function(done) {
            var result = f();
            when(result, function() {
                done();
            }, function() {
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
            }, function() {
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
            }, function() {
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
            }, function() {
                done.fail('promise rejected: ' + e.toString());
            });
        });
    };


    /**
     * ## Runner Parameters
     *
     * More browser specific code - wrap the query string in an object and to allow for getting/setting parameters from the runner user interface.
     */

    var queryString = new jasmine.QueryString({
        getWindowLocation: function() {
            return window.location;
        }
    });

    var catchingExceptions = queryString.getParam("catch");
    env.catchExceptions(typeof catchingExceptions === "undefined" ? true : catchingExceptions);

    /**
     * ## Reporters
     * The `HtmlReporter` builds all of the HTML UI for the runner page. This reporter paints the dots, stars, and x's for specs, as well as all spec names and all failures (if any).
     */
    var htmlReporter = new jasmine.HtmlReporter({
        env: env,
        onRaiseExceptionsClick: function() {
            queryString.setParam("catch", !env.catchingExceptions());
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

    /**
     * Filter which specs will be run by matching the start of the full name against the `spec` query param.
     */
    var specFilter = new jasmine.HtmlSpecFilter({
        filterString: function() {
            return queryString.getParam("spec");
        }
    });

    env.specFilter = function(spec) {
        return specFilter.matches(spec.getFullName());
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
    var modules = ['Specs/addDefaultMatchers-2.1', 'Specs/equalsMethodEqualityTester-2.1'].concat(specs);
    require(modules, function(addDefaultMatchers, equalsMethodEqualityTester) {
        htmlReporter.initialize();

        env.beforeEach(function() { addDefaultMatchers(true).call(env); });
        env.beforeEach(function() { env.addCustomEqualityTester(equalsMethodEqualityTester); });

        env.execute();
    });
});
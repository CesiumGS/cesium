Analysis of i18n Bundle Loading in 1.7+
=======================================

As of v.17, there are many combinations of loading i18n bundles depending on the input modules, the loader mode, the
build profile, and the deployment scenario. This document attempts to list them all.

Input Modules
-------------

A module may be expressed as

  1. An AMD module with an i18n plugin resource id dependency referencing an i18n bundle that is in AMD format (an AMD
  module cannot load a legacy bundle without using the legacy API).
	  
  2. A legacy module with a dojo.requireLocalization/dojo.getLocalization applications referencing an i18n bundle that
  is either in AMD or legacy format.
	  
  3. [1] Built by the 1.7 builder as a module
  
  4. [1] Built by the 1.7 builder in a layer with some locales to be preloaded and some not
  
  5. [2] Built by the 1.7 builder as a module
  
  6. [2] Built by the 1.7 builder in a layer with some locales to be preloaded and some not
  
  7. [2] Built by the 1.6- builder (not xdomain) as a module with some locales to be preloaded and some not
  
  8. [2] Built by the 1.6- builder (not xdomain) in a layer with some locales to be preloaded and some not
  
Note: the i18n/loader does not currently support loading modules built with the 1.6- builder with loader=xdomain

Load Scenarios
--------------

With these modules, there are several load scenarios

  1. Loading with a bundle available for the current locale specialization (i.e. the value of dojo.locale) or not.

  2. Loading with a preload bundle available for the current locale specialization (i.e. the value of dojo.locale) or not.
  
Crossed with

  1. The source version of the loader in sync mode or async mode; [2, 7, 8] won't work in async.
  
  2. A built version of the loader in sync mode or async mode; [2, 7, 8] won't work in async. Use
    
  3. The CDN version of the loader located xdomain in sync and async mode;  [2, 7, 8] won't work in async. Use

Test Design and Execution
-------------------------

The sources required for this test are in dojo/tests/_base/loader/i18n-exhaustive. Copy the two directories there to be
siblings of the dojo tree in a dtk source distribution.

The source modules as described in Input Modules are constructed in the subdirectory i18n-test. The v1.5.2 builder is
used to construct various built, legacy modules.

The various built module and loaders are constructed by the v1.7 builder. The shell script
i18n-test/build-test-targets.sh accomplishes this task automatically.

A unit test html page is constructed at i18n-test/unit.html. Given a query string, it will load a particular loader and
exercise a particular set of modules.

Finally, the DOH test dojo/tests/_base/i18nExhaustive runs all the various combinations.

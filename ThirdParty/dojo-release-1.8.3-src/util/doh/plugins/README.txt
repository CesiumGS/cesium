doh/plugins - plugins to configure and extend the DOH runner

These are loaded after the test runner and test url, but before the runner begins. This provides an opportunity to wrap and monkey-patch doh, the test harness and the test runner.

Usage - e.g.: 
	util/doh/runner.html?testModule=tests.cache&dohPlugins=doh/plugins/hello
    util/doh/runner.html?testModule=tests.cache&dohPlugins=doh/plugins/hello;doh/plugins/alwaysAudio

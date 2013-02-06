/*This profile demonstrates how to do a custom build for the Rhino environment.
  You only need to include the "shrinksafe" prefix entry below if you want to
  be able to run the DOH unit tests directly from the release directory.
*/

dependencies = {
	staticHasFeatures:{
		"host-rhino":1,
		"host-browser":0,
		"host-node":0,
		"dom":0,
		"dojo-has-api":1,
		"dojo-xhr-factory":0,
		"dojo-inject-api":1,
		"dojo-timeout-api":0,
		"dojo-trace-api":1,
		"dojo-loader-catches":0,
		"dojo-dom-ready-api":0,
		"dojo-dom-ready-plugin":0,
		"dojo-ready-api":1,
		"dojo-error-api":1,
		"dojo-publish-privates":1,
		"dojo-gettext-api":1,
		"dojo-sniff":0,
		"dojo-loader":1,
		"dojo-test-xd":0,
		"dojo-test-sniff":0
	}
};

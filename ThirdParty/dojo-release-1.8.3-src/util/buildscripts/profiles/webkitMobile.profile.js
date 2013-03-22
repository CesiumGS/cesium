// Profile for mobile builds on WebKit.
//
// Use when:
//		- target to webkit platforms (iOS and Android)
//		- document is in standards mode (i.e., with <!DOCTYPE html>)
// Usage:
//		./build.sh releaseDir=... action=release optimize=closure profile=webkitMobile

var profile = {
	// relative to this file
	basePath: "../../..",

	// relative to base path
	releaseDir: "../webkitMobile",

	stripConsole: "normal",

	// Use closure to optimize, to remove code branches for has("ie") etc.
	optimize: "closure",
	layerOptimize: "closure",

	packages: [
		{
			name: "dojo",
			location: "./dojo"
		},
		{
			name: "dijit",
			location: "./dijit"
		},
		{
			name: "dojox",
			location: "./dojox"
		}
	],

	// this is a "new-version" profile since is sets the variable "profile" rather than "dependencies"; therefore
	// the layers property is a map from AMD module id to layer properties...
	layers: {
		"dojo/dojo": {
			// the module dojo/dojo is the default loader (you can make multiple bootstraps with the new builder)
			include: [
				// the include vector gives the modules to include in this layer
				// note: unless the dojo/dojo layer has the property "customBase" set to truthy, then module
				// dojo/main will be automatically added...and conversely
				"dijit/_WidgetBase",
				"dijit/_Container",
				"dijit/_Contained",
				"dijit/registry"
			],
			customBase: true
		},
		"dojo/main": {
			include: ["dojo/selector/lite"]
		},
		"dojox/mobile": {
			include: [
				"dojox/mobile"
			],
			exclude: [
				// exclude gives a dependency forrest to exclude; i tend to put is second since the algorithm is...
				//
				// The modules to include in a particular layer are computed as follows:
				//
				// 1. The layer module itself.
				//
				// 2. Plus the dependency graph implied by the AMD dependencies of the layer module. This is given
				//	by the dependency vector found in the define application associated with the target module,
				//	the modules found in the dependency vectors of those modules, and so on until all modules in
				//	the graph have been found (remember, though not desirable, there may be cycles, so the graph
				//	is not necessarily a tree).
				//
				// 3. Plus all modules given in the include array, along with all of those modules' dependency graphs.
				//
				// 4. Less all modules given in the exclude array, along with all of those modules' dependency graphs.

				"dojo/dojo"
			]
		},
		"dojox/mobile/app": {
			include: [
				"dojox/mobile/app"
			],
			exclude: [
				"dojo/dojo",
				"dojox/mobile"
			]


		}
	},

	staticHasFeatures: {
		// Default settings for a browser, from dojo.js; apparently these get modified in special cases
		// like when running under node, or against RequireJS, but nothing we need to worry about.
		"host-browser": true,
		"host-node": false,
		"host-rhino": false,
		"dom": true,
		"dojo-amd-factory-scan": true,
		"dojo-loader": true,
		"dojo-has-api": true,
		"dojo-inject-api": true,
		"dojo-timeout-api": true,
		"dojo-trace-api": true,
		"dojo-log-api": true,
		"dojo-dom-ready-api": true,
		"dojo-publish-privates": true,
		"dojo-config-api": true,
		"dojo-sniff": true,
		"dojo-sync-loader": true,
		"dojo-test-sniff": true,
		"config-tlmSiblingOfDojo": true,

		// Other configuration switches that are hardcoded in the source.
		// Setting some of these to false may reduce code size, but unclear what they all mean.
		"config-publishRequireResult": true,
		"dojo-config-addOnLoad": 1,		// hardcoded to 1 in the source
		"dojo-config-require": true,
		"dojo-debug-messages": true,
		"dojo-gettext-api": true,			// apparently unused
		"dojo-guarantee-console": true,
		"dojo-loader-eval-hint-url": true,
		"dojo-modulePaths": true,
		"dojo-moduleUrl": true,
		"dojo-v1x-i18n-Api": true,
		"dojo-xhr-factory": true,	// if require.getXhr() exists (true for dojo's AMD loader, false for requireJS?)
		"extend-dojo": true,		// add functions to global dojo object

		// Browser flags
		"webkit": true,	// this is actually a number like 525 but I don't think anyone is using it
		"air": false,
		"ff": undefined,
		"mozilla": undefined,
		"ie": undefined,

		// Configuration settings
		"config-selectorEngine": "lite",
		"dijit-legacy-requires": false,		// don't load unrequested modules for back-compat
		"dom-quirks": false,				// we assume/require that the app is in strict mode
		"quirks": false,					// we assume/require that the app is in strict mode

		// Flags for old IE browser bugs / non-standard behavior
		"array-extensible": true,		// false for old IE
		"bug-for-in-skips-shadowed": 0,	// false for old IE
		"dom-attributes-explicit": true,	// everyone except IE6, 7
		"dom-attributes-specified-flag": true,	//everyone except IE6-8
		"dom-addeventlistener": true,		// everyone except IE
		"native-xhr": true,			// has XMLHTTPRequest
		"ie-event-behavior": undefined,
		"dojo-force-activex-xhr": false,	// true is for IE path

		// Flags for features
		"dom-matches-selector": true,
		"dom-qsa": true,
		"dom-qsa2.1": true,
		"dom-qsa3": true,
		"json-parse": true,
		"json-stringify": true,

		// Behavior that varies by browser, but is constant across webkit mobile browsers
		"events-keypress-typed": true,		// whether printable characters generate keypress event?
		"events-mouseenter": false,		// this is set by mouse.html but never used
		"touch": true,
		"highcontrast": false,			// safari always displays background images, even when device in high-contrast mode
		"textarea-needs-help-shrinking": true,
		"css-user-select": "'WebkitUserSelect'"

		// Values which can be different across mobile devices, so intentionally not specified in this list.
		// "event-orientationchange": true,
		// "safari": true,
		// "android": true
		// "wii": true
	},

	selectorEngine: "lite",

	defaultConfig: {
		hasCache: {
			// default
			"config-selectorEngine": "lite"
		},
		async: true
	}
};

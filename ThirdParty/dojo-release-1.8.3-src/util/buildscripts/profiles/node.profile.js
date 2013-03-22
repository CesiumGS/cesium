//
// This is an example profile that may be used as a starting point for a build targeted at node.js
//
// Note: generally, there will be very little performance improvement in the node.js environment since
// that environment does not have the latency and bandwidth issues present in the browser environment.
//
var profile = (function(){
	return {
		// relative to this file
		basePath:"../../..",

		// relative to base path
		releaseDir:"./dojo-node",

		packages:[{
			name:"dojo",
			location:"./dojo"
		}],


		defaultConfig:{
			hasCache:{
				'dojo-built':1,
				'dojo-loader':1
				// recall the dojo/_base/configNode will config the node environment
			},
			async:1
		},

		// since this build it intended to be utilized with properly-expressed AMD modules;
		// don't insert absolute module ids into the modules
		insertAbsMids:0,

		// these are all the has feature that affect the loader and/or the bootstrap
		// the settings below are optimized for the smallest AMD loader that is configurable
		staticHasFeatures:{
			// dojo/dojo
			'config-dojo-loader-catches':0,

			// dojo/dojo
			'config-tlmSiblingOfDojo':0,

			// dojo/dojo
			'dojo-amd-factory-scan':1,

			// dojo/dojo
			'dojo-combo-api':0,

			// dojo/_base/config, dojo/dojo
			'dojo-config-api':1,

			// dojo/main
			'dojo-config-require':0,

			// dojo/_base/kernel
			'dojo-debug-messages':0,

			// dojo/dojo
			'dojo-dom-ready-api':0,

			// dojo/main
			'dojo-firebug':0,

			// dojo/_base/kernel
			'dojo-guarantee-console':0,

			// dojo/has
			'dojo-has-api':1,

			// dojo/dojo
			'dojo-inject-api':1,

			// dojo/_base/config, dojo/_base/kernel, dojo/_base/loader, dojo/ready
			'dojo-loader':1,

			// dojo/dojo
			'dojo-log-api':0,

			// dojo/_base/kernel
			'dojo-modulePaths':0,

			// dojo/_base/kernel
			'dojo-moduleUrl':0,

			// dojo/dojo
			'dojo-publish-privates':0,

			// dojo/dojo
			'dojo-requirejs-api':0,

			// dojo/dojo
			'dojo-sniff':0,

			// dojo/dojo, dojo/i18n, dojo/ready
			'dojo-sync-loader':0,

			// dojo/dojo
			'dojo-test-sniff':0,

			// dojo/dojo
			'dojo-timeout-api':0,

			// dojo/dojo
			'dojo-trace-api':0,

			// dojo/dojo
			'dojo-undef-api':0,

			// dojo/i18n
			'dojo-v1x-i18n-Api':0,

			// dojo/_base/xhr
			'dojo-xhr-factory':0,

			// dojo/_base/loader, dojo/dojo, dojo/on
			'dom':0,

			// dojo/dojo
			'host-node':1,

			// dojo/dojo
			'host-browser':0,

			// dojo/_base/array, dojo/_base/connect, dojo/_base/kernel, dojo/_base/lang
			'extend-dojo':1
		}
	};
})();

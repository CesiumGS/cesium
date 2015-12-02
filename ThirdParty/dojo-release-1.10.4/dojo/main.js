define([
	"./_base/kernel",	// kernel.isAsync
	"./has",
	"require",
	"./sniff",
	"./_base/lang",
	"./_base/array",
	"./_base/config",
	"./ready",
	"./_base/declare",
	"./_base/connect",
	"./_base/Deferred",
	"./_base/json",
	"./_base/Color",
	"./has!dojo-firebug?./_firebug/firebug",
	"./has!host-browser?./_base/browser",
	"./has!dojo-sync-loader?./_base/loader"
], function(kernel, has, require, sniff, lang, array, config, ready){
	// module:
	//		dojo/main
	// summary:
	//		This is the package main module for the dojo package; it loads dojo base appropriate for the execution environment.

	// the preferred way to load the dojo firebug console is by setting has("dojo-firebug") true in dojoConfig
	// the isDebug config switch is for backcompat and will work fine in sync loading mode; it works in
	// async mode too, but there's no guarantee when the module is loaded; therefore, if you need a firebug
	// console guaranteed at a particular spot in an app, either set config.has["dojo-firebug"] true before
	// loading dojo.js or explicitly include dojo/_firebug/firebug in a dependency list.
	if(config.isDebug){
		require(["./_firebug/firebug"]);
	}

	// dojoConfig.require is deprecated; use the loader configuration property deps
	has.add("dojo-config-require", 1);
	if(has("dojo-config-require")){
		var deps= config.require;
		if(deps){
			// config.require may be dot notation
			deps= array.map(lang.isArray(deps) ? deps : [deps], function(item){ return item.replace(/\./g, "/"); });
			if(kernel.isAsync){
				require(deps);
			}else{
				// this is a bit janky; in 1.6- dojo is defined before these requires are applied; but in 1.7+
				// dojo isn't defined until returning from this module; this is only a problem in sync mode
				// since we're in sync mode, we know we've got our loader with its priority ready queue
				ready(1, function(){require(deps);});
			}
		}
	}

	return kernel;
});

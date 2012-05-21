exports.config = function(config){
	//	summary:
	//		This module provides bootstrap configuration for running dojo in node.js

	// any command line arguments with the load flag are pushed into deps
	for(var deps = [], args = [], i = 0; i < process.argv.length; i++){
		var arg = (process.argv[i] + "").split("=");
		if(arg[0] == "load"){
			deps.push(arg[1]);
		}else{
			args.push(arg);
		}
	}

	var fs = require("fs");

	// make sure global require exists
	//if (typeof global.require=="undefined") {
	//	global.require= {};
	//}

	// reset the has cache with node-appropriate values;
	var hasCache = {
		"host-node":1,
		"host-browser":0,
		"dom":0,
		"dojo-has-api":1,
		"dojo-xhr-factory":0,
		"dojo-inject-api":1,
		"dojo-timeout-api":0,
		"dojo-trace-api":1,
		"dojo-dom-ready-api":0,
		"dojo-publish-privates":1,
		"dojo-sniff":0,
		"dojo-loader":1,
		"dojo-test-xd":0,
		"dojo-test-sniff":0
	};
	for(var p in hasCache){
		config.hasCache[p] = hasCache[p];
	}

	var vm = require('vm');


	// reset some configuration switches with node-appropriate values
	var nodeConfig = {
		baseUrl: __dirname.match(/(.+)[\/\\]_base$/)[1],
		commandLineArgs:args,
		deps:deps,
		timeout:0,

		// TODO: really get the locale
		locale:"en-us",

		loaderPatch: {
			log:function(item){
				// define debug for console messages during dev instead of console.log
				// (node's heavy async makes console.log confusing sometimes)
				var util = require("util");
				util.debug(util.inspect(item));
			},

			eval: function(__text, __urlHint){
				return vm.runInThisContext(__text, __urlHint);
			},

			injectUrl: function(url, callback){
				try{
					vm.runInThisContext(fs.readFileSync(url, "utf8"), url);
					callback();
				}catch(e){
					this.log("failed to load resource (" + url + ")");
					this.log(e);
				}
			},

			getText: function(url, sync, onLoad){
				// TODO: implement async and http/https handling
				onLoad(fs.readFileSync(url, "utf8"));
			}
		}
	};
	for(p in nodeConfig){
		config[p] = nodeConfig[p];
	}
};

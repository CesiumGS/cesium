(function(
	userConfig,
	defaultConfig
){
	// summary:
	//		This is the "source loader" and is the entry point for Dojo during development. You may also load Dojo with
	//		any AMD-compliant loader via the package main module dojo/main.
	// description:
	//		This is the "source loader" for Dojo. It provides an AMD-compliant loader that can be configured
	//		to operate in either synchronous or asynchronous modes. After the loader is defined, dojo is loaded
	//		IAW the package main module dojo/main. In the event you wish to use a foreign loader, you may load dojo as a package
	//		via the package main module dojo/main and this loader is not required; see dojo/package.json for details.
	//
	//		In order to keep compatibility with the v1.x line, this loader includes additional machinery that enables
	//		the dojo.provide, dojo.require et al API. This machinery is loaded by default, but may be dynamically removed
	//		via the has.js API and statically removed via the build system.
	//
	//		This loader includes sniffing machinery to determine the environment; the following environments are supported:
	//
	//			* browser
	//			* node.js
	//			* rhino
	//
	//		This is the so-called "source loader". As such, it includes many optional features that may be discadred by
	//		building a customized verion with the build system.

	// Design and Implementation Notes
	//
	// This is a dojo-specific adaption of bdLoad, donated to the dojo foundation by Altoviso LLC.
	//
	// This function defines an AMD-compliant (http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition)
	// loader that can be configured to operate in either synchronous or asynchronous modes.
	//
	// Since this machinery implements a loader, it does not have the luxury of using a load system and/or
	// leveraging a utility library. This results in an unpleasantly long file; here is a road map of the contents:
	//
	//	 1. Small library for use implementing the loader.
	//	 2. Define the has.js API; this is used throughout the loader to bracket features.
	//	 3. Define the node.js and rhino sniffs and sniff.
	//	 4. Define the loader's data.
	//	 5. Define the configuration machinery.
	//	 6. Define the script element sniffing machinery and sniff for configuration data.
	//	 7. Configure the loader IAW the provided user, default, and sniffing data.
	//	 8. Define the global require function.
	//	 9. Define the module resolution machinery.
	//	10. Define the module and plugin module definition machinery
	//	11. Define the script injection machinery.
	//	12. Define the window load detection.
	//	13. Define the logging API.
	//	14. Define the tracing API.
	//	16. Define the AMD define function.
	//	17. Define the dojo v1.x provide/require machinery--so called "legacy" modes.
	//	18. Publish global variables.
	//
	// Language and Acronyms and Idioms
	//
	// moduleId: a CJS module identifier, (used for public APIs)
	// mid: moduleId (used internally)
	// packageId: a package identifier (used for public APIs)
	// pid: packageId (used internally); the implied system or default package has pid===""
	// pack: package is used internally to reference a package object (since javascript has reserved words including "package")
	// prid: plugin resource identifier
	// The integer constant 1 is used in place of true and 0 in place of false.

	// define a minimal library to help build the loader
	var	noop = function(){
		},

		isEmpty = function(it){
			for(var p in it){
				return 0;
			}
			return 1;
		},

		toString = {}.toString,

		isFunction = function(it){
			return toString.call(it) == "[object Function]";
		},

		isString = function(it){
			return toString.call(it) == "[object String]";
		},

		isArray = function(it){
			return toString.call(it) == "[object Array]";
		},

		forEach = function(vector, callback){
			if(vector){
				for(var i = 0; i < vector.length;){
					callback(vector[i++]);
				}
			}
		},

		mix = function(dest, src){
			for(var p in src){
				dest[p] = src[p];
			}
			return dest;
		},

		makeError = function(error, info){
			return mix(new Error(error), {src:"dojoLoader", info:info});
		},

		uidSeed = 1,

		uid = function(){
			// Returns a unique indentifier (within the lifetime of the document) of the form /_d+/.
			return "_" + uidSeed++;
		},

		// FIXME: how to doc window.require() api

		// this will be the global require function; define it immediately so we can start hanging things off of it
		req = function(
			config,       //(object, optional) hash of configuration properties
			dependencies, //(array of commonjs.moduleId, optional) list of modules to be loaded before applying callback
			callback      //(function, optional) lamda expression to apply to module values implied by dependencies
		){
			return contextRequire(config, dependencies, callback, 0, req);
		},

		// the loader uses the has.js API to control feature inclusion/exclusion; define then use throughout
		global = this,

		doc = global.document,

		element = doc && doc.createElement("DiV"),

		has = req.has = function(name){
			return isFunction(hasCache[name]) ? (hasCache[name] = hasCache[name](global, doc, element)) : hasCache[name];
		},

		hasCache = has.cache = defaultConfig.hasCache;

	has.add = function(name, test, now, force){
		(hasCache[name]===undefined || force) && (hasCache[name] = test);
		return now && has(name);
	};

	has.add("host-node", typeof process == "object" && /node(\.exe)?$/.test(process.execPath));
	if(has("host-node")){
		// fixup the default config for node.js environment
		require("./_base/configNode.js").config(defaultConfig);
		// remember node's require (with respect to baseUrl==dojo's root)
		defaultConfig.loaderPatch.nodeRequire = require;
	}

	has.add("host-rhino", typeof load == "function" && (typeof Packages == "function" || typeof Packages == "object"));
	if(has("host-rhino")){
		// owing to rhino's lame feature that hides the source of the script, give the user a way to specify the baseUrl...
		for(var baseUrl = userConfig.baseUrl || ".", arg, rhinoArgs = this.arguments, i = 0; i < rhinoArgs.length;){
			arg = (rhinoArgs[i++] + "").split("=");
			if(arg[0] == "baseUrl"){
				baseUrl = arg[1];
				break;
			}
		}
		load(baseUrl + "/_base/configRhino.js");
		rhinoDojoConfig(defaultConfig, baseUrl, rhinoArgs);
	}

	// userConfig has tests override defaultConfig has tests; do this after the environment detection because
	// the environment detection usually sets some has feature values in the hasCache.
	for(var p in userConfig.has){
		has.add(p, userConfig.has[p], 0, 1);
	}

	//
	// define the loader data
	//

	// the loader will use these like symbols if the loader has the traceApi; otherwise
	// define magic numbers so that modules can be provided as part of defaultConfig
	var	requested = 1,
		arrived = 2,
		nonmodule = 3,
		executing = 4,
		executed = 5;

	if(has("dojo-trace-api")){
		// these make debugging nice; but using strings for symbols is a gross rookie error; don't do it for production code
		requested = "requested";
		arrived = "arrived";
		nonmodule = "not-a-module";
		executing = "executing";
		executed = "executed";
	}

	var legacyMode = 0,
		sync = "sync",
		xd = "xd",
		syncExecStack = [],
		dojoRequirePlugin = 0,
		checkDojoRequirePlugin = noop,
		transformToAmd = noop,
		getXhr;
	if(has("dojo-sync-loader")){
		req.isXdUrl = noop;

		req.initSyncLoader = function(dojoRequirePlugin_, checkDojoRequirePlugin_, transformToAmd_){
			if(!dojoRequirePlugin){
				dojoRequirePlugin = dojoRequirePlugin_;
				checkDojoRequirePlugin = checkDojoRequirePlugin_;
				transformToAmd = transformToAmd_;
			}
			return {
				sync:sync,
				xd:xd,
				arrived:arrived,
				nonmodule:nonmodule,
				executing:executing,
				executed:executed,
				syncExecStack:syncExecStack,
				modules:modules,
				execQ:execQ,
				getModule:getModule,
				injectModule:injectModule,
				setArrived:setArrived,
				signal:signal,
				finishExec:finishExec,
				execModule:execModule,
				dojoRequirePlugin:dojoRequirePlugin,
				getLegacyMode:function(){return legacyMode;},
				holdIdle:function(){checkCompleteGuard++;},
				releaseIdle:function(){checkIdle();}
			};
		};

		if(has("dom")){
			// in legacy sync mode, the loader needs a minimal XHR library to load dojo/_base/loader and dojo/_base/xhr

			var locationProtocol = location.protocol,
				locationHost = location.host,
				fileProtocol = !locationHost;
			req.isXdUrl = function(url){
				if(fileProtocol || /^\./.test(url)){
					// begins with a dot is always relative to page URL; therefore not xdomain
					return false;
				}
				if(/^\/\//.test(url)){
					// for v1.6- backcompat, url starting with // indicates xdomain
					return true;
				}
				// get protocol and host
				var match = url.match(/^([^\/\:]+\:)\/\/([^\/]+)/);
				return match && (match[1] != locationProtocol || match[2] != locationHost);
			};

			// note: to get the file:// protocol to work in FF, you must set security.fileuri.strict_origin_policy to false in about:config
			has.add("dojo-xhr-factory", 1);
			has.add("dojo-force-activex-xhr", has("host-browser") && !doc.addEventListener && window.location.protocol == "file:");
			has.add("native-xhr", typeof XMLHttpRequest != "undefined");
			if(has("native-xhr") && !has("dojo-force-activex-xhr")){
				getXhr = function(){
					return new XMLHttpRequest();
				};
			}else{
				// if in the browser an old IE; find an xhr
				for(var XMLHTTP_PROGIDS = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'], progid, i = 0; i < 3;){
					try{
						progid = XMLHTTP_PROGIDS[i++];
						if(new ActiveXObject(progid)){
							// this progid works; therefore, use it from now on
							break;
						}
					}catch(e){
						// squelch; we're just trying to find a good ActiveX progid
						// if they all fail, then progid ends up as the last attempt and that will signal the error
						// the first time the client actually tries to exec an xhr
					}
				}
				getXhr = function(){
					return new ActiveXObject(progid);
				};
			}
			req.getXhr = getXhr;

			has.add("dojo-gettext-api", 1);
			req.getText = function(url, async, onLoad){
				var xhr = getXhr();
				xhr.open('GET', fixupUrl(url), false);
				xhr.send(null);
				if(xhr.status == 200 || (!location.host && !xhr.status)){
					if(onLoad){
						onLoad(xhr.responseText, async);
					}
				}else{
					throw makeError("xhrFailed", xhr.status);
				}
				return xhr.responseText;
			};
		}
	}else{
		req.async = 1;
	}

	//
	// loader eval
	//
	var eval_ =
		// use the function constructor so our eval is scoped close to (but not in) in the global space with minimal pollution
		new Function("__text", 'return eval(__text);');

	req.eval =
		function(text, hint){
			return eval_(text + "\r\n////@ sourceURL=" + hint);
		};

	//
	// loader micro events API
	//
	var listenerQueues = {},
		error = "error",
		signal = req.signal = function(type, args){
			var queue = listenerQueues[type];
			// notice we run a copy of the queue; this allows listeners to add/remove
			// other listeners without affecting this particular signal
			forEach(queue && queue.slice(0), function(listener){
				listener.apply(null, isArray(args) ? args : [args]);
			});
		},
		on = req.on = function(type, listener){
			// notice a queue is not created until a client actually connects
			var queue = listenerQueues[type] || (listenerQueues[type] = []);
			queue.push(listener);
			return {
				remove:function(){
					for(var i = 0; i<queue.length; i++){
						if(queue[i]===listener){
							queue.splice(i, 1);
							return;
						}
					}
				}
			};
		};

	// configuration machinery; with an optimized/built defaultConfig, all configuration machinery can be discarded
	// lexical variables hold key loader data structures to help with minification; these may be completely,
	// one-time initialized by defaultConfig for optimized/built versions
	var
		aliases
			// a vector of pairs of [regexs or string, replacement] => (alias, actual)
			= [],

		paths
			// CommonJS paths
			= {},

		pathsMapProg
			// list of (from-path, to-path, regex, length) derived from paths;
			// a "program" to apply paths; see computeMapProg
			= [],

		packs
			// a map from packageId to package configuration object; see fixupPackageInfo
			= {},

		packageMap
			// map from package name to local-installed package name
			= {},

		packageMapProg
			// list of (from-package, to-package, regex, length) derived from packageMap;
			// a "program" to apply paths; see computeMapProg
			= [],

		modules
			// A hash:(mid) --> (module-object) the module namespace
			//
			// pid: the package identifier to which the module belongs (e.g., "dojo"); "" indicates the system or default package
			// mid: the fully-resolved (i.e., mappings have been applied) module identifier without the package identifier (e.g., "dojo/io/script")
			// url: the URL from which the module was retrieved
			// pack: the package object of the package to which the module belongs
			// executed: 0 => not executed; executing => in the process of tranversing deps and running factory; executed => factory has been executed
			// deps: the dependency vector for this module (vector of modules objects)
			// def: the factory for this module
			// result: the result of the running the factory for this module
			// injected: (requested | arrived | nonmodule) the status of the module; nonmodule means the resource did not call define
			// load: plugin load function; applicable only for plugins
			//
			// Modules go through several phases in creation:
			//
			// 1. Requested: some other module's definition or a require application contained the requested module in
			//    its dependency vector or executing code explicitly demands a module via req.require.
			//
			// 2. Injected: a script element has been appended to the insert-point element demanding the resource implied by the URL
			//
			// 3. Loaded: the resource injected in [2] has been evalated.
			//
			// 4. Defined: the resource contained a define statement that advised the loader about the module. Notice that some
			//    resources may just contain a bundle of code and never formally define a module via define
			//
			// 5. Evaluated: the module was defined via define and the loader has evaluated the factory and computed a result.
			= {},

		cacheBust
			// query string to append to module URLs to bust browser cache
			= "",

		cache
			// hash:(mid)-->(function)
			//
			// Gives the contents of a cached resource; function should cause the same actions as if the given mid was downloaded
			// and evaluated by the host environment
			 = {},

		pendingCacheInsert
			// hash:(mid)-->(function)
			//
			// Gives a set of cache modules pending entry into cache. When cached modules are published to the loader, they are
			// entered into pendingCacheInsert; modules are then pressed into cache upon (1) AMD define or (2) upon receiving another
			// independent set of cached modules. (1) is the usual case, and this case allows normalizing mids given in the pending
			// cache for the local configuration, possibly relocating modules.
			 = {},

		dojoSniffConfig
			// map of configuration variables
			// give the data-dojo-config as sniffed from the document (if any)
			= {};

	if(has("dojo-config-api")){
		var consumePendingCacheInsert = function(referenceModule){
				for(var p in pendingCacheInsert){
					var match = p.match(/^url\:(.+)/);
					if(match){
						cache[toUrl(match[1], referenceModule)] =  pendingCacheInsert[p];
					}else if(p!="*noref"){
						cache[getModuleInfo(p, referenceModule).mid] = pendingCacheInsert[p];
					}
				}
				pendingCacheInsert = {};
			},

			computeMapProg = function(map, dest, packName){
				// This routine takes a map target-prefix(string)-->replacement(string) into a vector
				// of quads (target-prefix, replacement, regex-for-target-prefix, length-of-target-prefix)
				//
				// The loader contains processes that map one string prefix to another. These
				// are encountered when applying the requirejs paths configuration and when mapping
				// package names. We can make the mapping and any replacement easier and faster by
				// replacing the map with a vector of quads and then using this structure in the simple machine runMapProg.
				dest.splice(0, dest.length);
				var p, i, item, reverseName = 0;
				for(p in map){
					dest.push([p, map[p]]);
					if(map[p]==packName){
						reverseName = p;
					}
				}
				dest.sort(function(lhs, rhs){
					return rhs[0].length - lhs[0].length;
				});
				for(i = 0; i < dest.length;){
					item = dest[i++];
					item[2] = new RegExp("^" + item[0].replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, function(c){ return "\\" + c; }) + "(\/|$)");
					item[3] = item[0].length + 1;
				}
				return reverseName;
			},

			fixupPackageInfo = function(packageInfo, baseUrl){
				// calculate the precise (name, baseUrl, main, mappings) for a package
				var name = packageInfo.name;
				if(!name){
					// packageInfo must be a string that gives the name
					name = packageInfo;
					packageInfo = {name:name};
				}
				packageInfo = mix({main:"main", mapProg:[]}, packageInfo);
				packageInfo.location = (baseUrl || "") + (packageInfo.location ? packageInfo.location : name);
				packageInfo.reverseName = computeMapProg(packageInfo.packageMap, packageInfo.mapProg, name);

				if(!packageInfo.main.indexOf("./")){
					packageInfo.main = packageInfo.main.substring(2);
				}

				// allow paths to be specified in the package info
				// TODO: this is not supported; remove
				mix(paths, packageInfo.paths);

				// now that we've got a fully-resolved package object, push it into the configuration
				packs[name] = packageInfo;
				packageMap[name] = name;
			},

			config = function(config, booting){
				for(var p in config){
					if(p=="waitSeconds"){
						req.waitms = (config[p] || 0) * 1000;
					}
					if(p=="cacheBust"){
						cacheBust = config[p] ? (isString(config[p]) ? config[p] : (new Date()).getTime() + "") : "";
					}
					if(p=="baseUrl" || p=="combo"){
						req[p] = config[p];
					}
					if(has("dojo-sync-loader") && p=="async"){
						// falsy or "sync" => legacy sync loader
						// "xd" => sync but loading xdomain tree and therefore loading asynchronously (not configurable, set automatically by the loader)
						// "legacyAsync" => permanently in "xd" by choice
						// "debugAtAllCosts" => trying to load everything via script injection (not implemented)
						// otherwise, must be truthy => AMD
						// legacyMode: sync | legacyAsync | xd | false
						var mode = config[p];
						req.legacyMode = legacyMode = (isString(mode) && /sync|legacyAsync/.test(mode) ? mode : (!mode ? "sync" : false));
						req.async = !legacyMode;
					}
					if(config[p]!==hasCache){
						// accumulate raw config info for client apps which can use this to pass their own config
						req.rawConfig[p] = config[p];
						p!="has" && has.add("config-"+p, config[p], 0, booting);
					}
				}

				// make sure baseUrl exists
				if(!req.baseUrl){
					req.baseUrl = "./";
				}
				// make sure baseUrl ends with a slash
				if(!/\/$/.test(req.baseUrl)){
					req.baseUrl += "/";
				}

				// now do the special work for has, packages, packagePaths, paths, aliases, and cache

				for(p in config.has){
					has.add(p, config.has[p], 0, booting);
				}

				// for each package found in any packages config item, augment the packs map owned by the loader
				forEach(config.packages, fixupPackageInfo);

				// for each packagePath found in any packagePaths config item, augment the packs map owned by the loader
				for(baseUrl in config.packagePaths){
					forEach(config.packagePaths[baseUrl], function(packageInfo){
						fixupPackageInfo(packageInfo, baseUrl + "/");
					});
				}

				// push in any paths and recompute the internal pathmap
				// warning: this cann't be done until the package config is processed since packages may include path info
				computeMapProg(mix(paths, config.paths), pathsMapProg);

				// aliases
				forEach(config.aliases, function(pair){
					if(isString(pair[0])){
						pair[0] = new RegExp("^" + pair[0].replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, function(c){return "\\" + c;}) + "$");
					}
					aliases.push(pair);
				});

				// mix any packageMap config item and recompute the internal packageMapProg
				computeMapProg(mix(packageMap, config.packageMap), packageMapProg);

				// push in any new cache values
				if(config.cache){
					consumePendingCacheInsert();
					pendingCacheInsert = config.cache;
					if(config.cache["*noref"]){
						consumePendingCacheInsert();
					}
				}

				signal("config", [config, req.rawConfig]);
			};

		//
		// execute the various sniffs
		//

		if(has("dojo-cdn") || has("dojo-sniff")){
			for(var dojoDir, src, match, scripts = doc.getElementsByTagName("script"), i = 0; i < scripts.length && !match; i++){
				if((src = scripts[i].getAttribute("src")) && (match = src.match(/(.*)\/?dojo\.js(\W|$)/i))){
					// if baseUrl wasn't explicitly set, set it here to the dojo directory; this is the 1.6- behavior
					userConfig.baseUrl = dojoDir = userConfig.baseUrl || defaultConfig.baseUrl || match[1];

					// see if there's a dojo configuration stuffed into the node
					src = (scripts[i].getAttribute("data-dojo-config") || scripts[i].getAttribute("djConfig"));
					if(src){
						dojoSniffConfig = req.eval("({ " + src + " })", "data-dojo-config");
					}
					if(has("dojo-requirejs-api")){
						var dataMain = scripts[i].getAttribute("data-main");
						if(dataMain){
							dojoSniffConfig.deps = dojoSniffConfig.deps || [dataMain];
						}
					}
				}
			}
		}

		if(has("dojo-test-sniff")){
			// pass down doh.testConfig from parent as if it were a data-dojo-config
			try{
				if(window.parent != window && window.parent.require){
					var doh = window.parent.require("doh");
					doh && mix(dojoSniffConfig, doh.testConfig);
				}
			}catch(e){}
		}

		// configure the loader; let the user override defaults
		req.rawConfig = {};
		config(defaultConfig, 1);
		config(userConfig, 1);
		config(dojoSniffConfig, 1);

		if(has("dojo-cdn")){
			packs.dojo.location = dojoDir;
			packs.dijit.location = dojoDir + "../dijit/";
			packs.dojox.location = dojoDir + "../dojox/";
		}

	}else{
		// no config API, assume defaultConfig has everything the loader needs...for the entire lifetime of the application
		paths = defaultConfig.paths;
		pathsMapProg = defaultConfig.pathsMapProg;
		packs = defaultConfig.packs;
		aliases = defaultConfig.aliases;
		packageMap = defaultConfig.packageMap;
		packageMapProg = defaultConfig.packageMapProg;
		modules = defaultConfig.modules;
		cache = defaultConfig.cache;
		cacheBust = defaultConfig.cacheBust;

		// remember the default config for other processes (e.g., dojo/config)
		req.rawConfig = defaultConfig;
	}


	if(has("dojo-combo-api")){
		req.combo = req.combo || {add:noop};
		var	comboPending = 0,
			combosPending = [],
			comboPendingTimer = null;
	}


	// build the loader machinery iaw configuration, including has feature tests
	var	injectDependencies = function(module){
			// checkComplete!=0 holds the idle signal; we're not idle if we're injecting dependencies
			checkCompleteGuard++;
			forEach(module.deps, injectModule);
			if(has("dojo-combo-api") && comboPending && !comboPendingTimer){
				comboPendingTimer = setTimeout(function() {
					comboPending = 0;
					comboPendingTimer = null;
					req.combo.done(function(mids, url) {
						var onLoadCallback= function(){
							// defQ is a vector of module definitions 1-to-1, onto mids
							runDefQ(0, mids);
							checkComplete();
						};
						combosPending.push(mids);
						injectingModule = mids;
						req.injectUrl(url, onLoadCallback, mids);
						injectingModule = 0;
					}, req);
				}, 0);
			}
			checkIdle();
		},

		contextRequire = function(a1, a2, a3, referenceModule, contextRequire){
			var module, syntheticMid;
			if(isString(a1)){
				// signature is (moduleId)
				module = getModule(a1, referenceModule, true);
				if(module && module.executed){
					return module.result;
				}
				throw makeError("undefinedModule", a1);
			}
			if(!isArray(a1)){
				// a1 is a configuration
				config(a1);

				// juggle args; (a2, a3) may be (dependencies, callback)
				a1 = a2;
				a2 = a3;
			}
			if(isArray(a1)){
				// signature is (requestList [,callback])
				if(!a1.length){
					a2 && a2();
				}else{
					syntheticMid = "require*" + uid();

					// resolve the request list with respect to the reference module
					for(var mid, deps = [], i = 0; i < a1.length;){
						mid = a1[i++];
						if(mid in {exports:1, module:1}){
							throw makeError("illegalModuleId", mid);
						}
						deps.push(getModule(mid, referenceModule));
					}

					// construct a synthetic module to control execution of the requestList, and, optionally, callback
					module = mix(makeModuleInfo("", syntheticMid, 0, ""), {
						injected: arrived,
						deps: deps,
						def: a2 || noop,
						require: referenceModule ? referenceModule.require : req
					});
					modules[module.mid] = module;

					// checkComplete!=0 holds the idle signal; we're not idle if we're injecting dependencies
					injectDependencies(module);

					// try to immediately execute
					// if already traversing a factory tree, then strict causes circular dependency to abort the execution; maybe
					// it's possible to execute this require later after the current traversal completes and avoid the circular dependency.
					// ...but *always* insist on immediate in synch mode
					var strict = checkCompleteGuard && req.async;
					checkCompleteGuard++;
					execModule(module, strict);
					checkIdle();
					if(!module.executed){
						// some deps weren't on board or circular dependency detected and strict; therefore, push into the execQ
						execQ.push(module);
					}
					checkComplete();
				}
			}
			return contextRequire;
		},

		createRequire = function(module){
			if(!module){
				return req;
			}
			var result = module.require;
			if(!result){
				result = function(a1, a2, a3){
					return contextRequire(a1, a2, a3, module, result);
				};
				module.require = mix(result, req);
				result.module = module;
				result.toUrl = function(name){
					return toUrl(name, module);
				};
				result.toAbsMid = function(mid){
					return toAbsMid(mid, module);
				};
				if(has("dojo-undef-api")){
					result.undef = function(mid){
						req.undef(mid, module);
					};
				}
			}
			return result;
		},

		execQ =
			// The list of modules that need to be evaluated.
			[],

		defQ =
			// The queue of define arguments sent to loader.
			[],

		waiting =
			// The set of modules upon which the loader is waiting for definition to arrive
			{},

		setRequested = function(module){
			module.injected = requested;
			waiting[module.mid] = 1;
			if(module.url){
				waiting[module.url] = module.pack || 1;
			}
		},

		setArrived = function(module){
			module.injected = arrived;
			delete waiting[module.mid];
			if(module.url){
				delete waiting[module.url];
			}
			if(isEmpty(waiting)){
				clearTimer();
				has("dojo-sync-loader") && legacyMode==xd && (legacyMode = sync);
			}
		},

		execComplete = req.idle =
			// says the loader has completed (or not) its work
			function(){
				return !defQ.length && isEmpty(waiting) && !execQ.length && !checkCompleteGuard;
			},

		runMapProg = function(targetMid, map){
			// search for targetMid in map; return the map item if found; falsy otherwise
			for(var i = 0; i < map.length; i++){
				if(map[i][2].test(targetMid)){
					return map[i];
				}
			}
			return 0;
		},

		compactPath = function(path){
			var result = [],
				segment, lastSegment;
			path = path.replace(/\\/g, '/').split('/');
			while(path.length){
				segment = path.shift();
				if(segment==".." && result.length && lastSegment!=".."){
					result.pop();
					lastSegment = result[result.length - 1];
				}else if(segment!="."){
					result.push(lastSegment= segment);
				} // else ignore "."
			}
			return result.join("/");
		},

		makeModuleInfo = function(pid, mid, pack, url, cacheId){
			if(has("dojo-sync-loader")){
				var xd= req.isXdUrl(url);
				return {pid:pid, mid:mid, pack:pack, url:url, executed:0, def:0, isXd:xd, isAmd:!!(xd || (packs[pid] && packs[pid].isAmd)), cacheId:cacheId};
			}else{
				return {pid:pid, mid:mid, pack:pack, url:url, executed:0, def:0, cacheId:cacheId};
			}
		},

		getModuleInfo_ = function(mid, referenceModule, packs, modules, baseUrl, packageMapProg, pathsMapProg, alwaysCreate){
			// arguments are passed instead of using lexical variables so that this function my be used independent of the loader (e.g., the builder)
			// alwaysCreate is useful in this case so that getModuleInfo never returns references to real modules owned by the loader
			var pid, pack, midInPackage, mapProg, mapItem, path, url, result, isRelative, requestedMid, cacheId=0;
			requestedMid = mid;
			isRelative = /^\./.test(mid);
			if(/(^\/)|(\:)|(\.js$)/.test(mid) || (isRelative && !referenceModule)){
				// absolute path or protocol of .js filetype, or relative path but no reference module and therefore relative to page
				// whatever it is, it's not a module but just a URL of some sort
				return makeModuleInfo(0, mid, 0, mid);
			}else{
				// relative module ids are relative to the referenceModule; get rid of any dots
				mid = compactPath(isRelative ? (referenceModule.mid + "/../" + mid) : mid);
				if(/^\./.test(mid)){
					throw makeError("irrationalPath", mid);
				}
				// find the package indicated by the mid, if any
				mapProg = referenceModule && referenceModule.pack && referenceModule.pack.mapProg;
				mapItem = (mapProg && runMapProg(mid, mapProg)) || runMapProg(mid, packageMapProg);
				if(mapItem){
					// mid specified a module that's a member of a package; figure out the package id and module id
					// notice we expect pack.main to be valid with no pre or post slash
					pid = mapItem[1];
					mid = mid.substring(mapItem[3]);
					pack = packs[pid];
					if(!mid){
						mid= pack.main;
					}
					midInPackage = mid;
					cacheId = pack.reverseName + "/" + mid;
					mid = pid + "/" + mid;
				}else{
					pid = "";
				}

				// search aliases
				var candidateLength = 0,
					candidate = 0;
				forEach(aliases, function(pair){
					var match = mid.match(pair[0]);
					if(match && match.length>candidateLength){
						candidate = isFunction(pair[1]) ? mid.replace(pair[0], pair[1]) : pair[1];
					}
				});
				if(candidate){
					return getModuleInfo_(candidate, 0, packs, modules, baseUrl, packageMapProg, pathsMapProg, alwaysCreate);
				}

				result = modules[mid];
				if(result){
					return alwaysCreate ? makeModuleInfo(result.pid, result.mid, result.pack, result.url, cacheId) : modules[mid];
				}
			}
			// get here iff the sought-after module does not yet exist; therefore, we need to compute the URL given the
			// fully resolved (i.e., all relative indicators and package mapping resolved) module id

			mapItem = runMapProg(mid, pathsMapProg);
			if(mapItem){
				url = mapItem[1] + mid.substring(mapItem[3] - 1);
			}else if(pid){
				url = pack.location + "/" + midInPackage;
			}else if(has("config-tlmSiblingOfDojo")){
				url = "../" + mid;
			}else{
				url = mid;
			}
			// if result is not absolute, add baseUrl
			if(!(/(^\/)|(\:)/.test(url))){
				url = baseUrl + url;
			}
			url += ".js";
			return makeModuleInfo(pid, mid, pack, compactPath(url), cacheId);
		},

		getModuleInfo = function(mid, referenceModule){
			return getModuleInfo_(mid, referenceModule, packs, modules, req.baseUrl, packageMapProg, pathsMapProg);
		},

		resolvePluginResourceId = function(plugin, prid, referenceModule){
			return plugin.normalize ? plugin.normalize(prid, function(mid){return toAbsMid(mid, referenceModule);}) : toAbsMid(prid, referenceModule);
		},

		dynamicPluginUidGenerator = 0,

		getModule = function(mid, referenceModule, immediate){
			// compute and optionally construct (if necessary) the module implied by the mid with respect to referenceModule
			var match, plugin, prid, result;
			match = mid.match(/^(.+?)\!(.*)$/);
			if(match){
				// name was <plugin-module>!<plugin-resource-id>
				plugin = getModule(match[1], referenceModule, immediate);

				if(has("dojo-sync-loader") && legacyMode == sync && !plugin.executed){
					injectModule(plugin);
					if(plugin.injected===arrived && !plugin.executed){
						checkCompleteGuard++;
						execModule(plugin);
						checkIdle();
					}
					if(plugin.executed){
						promoteModuleToPlugin(plugin);
					}else{
						// we are in xdomain mode for some reason
						execQ.unshift(plugin);
					}
				}



				if(plugin.executed === executed && !plugin.load){
					// executed the module not knowing it was a plugin
					promoteModuleToPlugin(plugin);
				}

				// if the plugin has not been loaded, then can't resolve the prid and  must assume this plugin is dynamic until we find out otherwise
				if(plugin.load){
					prid = resolvePluginResourceId(plugin, match[2], referenceModule);
					mid = (plugin.mid + "!" + (plugin.dynamic ? ++dynamicPluginUidGenerator + "!" : "") + prid);
				}else{
					prid = match[2];
					mid = plugin.mid + "!" + (++dynamicPluginUidGenerator) + "!waitingForPlugin";
				}
				result = {plugin:plugin, mid:mid, req:createRequire(referenceModule), prid:prid};
			}else{
				result = getModuleInfo(mid, referenceModule);
			}
			return modules[result.mid] || (!immediate && (modules[result.mid] = result));
		},

		toAbsMid = req.toAbsMid = function(mid, referenceModule){
			return getModuleInfo(mid, referenceModule).mid;
		},

		toUrl = req.toUrl = function(name, referenceModule){
			// name must include a filetype; fault tolerate to allow no filetype (but things like "path/to/version2.13" will assume filetype of ".13")
			var	match = name.match(/(.+)(\.[^\/\.]+?)$/),
				root = (match && match[1]) || name,
				ext = (match && match[2]) || "",
				moduleInfo = getModuleInfo(root, referenceModule),
				url= moduleInfo.url;
			// recall, getModuleInfo always returns a url with a ".js" suffix iff pid; therefore, we've got to trim it
			url= typeof moduleInfo.pid == "string" ? url.substring(0, url.length - 3) : url;
			return fixupUrl(url + ext);
		},

		nonModuleProps = {
			injected: arrived,
			executed: executed,
			def: nonmodule,
			result: nonmodule
		},

		makeCjs = function(mid){
			return modules[mid] = mix({mid:mid}, nonModuleProps);
		},

		cjsRequireModule = makeCjs("require"),
		cjsExportsModule = makeCjs("exports"),
		cjsModuleModule = makeCjs("module"),

		runFactory = function(module, args){
			req.trace("loader-run-factory", [module.mid]);
			var factory = module.def,
				result;
			has("dojo-sync-loader") && syncExecStack.unshift(module);
			if(has("config-dojo-loader-catches")){
				try{
					result= isFunction(factory) ? factory.apply(null, args) : factory;
				}catch(e){
					signal(error, module.result = makeError("factoryThrew", [module, e]));
				}
			}else{
				result= isFunction(factory) ? factory.apply(null, args) : factory;
			}
			module.result = result===undefined && module.cjs ? module.cjs.exports : result;
			has("dojo-sync-loader") && syncExecStack.shift(module);
		},

		abortExec = {},

		defOrder = 0,

		promoteModuleToPlugin = function(pluginModule){
			var plugin = pluginModule.result;
			pluginModule.dynamic = plugin.dynamic;
			pluginModule.normalize = plugin.normalize;
			pluginModule.load = plugin.load;
			return pluginModule;
		},

		resolvePluginLoadQ = function(plugin){
			// plugins is a newly executed module that has a loadQ waiting to run

			// step 1: traverse the loadQ and fixup the mid and prid; remember the map from original mid to new mid
			// recall the original mid was created before the plugin was on board and therefore it was impossible to
			// compute the final mid; accordingly, prid may or may not change, but the mid will definitely change
			var map = {};
			forEach(plugin.loadQ, function(pseudoPluginResource){
				// manufacture and insert the real module in modules
				var pseudoMid = pseudoPluginResource.mid,
					prid = resolvePluginResourceId(plugin, pseudoPluginResource.prid, pseudoPluginResource.req.module),
					mid = plugin.dynamic ? pseudoPluginResource.mid.replace(/waitingForPlugin$/, prid) : (plugin.mid + "!" + prid),
					pluginResource = mix(mix({}, pseudoPluginResource), {mid:mid, prid:prid, injected:0});
				if(!modules[mid]){
					// create a new (the real) plugin resource and inject it normally now that the plugin is on board
					injectPlugin(modules[mid] = pluginResource);
				} // else this was a duplicate request for the same (plugin, rid) for a nondynamic plugin

				// pluginResource is really just a placeholder with the wrong mid (because we couldn't calculate it until the plugin was on board)
				// mark is as arrived and delete it from modules; the real module was requested above
				map[pseudoPluginResource.mid] = modules[mid];
				setArrived(pseudoPluginResource);
				delete modules[pseudoPluginResource.mid];
			});
			plugin.loadQ = 0;

			// step2: replace all references to any placeholder modules with real modules
			var substituteModules = function(module){
				for(var replacement, deps = module.deps || [], i = 0; i<deps.length; i++){
					replacement = map[deps[i].mid];
					if(replacement){
						deps[i] = replacement;
					}
				}
			};
			for(var p in modules){
				substituteModules(modules[p]);
			}
			forEach(execQ, substituteModules);
		},

		finishExec = function(module){
			req.trace("loader-finish-exec", [module.mid]);
			module.executed = executed;
			module.defOrder = defOrder++;
			has("dojo-sync-loader") && forEach(module.provides, function(cb){ cb(); });
			if(module.loadQ){
				// the module was a plugin
				promoteModuleToPlugin(module);
				resolvePluginLoadQ(module);
			}
			// remove all occurences of this module from the execQ
			for(i = 0; i < execQ.length;){
				if(execQ[i] === module){
					execQ.splice(i, 1);
				}else{
					i++;
				}
			}
		},

		circleTrace = [],

		execModule = function(module, strict){
			// run the dependency vector, then run the factory for module
			if(module.executed === executing){
				req.trace("loader-circular-dependency", [circleTrace.concat(mid).join("->")]);
				return (!module.def || strict) ? abortExec :  (module.cjs && module.cjs.exports);
			}
			// at this point the module is either not executed or fully executed


			if(!module.executed){
				if(!module.def){
					return abortExec;
				}
				var mid = module.mid,
					deps = module.deps || [],
					arg, argResult,
					args = [],
					i = 0;

				if(has("dojo-trace-api")){
					circleTrace.push(mid);
					req.trace("loader-exec-module", ["exec", circleTrace.length, mid]);
				}

				// for circular dependencies, assume the first module encountered was executed OK
				// modules that circularly depend on a module that has not run its factory will get
				// the premade cjs.exports===module.result. They can take a reference to this object and/or
				// add properties to it. When the module finally runs its factory, the factory can
				// read/write/replace this object. Notice that so long as the object isn't replaced, any
				// reference taken earlier while walking the deps list is still valid.
				module.executed = executing;
				while(i < deps.length){
					arg = deps[i++];
					argResult = ((arg === cjsRequireModule) ? createRequire(module) :
									((arg === cjsExportsModule) ? module.cjs.exports :
										((arg === cjsModuleModule) ? module.cjs :
											execModule(arg, strict))));
					if(argResult === abortExec){
						module.executed = 0;
						req.trace("loader-exec-module", ["abort", mid]);
						has("dojo-trace-api") && circleTrace.pop();
						return abortExec;
					}
					args.push(argResult);
				}
				runFactory(module, args);
				finishExec(module);
			}
			// at this point the module is guaranteed fully executed

			has("dojo-trace-api") && circleTrace.pop();
			return module.result;
		},


		checkCompleteGuard =  0,

		checkComplete = function(){
			// keep going through the execQ as long as at least one factory is executed
			// plugins, recursion, cached modules all make for many execution path possibilities
			if(checkCompleteGuard){
				return;
			}
			checkCompleteGuard++;
			checkDojoRequirePlugin();
			for(var currentDefOrder, module, i = 0; i < execQ.length;){
				currentDefOrder = defOrder;
				module = execQ[i];
				execModule(module);
				if(currentDefOrder!=defOrder){
					// defOrder was bumped one or more times indicating something was executed (note, this indicates
					// the execQ was modified, maybe a lot (for example a later module causes an earlier module to execute)
					checkDojoRequirePlugin();
					i = 0;
				}else{
					// nothing happened; check the next module in the exec queue
					i++;
				}
			}
			checkIdle();
		},

		checkIdle = function(){
			checkCompleteGuard--;
			if(execComplete()){
				signal("idle", []);
			}
		};


	if(has("dojo-undef-api")){
		req.undef = function(moduleId, referenceModule){
			// In order to reload a module, it must be undefined (this routine) and then re-requested.
			// This is useful for testing frameworks (at least).
			var module = getModule(moduleId, referenceModule);
			setArrived(module);
			delete modules[module.mid];
		};
	}

	if(has("dojo-inject-api")){
		if(has("dojo-loader-eval-hint-url")===undefined){
			has.add("dojo-loader-eval-hint-url", 1);
		}

		var fixupUrl= function(url){
				url += ""; // make sure url is a Javascript string (some paths may be a Java string)
				return url + (cacheBust ? ((/\?/.test(url) ? "&" : "?") + cacheBust) : "");
			},

			injectPlugin = function(
				module
			){
				// injects the plugin module given by module; may have to inject the plugin itself
				var plugin = module.plugin;

				if(plugin.executed === executed && !plugin.load){
					// executed the module not knowing it was a plugin
					promoteModuleToPlugin(plugin);
				}

				var onLoad = function(def){
						module.result = def;
						setArrived(module);
						finishExec(module);
						checkComplete();
					};

				setRequested(module);
				if(plugin.load){
					plugin.load(module.prid, module.req, onLoad);
				}else if(plugin.loadQ){
					plugin.loadQ.push(module);
				}else{
					// the unshift instead of push is important: we don't want plugins to execute as
					// dependencies of some other module because this may cause circles when the plugin
					// loadQ is run; also, generally, we want plugins to run early since they may load
					// several other modules and therefore can potentially unblock many modules
					execQ.unshift(plugin);
					injectModule(plugin);

					// maybe the module was cached and is now defined...
					if(plugin.load){
						plugin.load(module.prid, module.req, onLoad);
					}else{
						// nope; queue up the plugin resource to be loaded after the plugin module is loaded
						plugin.loadQ = [module];
					}
				}
			},

			// for IE, injecting a module may result in a recursive execution if the module is in the cache

			cached = 0,

			injectingModule = 0,

			injectingCachedModule = 0,

			evalModuleText = function(text, module){
				// see def() for the injectingCachedModule bracket; it simply causes a short, safe curcuit
				injectingCachedModule = 1;
				if(has("config-dojo-loader-catches")){
					try{
						if(text===cached){
							cached.call(null);
						}else{
							req.eval(text, has("dojo-loader-eval-hint-url") ? module.url : module.mid);
						}
					}catch(e){
						signal(error, makeError("evalModuleThrew", module));
					}
				}else{
					if(text===cached){
						cached.call(null);
					}else{
						req.eval(text, has("dojo-loader-eval-hint-url") ? module.url : module.mid);
					}
				}
				injectingCachedModule = 0;
			},

			injectModule = function(module){
				// Inject the module. In the browser environment, this means appending a script element into
				// the document; in other environments, it means loading a file.
				//
				// If in synchronous mode, then get the module synchronously if it's not xdomainLoading.

				var mid = module.mid,
					url = module.url;
				if(module.executed || module.injected || waiting[mid] || (module.url && ((module.pack && waiting[module.url]===module.pack) || waiting[module.url]==1))){
					return;
				}

				if(has("dojo-combo-api")){
					var viaCombo = 0;
					if(module.plugin && module.plugin.isCombo){
						// a combo plugin; therefore, must be handled by combo service
						// the prid should have already been converted to a URL (if required by the plugin) during
						// the normalze process; in any event, there is no way for the loader to know how to
						// to the conversion; therefore the third argument is zero
						req.combo.add(module.plugin.mid, module.prid, 0, req);
						viaCombo = 1;
					}else if(!module.plugin){
						viaCombo = req.combo.add(0, module.mid, module.url, req);
					}
					if(viaCombo){
						setRequested(module);
						comboPending= 1;
						return;
					}
				}

				if(module.plugin){
					injectPlugin(module);
					return;
				} // else a normal module (not a plugin)

				setRequested(module);

				var onLoadCallback = function(){
					runDefQ(module);
					if(module.injected !== arrived){
						// the script that contained the module arrived and has been executed yet
						// nothing was added to the defQ (so it wasn't an AMD module) and the module
						// wasn't marked as arrived by dojo.provide (so it wasn't a v1.6- module);
						// therefore, it must not have been a module; adjust state accordingly
						setArrived(module);
						mix(module, nonModuleProps);
					}

					if(has("dojo-sync-loader") && legacyMode){
						// must call checkComplete even in for sync loader because we may be in xdomainLoading mode;
						// but, if xd loading, then don't call checkComplete until out of the current sync traversal
						// in order to preserve order of execution of the dojo.required modules
						!syncExecStack.length && checkComplete();
					}else{
						checkComplete();
					}
				};
				cached = cache[mid] || cache[module.cacheId];
				if(cached){
					req.trace("loader-inject", ["cache", module.mid, url]);
					evalModuleText(cached, module);
					onLoadCallback();
					return;
				}
				if(has("dojo-sync-loader") && legacyMode){
					if(module.isXd){
						// switch to async mode temporarily; if current legacyMode!=sync, then is must be one of {legacyAsync, xd, false}
						legacyMode==sync && (legacyMode = xd);
						// fall through and load via script injection
					}else if(module.isAmd && legacyMode!=sync){
						// fall through and load via script injection
					}else{
						// mode may be sync, xd/legacyAsync, or async; module may be AMD or legacy; but module is always located on the same domain
						var xhrCallback = function(text){
							if(legacyMode==sync){
								// the top of syncExecStack gives the current synchronously executing module; the loader needs
								// to know this if it has to switch to async loading in the middle of evaluating a legacy module
								// this happens when a modules dojo.require's a module that must be loaded async because it's xdomain
								// (using unshift/shift because there is no back() methods for Javascript arrays)
								syncExecStack.unshift(module);
								evalModuleText(text, module);
								syncExecStack.shift();

								// maybe the module was an AMD module
								runDefQ(module);

								// legacy modules never get to defineModule() => cjs and injected never set; also evaluation implies executing
								if(!module.cjs){
									setArrived(module);
									finishExec(module);
								}

								if(module.finish){
									// while synchronously evaluating this module, dojo.require was applied referencing a module
									// that had to be loaded async; therefore, the loader stopped answering all dojo.require
									// requests so they could be answered completely in the correct sequence; module.finish gives
									// the list of dojo.requires that must be re-applied once all target modules are available;
									// make a synthetic module to execute the dojo.require's in the correct order

									// compute a guarnateed-unique mid for the synthetic finish module; remember the finish vector; remove it from the reference module
									// TODO: can we just leave the module.finish...what's it hurting?
									var finishMid = mid + "*finish",
										finish = module.finish;
									delete module.finish;

									def(finishMid, ["dojo", ("dojo/require!" + finish.join(",")).replace(/\./g, "/")], function(dojo){
										forEach(finish, function(mid){ dojo.require(mid); });
									});
									// unshift, not push, which causes the current traversal to be reattempted from the top
									execQ.unshift(getModule(finishMid));
								}
								onLoadCallback();
							}else{
								text = transformToAmd(module, text);
								if(text){
									evalModuleText(text, module);
									onLoadCallback();
								}else{
									// if transformToAmd returned falsy, then the module was already AMD and it can be script-injected
									// do so to improve debugability(even though it means another download...which probably won't happen with a good browser cache)
									injectingModule = module;
									req.injectUrl(fixupUrl(url), onLoadCallback, module);
									injectingModule = 0;
								}
							}
						};

						req.trace("loader-inject", ["xhr", module.mid, url, legacyMode!=sync]);
						if(has("config-dojo-loader-catches")){
							try{
								req.getText(url, legacyMode!=sync, xhrCallback);
							}catch(e){
								signal(error, makeError("xhrInjectFailed", [module, e]));
							}
						}else{
							req.getText(url, legacyMode!=sync, xhrCallback);
						}
						return;
					}
				} // else async mode or fell through in xdomain loading mode; either way, load by script injection
				req.trace("loader-inject", ["script", module.mid, url]);
				injectingModule = module;
				req.injectUrl(fixupUrl(url), onLoadCallback, module);
				injectingModule = 0;
			},

			defineModule = function(module, deps, def){
				req.trace("loader-define-module", [module.mid, deps]);

				if(has("dojo-combo-api") && module.plugin && module.plugin.isCombo){
					// the module is a plugin resource loaded by the combo service
					// note: check for module.plugin should be enough since normal plugin resources should
					// not follow this path; module.plugin.isCombo is future-proofing belt and suspenders
					module.result = isFunction(def) ? def() : def;
					setArrived(module);
					finishExec(module);
					return module;
				};

				var mid = module.mid;
				if(module.injected === arrived){
					signal(error, makeError("multipleDefine", module));
					return module;
				}
				mix(module, {
					deps: deps,
					def: def,
					cjs: {
						id: module.mid,
						uri: module.url,
						exports: (module.result = {}),
						setExports: function(exports){
							module.cjs.exports = exports;
						}
					}
				});

				// resolve deps with respect to this module
				for(var i = 0; i < deps.length; i++){
					deps[i] = getModule(deps[i], module);
				}

				if(has("dojo-sync-loader") && legacyMode && !waiting[mid]){
					// the module showed up without being asked for; it was probably in a <script> element
					injectDependencies(module);
					execQ.push(module);
					checkComplete();
				}
				setArrived(module);

				if(!isFunction(def) && !deps.length){
					module.result = def;
					finishExec(module);
				}

				return module;
			},

			runDefQ = function(referenceModule, mids){
				// defQ is an array of [id, dependencies, factory]
				// mids (if any) is a vector of mids given by a combo service
				consumePendingCacheInsert(referenceModule);
				var definedModules = [],
					module, args;
				while(defQ.length){
					args = defQ.shift();
					mids && (args[0]= mids.shift());
					// explicit define indicates possible multiple modules in a single file; delay injecting dependencies until defQ fully
					// processed since modules earlier in the queue depend on already-arrived modules that are later in the queue
					// TODO: what if no args[0] and no referenceModule
					module = args[0] && getModule(args[0]) || referenceModule;
					definedModules.push(defineModule(module, args[1], args[2]));
				}
				forEach(definedModules, injectDependencies);
			};
	}

	var timerId = 0,
		clearTimer = noop,
		startTimer = noop;
	if(has("dojo-timeout-api")){
		// Timer machinery that monitors how long the loader is waiting and signals an error when the timer runs out.
		clearTimer = function(){
			timerId && clearTimeout(timerId);
			timerId = 0;
		},

		startTimer = function(){
			clearTimer();
			req.waitms && (timerId = setTimeout(function(){
					clearTimer();
					signal(error, makeError("timeout", waiting));
			}, req.waitms));
		};
	}

	if(has("dom")){
		has.add("ie-event-behavior", doc.attachEvent && (typeof opera === "undefined" || opera.toString() != "[object Opera]"));
	}

	if(has("dom") && (has("dojo-inject-api") || has("dojo-dom-ready-api"))){
		var domOn = function(node, eventName, ieEventName, handler){
				// Add an event listener to a DOM node using the API appropriate for the current browser;
				// return a function that will disconnect the listener.
				if(!has("ie-event-behavior")){
					node.addEventListener(eventName, handler, false);
					return function(){
						node.removeEventListener(eventName, handler, false);
					};
				}else{
					node.attachEvent(ieEventName, handler);
					return function(){
						node.detachEvent(ieEventName, handler);
					};
				}
			},
			windowOnLoadListener = domOn(window, "load", "onload", function(){
				req.pageLoaded = 1;
				doc.readyState!="complete" && (doc.readyState = "complete");
				windowOnLoadListener();
			});

		if(has("dojo-inject-api")){
			// if the loader is on the page, there must be at least one script element
			// getting its parent and then doing insertBefore solves the "Operation Aborted"
			// error in IE from appending to a node that isn't properly closed; see
			// dojo/tests/_base/loader/requirejs/simple-badbase.html for an example
			var sibling = doc.getElementsByTagName("script")[0],
				insertPoint= sibling.parentNode;
			req.injectUrl = function(url, callback, owner){
				// insert a script element to the insert-point element with src=url;
				// apply callback upon detecting the script has loaded.

				startTimer();
				var node = owner.node = doc.createElement("script"),
					onLoad = function(e){
						e = e || window.event;
						var node = e.target || e.srcElement;
						if(e.type === "load" || /complete|loaded/.test(node.readyState)){
							disconnector();
							callback && callback();
						}
					},
					disconnector = domOn(node, "load", "onreadystatechange", onLoad);
				node.type = "text/javascript";
				node.charset = "utf-8";
				node.src = url;
				insertPoint.insertBefore(node, sibling);
				return node;
			};
		}
	}

	if(has("dojo-log-api")){
		req.log = function(){
			try{
				for(var i = 0; i < arguments.length; i++){
					console.log(arguments[i]);
				}
			}catch(e){}
		};
	}else{
		req.log = noop;
	}

	if(has("dojo-trace-api")){
		var trace = req.trace = function(
			group,	// the trace group to which this application belongs
			args	// the contents of the trace
		){
			///
			// Tracing interface by group.
			//
			// Sends the contents of args to the console iff (req.trace.on && req.trace[group])

			if(trace.on && trace.group[group]){
				signal("trace", [group, args]);
				for(var arg, dump = [], text= "trace:" + group + (args.length ? (":" + args[0]) : ""), i= 1; i<args.length;){
					arg = args[i++];
					if(isString(arg)){
						text += ", " + arg;
					}else{
						dump.push(arg);
					}
				}
				req.log(text);
				dump.length && dump.push(".");
				req.log.apply(req, dump);
			}
		};
		mix(trace, {
			on:1,
			group:{},
			set:function(group, value){
				if(isString(group)){
					trace.group[group]= value;
				}else{
					mix(trace.group, group);
				}
			}
		});
		trace.set(mix(mix(mix({}, defaultConfig.trace), userConfig.trace), dojoSniffConfig.trace));
		on("config", function(config){
			config.trace && trace.set(config.trace);
		});
	}else{
		req.trace = noop;
	}

	var def = function(
		mid,		  //(commonjs.moduleId, optional) list of modules to be loaded before running factory
		dependencies, //(array of commonjs.moduleId, optional)
		factory		  //(any)
	){
		///
		// Advises the loader of a module factory. //Implements http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition.
		///
		//note
		// CommonJS factory scan courtesy of http://requirejs.org

		var arity = arguments.length,
			args = 0,
			defaultDeps = ["require", "exports", "module"];

		if(has("dojo-amd-factory-scan")){
			if(arity == 1 && isFunction(mid)){
				dependencies = [];
				mid.toString()
					.replace(/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg, "")
					.replace(/require\(["']([\w\!\-_\.\/]+)["']\)/g, function (match, dep){
					dependencies.push(dep);
				});
				args = [0, defaultDeps.concat(dependencies), mid];
			}
		}
		if(!args){
			args = arity == 1 ? [0, defaultDeps, mid] :
				(arity == 2 ? (isArray(mid) ? [0, mid, dependencies] : (isFunction(dependencies) ? [mid, defaultDeps, dependencies] : [mid, [], dependencies])) :
					[mid, dependencies, factory]);
		}
		req.trace("loader-define", args.slice(0, 2));
		var targetModule = args[0] && getModule(args[0]),
			module;
		if(targetModule && !waiting[targetModule.mid]){
			// given a mid that hasn't been requested; therefore, defined through means other than injecting
			// consequent to a require() or define() application; examples include defining modules on-the-fly
			// due to some code path or including a module in a script element. In any case,
			// there is no callback waiting to finish processing and nothing to trigger the defQ and the
			// dependencies are never requested; therefore, do it here.
			injectDependencies(defineModule(targetModule, args[1], args[2]));
		}else if(!has("ie-event-behavior") || !has("host-browser") || injectingCachedModule){
			// not IE path: anonymous module and therefore must have been injected; therefore, onLoad will fire immediately
			// after script finishes being evaluated and the defQ can be run from that callback to detect the module id
			defQ.push(args);
		}else{
			// IE path: possibly anonymous module and therefore injected; therefore, cannot depend on 1-to-1,
			// in-order exec of onLoad with script eval (since it's IE) and must manually detect here
			targetModule = targetModule || injectingModule;
			if(!targetModule){
				for(mid in waiting){
					module = modules[mid];
					if(module && module.node && module.node.readyState === 'interactive'){
						targetModule = module;
						break;
					}
				}
				if(has("dojo-combo-api") && !targetModule){
					for(var i = 0; i<combosPending.length; i++){
						targetModule = combosPending[i];
						if(targetModule.node && targetModule.node.readyState === 'interactive'){
							break;
						}
						targetModule= 0;
					}
				}
			}
			if(has("dojo-combo-api") && isArray(targetModule)){
				injectDependencies(defineModule(getModule(targetModule.shift()), args[1], args[2]));
				if(!targetModule.length){
					combosPending.splice(i, 1);
				}
			}else if(targetModule){
				consumePendingCacheInsert(targetModule);
				injectDependencies(defineModule(targetModule, args[1], args[2]));
			}else{
				signal(error, makeError("ieDefineFailed", args[0]));
			}
			checkComplete();
		}
	};
	def.amd = {
		vendor:"dojotoolkit.org"
	};

	if(has("dojo-requirejs-api")){
		req.def = def;
	}

	// allow config to override default implemention of named functions; this is useful for
	// non-browser environments, e.g., overriding injectUrl, getText, log, etc. in node.js, Rhino, etc.
	// also useful for testing and monkey patching loader
	mix(mix(req, defaultConfig.loaderPatch), userConfig.loaderPatch);

	// now that req is fully initialized and won't change, we can hook it up to the error signal
	on(error, function(arg){
		try{
			console.error(arg);
			if(arg instanceof Error){
				for(var p in arg){
					console.log(p + ":", arg[p]);
				}
				console.log(".");
			}
		}catch(e){}
	});

	// always publish these
	mix(req, {
		uid:uid,
		cache:cache,
		packs:packs
	});


	if(has("dojo-publish-privates")){
		mix(req, {
			// these may be interesting to look at when debugging
			paths:paths,
			aliases:aliases,
			packageMap:packageMap,
			modules:modules,
			legacyMode:legacyMode,
			execQ:execQ,
			defQ:defQ,
			waiting:waiting,

			// these are used for testing
			// TODO: move testing infrastructure to a different has feature
			pathsMapProg:pathsMapProg,
			packageMapProg:packageMapProg,
			listenerQueues:listenerQueues,

			// these are used by the builder (at least)
			computeMapProg:computeMapProg,
			runMapProg:runMapProg,
			compactPath:compactPath,
			getModuleInfo:getModuleInfo_
		});
	}

	// the loader can be defined exactly once; look for global define which is the symbol AMD loaders are
	// *required* to define (as opposed to require, which is optional)
	if(global.define){
		if(has("dojo-log-api")){
			signal(error, makeError("defineAlreadyDefined", 0));
		}
	}else{
		global.define = def;
		global.require = req;
	}

	if(has("dojo-combo-api") && req.combo && req.combo.plugins){
		var plugins = req.combo.plugins,
			pluginName;
		for(pluginName in plugins){
			mix(mix(getModule(pluginName), plugins[pluginName]), {isCombo:1, executed:"executed", load:1});
		}
	}

	if(has("dojo-config-api")){
		var bootDeps = defaultConfig.deps || userConfig.deps || dojoSniffConfig.deps,
			bootCallback = defaultConfig.callback || userConfig.callback || dojoSniffConfig.callback;
		req.boot = (bootDeps || bootCallback) ? [bootDeps || [], bootCallback] : 0;
	}
	if(!has("dojo-built")){
		!req.async && req(["dojo"]);
		req.boot && req.apply(null, req.boot);
	}
})
//>>excludeStart("replaceLoaderConfig", kwArgs.replaceLoaderConfig);
(
	// userConfig
	(function(){
		// make sure we're looking at global dojoConfig etc.
		return this.dojoConfig || this.djConfig || this.require || {};
	})(),

	// defaultConfig
	{
		// the default configuration for a browser; this will be modified by other environments
		hasCache:{
			"host-browser":1,
			"dom":1,
			"dojo-amd-factory-scan":1,
			"dojo-loader":1,
			"dojo-has-api":1,
			"dojo-inject-api":1,
			"dojo-timeout-api":1,
			"dojo-trace-api":1,
			"dojo-log-api":1,
			"dojo-dom-ready-api":1,
			"dojo-publish-privates":1,
			"dojo-config-api":1,
			"dojo-sniff":1,
			"dojo-sync-loader":1,
			"dojo-test-sniff":1,
			"config-tlmSiblingOfDojo":1
		},
		packages:[{
			// note: like v1.6-, this bootstrap computes baseUrl to be the dojo directory
			name:'dojo',
			location:'.'
		},{
			name:'tests',
			location:'./tests'
		},{
			name:'dijit',
			location:'../dijit'
		},{
			name:'build',
			location:'../util/build'
		},{
			name:'doh',
			location:'../util/doh'
		},{
			name:'dojox',
			location:'../dojox'
		},{
			name:'demos',
			location:'../demos'
		}],
		trace:{
			// these are listed so it's simple to turn them on/off while debugging loading
			"loader-inject":0,
			"loader-define":0,
			"loader-exec-module":0,
			"loader-run-factory":0,
			"loader-finish-exec":0,
			"loader-define-module":0,
			"loader-circular-dependency":0
		},
		async:0,
		waitSeconds:15
	}
);
//>>excludeEnd("replaceLoaderConfig")

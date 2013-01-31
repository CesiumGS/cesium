define([
	"require",
	"dojo/_base/lang",
	"./argv",
	"./fs",
	"./fileUtils",
	"./buildControlDefault",
	"./v1xProfiles",
	"./stringify",
	"./process",
	"./messages",
	"dojo/text!./help.txt"
], function(require, lang, argv, fs, fileUtils, bc, v1xProfiles, stringify, process, messages, helpText){
	//
	// Process the arguments given on the command line to build up a profile object that is used to instruct and control
	// the build process.
	//
	// This modules is a bit tedious. Is methodically goes through each option set, cleaning and conditioning user input making it
	// easy to use for the remainder of the program. Readers are advised to tackle it top-to-bottom. There is no magic...just
	// a whole bunch of imperative programming.
	//

	if(!isNaN(argv)){
		// if argv is a number, then it's an exit code
		bc.exitCode = argv;
		return bc;
	}

	eval(require.scopeify("./fs, ./fileUtils, ./v1xProfiles"));
	var
		isString = function(it){
			return typeof it === "string";
		},

		isNonemptyString = function(it){
			return isString(it) && it.length;
		},

		isDefined = function(it){
			return typeof it !="undefined";
		},

		cleanupFilenamePair = function(item, srcBasePath, destBasePath, hint){
			var result;
			if(isString(item)){
				result = [computePath(item, srcBasePath), computePath(item, destBasePath)];
			}else{
				result = [computePath(item[0], srcBasePath), computePath(item[1], destBasePath)].concat(item.slice(2));
			}
			if(!isAbsolutePath(result[0]) || !isAbsolutePath(result[1])){
				bc.log("inputInvalidPath", ["path", item, "hint", hint]);
			}
			return result;
		},

		slashTerminate = function(path){
			return path + /\/$/.test(path) ? "" : "/";
		},

		isEmpty = function(it){
			for(var p in it) return false;
			return true;
		},

		cleanDeprecated = function(o, inputFile){
			var deprecated = [];
			for(p in o){
				if(/^(log|loader|xdDojoPath|scopeDjConfig|xdScopeArgs|xdDojoScopeName|expandProvide|buildLayers|query|removeDefaultNameSpaces|addGuards)$/.test(p)){
					deprecated.push(p);
					bc.log("inputDeprecated", ["switch", p, inputFile]);
				}
			}
			deprecated.forEach(function(p){
				delete o[p];
			});
		},

		mix = function(dest, src){
			dest = dest || {};
			src = src || {};
			for(var p in src) dest[p] = src[p];
			return dest;
		},

		mixPackage = function(packageInfo){
			var name = packageInfo.name;
			bc.packageMap[name] = mix(bc.packageMap[name], packageInfo);
		},

		// mix a profile object into the global profile object
		mixProfileObject = function(src){
			cleanDeprecated(src, src.selfFilename);

			// the profile properties...
			//	 paths, plugins, transforms, staticHasFeatures
			// ...are mixed one level deep; messageCategories, messages, packages, and packagePaths require special handling; all others are over-written
			// FIXME: the only way to modify the transformJobs vector is to create a whole new vector?
			for(var p in src){
				if(!/paths|plugins|messages|transforms|staticHasFeatures|packages|packagePaths|defaultConfig/.test(p)){
					bc[p] = src[p];
				}
			}

			// the one-level-deep mixers
			["paths","plugins","transforms","staticHasFeatures"].forEach(function(p){
				bc[p] = mix(bc[p], src[p]);
			});

			// messages require special handling
			if(src.messageCategories){
				for(p in src.messageCategories){
					bc.addCategory(p, src.messageCategories[p]);
				}
			}
			(src.messages || []).forEach(function(item){bc.addMessage.apply(bc, item);});


			// packagePaths and packages require special processing to get their contents into packageMap; do that first...
			// process packagePaths before packages before packageMap since packagePaths is less specific than
			// packages is less specific than packageMap. Notice that attempts to edit an already-existing package
			// only edits specific package properties given (see mixPackage, above)
			for(var base in src.packagePaths){
				src.packagePaths[base].forEach(function(packageInfo){
					if(isString(packageInfo)){
						packageInfo = {name:packageInfo};
					}
					packageInfo.location = catPath(base, packageInfo.name);
					mixPackage(packageInfo);
				});
			};
			(src.packages || []).forEach(function(packageInfo){
					if(isString(packageInfo)){
						packageInfo = {name:packageInfo};
					}
					mixPackage(packageInfo);
			});

			// defaultConfig requires special handling
			for(p in src.defaultConfig){
				if(p=="hasCache"){
					mix(bc.defaultConfig.hasCache, src.defaultConfig.hasCache);
				}else{
					bc.defaultConfig[p] = src.defaultConfig[p];
				}
			}
		};

	argv.args.profiles.forEach(function(item){
		var temp = mix({}, item),
			build = item.build;
		delete temp.build;
		mixProfileObject(temp);
		build && mixProfileObject(build);
	});

	cleanDeprecated(argv.args, "command line");

	// lastly, explicit command line switches override any evaluated profile objects
	for(var argName in argv.args) if(argName!="profiles"){
		bc[argName] = argv.args[argName];
	}

	// at this point the raw profile object has been fully initialized; clean it up and look for errors...
	bc.basePath = computePath(bc.basePath, process.cwd());
	var releaseDir = catPath(bc.releaseDir || "../release", bc.releaseName || "");
	bc.destBasePath = computePath(releaseDir, bc.basePath);

	// compute global copyright, if any
	bc.copyright = isNonemptyString(bc.copyright) ? (maybeRead(computePath(bc.copyright, bc.basePath)) || bc.copyright) : "";
	bc.copyrightLayers = !!bc.copyrightLayers;
	bc.copyrightNonlayers = !!bc.copyrightNonlayers;

	// compute files, dirs, and trees
	(function(){
		for(var property in {files:1, dirs:1, trees:1}){
			if(bc[property] instanceof Array){
				bc[property] = bc[property].map(function(item){
					return cleanupFilenamePair(item, bc.basePath, bc.destBasePath, property);
				});
			}
		}
	})();

	// cleanup the replacements (if any)
	(function(){
		var cleanSet = {}, src, dest;
		for(src in bc.replacements){
			cleanSet[computePath(src, bc.basePath)] = bc.replacements[src];
		}
		bc.replacements = cleanSet;
	})();

	// explicit mini and/or copyTests wins; explicit copyTests ignores explicit mini
	if(!("mini" in bc)){
		bc.mini = true;
	}
	if(!("copyTests" in bc)){
		bc.copyTests = !bc.mini;
	}
	if(isString(bc.copyTests)){
		bc.copyTests = bc.copyTests.toLowerCase();
	}
	if(bc.copyTests!="build"){
		// convert to pure boolean
		bc.copyTests = !!bc.copyTests;
	}

	function getDiscreteLocales(locale){
		for(var locales = locale.split("-"), result = [], current = "", i = 0; i<locales.length; i++){
			result.push(current += (i ? "-" : "") + locales[i]);
		}
		return result;
	}
	if(isString(bc.localeList)){
		bc.localeList = bc.localeList.split(",");
	}
	if(bc.localeList && bc.localeList.length){
		if(bc.localeList.indexOf("ROOT")==-1){
			bc.localeList.push("ROOT");
		}
		var localeList = {};
		bc.localeList.forEach(function(locale){
			locale = lang.trim(locale);
			localeList[locale] = getDiscreteLocales(locale);
		});
		bc.localeList.discreteLocales = localeList;
	}else{
		bc.localeList = false;
	}


	(function(){
		function processPackage(pack){
			var packName = pack.name,
				basePath = pack.basePath || bc.basePath;
			if(!pack.packageJson){
				pack.packageJson = argv.readPackageJson(catPath(computePath(pack.location || ("./" + packName), basePath), "package.json"), "missingPackageJson");
			}
			var packageJson = pack.packageJson;
			if(packageJson){
				if(packageJson.version){
					bc.log("packageVersion", ["package", packName, "version", packageJson.version]);

					// new for 1.7, if version is not provided, the version of the dojo package is used
					if(typeof bc.version=="undefined" && packName=="dojo"){
						bc.version = packageJson.version;
					}
				}
				if(packageJson.main && !pack.main){
					pack.main= packageJson.main;
				}
				if(packageJson.directories && packageJson.directories.lib && !pack.location){
					pack.location = catPath(getFilepath(packageJson.selfFilename), packageJson.directories.lib);
				}
				if("dojoBuild" in packageJson){
					var defaultProfile = argv.readProfile("profile", catPath(getFilepath(packageJson.selfFilename), packageJson.dojoBuild));
					for(var p in defaultProfile){
						if(!(p in pack)){
							pack[p] = defaultProfile[p];
						}else if(p in {resourceTags:1}){
							// these are mixed one level deep
							// TODO: review all profile properties and see if there are any others than resourceTags that ought to go here
							mix(pack[p], defaultProfile[p]);
						}
					}
				}else{
					bc.log("missingProfile", ["package", packageJson.name]);
				}
			}

			// build up info to tell all about a package; all properties semantically identical to definitions used by dojo loader/bdLoad
			pack.main = isString(pack.main) ? pack.main : "main";
			if(pack.main.indexOf("./")==0){
				pack.main = pack.main.substring(2);
			}
			if(pack.destMain && pack.destMain.indexOf("./")==0){
				pack.destMain = pack.destMain.substring(2);
			}

			pack.location = computePath(pack.location || ("./" + packName), basePath);

			pack.copyright = isNonemptyString(pack.copyright) ?
				(maybeRead(computePath(pack.copyright, pack.location)) || maybeRead(computePath(pack.copyright, bc.basePath)) || pack.copyright) :
				(pack.copyright ? bc.copyright : "");
			pack.copyrightLayers = isDefined(pack.copyrightLayers) ? !!pack.copyrightLayers : bc.copyrightLayers;
			pack.copyrightNonlayers = isDefined(pack.copyrightNonlayers) ? !!pack.copyrightNonlayers : bc.copyrightNonlayers;

			// dest says where to output the compiled code stack
			var destPack = bc.destPackages[packName] = {
				name:pack.destName || packName,
				main:pack.destMain || pack.main,
				location:computePath(pack.destLocation || ("./" + (pack.destName || packName)), bc.destBasePath)
			};
			delete pack.destName;
			delete pack.destMain;
			delete pack.destLocation;


			if(!pack.trees){
				// copy the package tree; don't copy any hidden directorys (e.g., .git, .svn) or temp files
				pack.trees = [[pack.location, destPack.location, /(\/\.)|(^\.)|(~$)/]];
			} // else the user has provided explicit copy instructions

			// filenames, dirs, trees just like global, except relative to the pack.(src|dest)Location
			for(var property in {files:1, dirs:1, trees:1}){
				pack[property] = (pack[property] || []).map(function(item){
					return cleanupFilenamePair(item, pack.location, destPack.location, property + " in package " + packName);
				});
			}
		}

		// so far, we've been using bc.packageMap to accumulate package info as it is provided by packagePaths and/or packages
		// in zero to many profile scripts. This routine moves each package config into bc.packages which is a map
		// from package name to package config (this is different from the array the user uses to pass package config info). Along
		// the way, each package config object is cleaned up and all default values are calculated.
		bc.packages = bc.packageMap;
		delete bc.packageMap;
		bc.destPackages = {};
		for(var packageName in bc.packages){
			var pack = bc.packages[packageName];
			pack.name = pack.name || packageName;
			processPackage(pack);
		}

		// now that we know the dojo path, we can automatically add DOH, if required
		if(bc.copyTests && !bc.packages.doh){
			bc.packages.doh = {
				name:"doh",
				location:compactPath(bc.packages.dojo.location + "/../util/doh"),
				destLocation:"util/doh"
			};
			processPackage(bc.packages.doh);
		}

		// get this done too...
		require.computeMapProg(bc.paths, (bc.pathsMapProg = []));
		require.computeMapProg(bc.destPaths || bc.paths, (bc.destPathsMapProg = []));

		// add some methods to bc to help with resolving AMD module info
		bc.srcModules = {};
		bc.destModules = {};

		var trimLastChars = function(text, n){
			return text.substring(0, text.length-n);
		};

		bc.getSrcModuleInfo = function(mid, referenceModule, ignoreFileType){
			if(ignoreFileType){
				var result = require.getModuleInfo(mid+"/x", referenceModule, bc.packages, bc.srcModules, bc.basePath + "/", {}, [], true);
				result.mid = trimLastChars(result.mid, 2);
				if(result.pid!==0){
					// trim /x.js
					result.url = trimLastChars(result.url, 5);
				}
				return result;
			}else{
				return require.getModuleInfo(mid, referenceModule, bc.packages, bc.srcModules, bc.basePath + "/", {}, [], true);
			}
		};


		bc.getDestModuleInfo = function(mid, referenceModule, ignoreFileType){
			// note: bd.destPagePath should never be required; but it's included for completeness and up to the user to provide it if some transform does decide to use it
			if(ignoreFileType){
				var result = require.getModuleInfo(mid+"/x", referenceModule, bc.destPackages, bc.destModules, bc.destBasePath + "/", {}, [], true);
				result.mid = trimLastChars(result.mid, 2);
				if(result.pid!==0){
					// trim /x.js
					result.url = trimLastChars(result.url, 5);
				}
				return result;
			}else{
				return require.getModuleInfo(mid, referenceModule, bc.destPackages, bc.destModules, bc.destBasePath + "/", {}, [], true);
			}
		};
	})();


	if(bc.selectorEngine && bc.defaultConfig && bc.defaultConfig.hasCache){
		bc.defaultConfig.hasCache["config-selectorEngine"] = bc.selectorEngine;
	}

	(function(){
		// a layer is a module that should be written with all of its dependencies, as well as all modules given in
		// the include vector together with their dependencies, excluding modules contained in the exclude vector and their dependencies
		var layer, fixedLayers = {};
		for(var mid in bc.layers){
			layer = bc.layers[mid];
			layer.exclude = layer.exclude || [];
			layer.include = layer.include || [];
			layer.boot = !!layer.boot;
			layer.discard = !!layer.discard;
			layer.noref = !!(layer.noref!==undefined ? layer.noref : bc.noref);
			layer.compat = layer.compat!==undefined ? layer.compat : (bc.layerCompat ||"");

			var tlm = mid.split("/")[0],
				pack = bc.packages[tlm],
				packLocation = pack && pack.location,
				packCopyright = pack && pack.copyright,
				packCopyrightLayers = pack && pack.copyrightLayers;
			if(isNonemptyString(layer.copyright)){
				// if relative, first try basePath, then try package location, otherwise, just use what's given
				layer.copyright = (packLocation && maybeRead(computePath(layer.copyright, packLocation))) || maybeRead(computePath(layer.copyright, bc.basePath)) || layer.copyright;
			}else if(isDefined(layer.copyright)){
				// some kind of truthy other than a string
				layer.copyright = layer.copyright ? (packCopyright || bc.copyright) : "";
			}else{
				layer.copyright = pack ? (packCopyrightLayers && (packCopyright || bc.copyright)) : (bc.copyrightLayers && bc.copyright);
			}
			if(!layer.copyright){
				layer.copyright = "";
			}
			fixedLayers[mid] = layer;
		}
		bc.layers = fixedLayers;

		// if (and only if) we're doing a build that includes the dojo tree, then ensure the loader layer is defined correctly
		// and make sure all other layers exclude the loader unless they are marked with custome base
		if(bc.packages.dojo){
			if(!bc.layers["dojo/dojo"]){
				bc.layers["dojo/dojo"] = {name:"dojo/dojo", copyright:bc.defaultCopyright + bc.defaultBuildNotice, include:["dojo/main"], exclude:[]};
			}
			for(var p in bc.layers){
				layer = bc.layers[p];
				if(p=="dojo/dojo"){
					if(!layer.customBase){
						// the purpose of the layer is to simply add some additional modules to a standard dojo boot
						if(layer.include.indexOf("dojo/main")==-1){
							layer.include.push("dojo/main");
						}
					}else{
						// this is a custom base dojo.js; it's up the the user to say exactly what they want
					}
				}else{
					if((layer.boot || !layer.customBase) && layer.exclude.indexOf("dojo/dojo")==-1){
						// the layer has dojo/dojo if it is booting, or assumes dojo/dojo if its not explicitly saying customBase
						layer.exclude.push("dojo/dojo");
					}
					// by definition...
					layer.customBase = layer.boot;
				}
			}
		}
	})();


	// for the static has flags, -1 means its not static; this gives a way of combining several static has flag sets
	// and still allows later sets to delete flags set in earlier sets
	var deleteStaticHasFlagSet = [];
	for(var p in bc.staticHasFeatures) if(bc.staticHasFeatures[p]==-1) deleteStaticHasFlagSet.push(p);
	deleteStaticHasFlagSet.forEach(function(flag){delete bc.staticHasFeatures[flag];});

	if(bc.action){
		bc.action.split(/\W|\s/).forEach(function(action){
			action = action.match(/\s*(\S+)\s*/)[1];
			switch(action){
				case "check":
					bc.check = true;
					break;
				case "clean":
					bc.clean = true;
					break;
				case "release":
					bc.release = true;
					break;
				default:
					bc.log("inputUnknownAction", ["action", action]);
			}
		});
	}

	if(bc.clean){
		bc.log("cleanRemoved");
	}

	// understand stripConsole from dojo 1.3 and before
	var stripConsole = bc.stripConsole;
	if(!stripConsole || stripConsole=="none"){
		stripConsole = false;
	}else if(stripConsole == "normal,warn"){
		bc.log("inputDeprecatedStripConsole", ["deprecated", "normal,warn", "use", "warn"]);
		stripConsole = "warn";
	}else if(stripConsole == "normal,error"){
		bc.log("inputDeprecatedStripConsole", ["deprecated", "normal,error", "use", "all"]);
		stripConsole = "all";
	}else if(!/normal|warn|all|none/.test(stripConsole)){
		bc.log("inputUnknownStripConsole", ["value", stripConsole]);
	}
	bc.stripConsole = stripConsole;

	function fixupOptimize(value){
		if(value){
			value = value + "";
			value = value.toLowerCase();
			if(!/^((comments|shrinksafe)(\.keeplines)?)|(closure(\.keeplines)?)$/.test(value)){
				bc.log("inputUnknownOptimize", ["value", value]);
				value = 0;
			}else{
				if(/shrinksafe/.test(value) && stripConsole){
					value+= "." + stripConsole;
				}
			}
		}
		return value;
	}
	bc.optimize = fixupOptimize(bc.optimize);
	bc.layerOptimize = fixupOptimize(bc.layerOptimize);

	(function(){
		var fixedScopeMap = {dojo:"dojo", dijit:"dijit", dojox:"dojox"};
		(bc.scopeMap || []).forEach(function(pair){
			if(!pair[1]){
				delete fixedScopeMap[pair[0]];
			}else{
				fixedScopeMap[pair[0]] = pair[1];
			}
		});
		bc.scopeMap = fixedScopeMap;

		bc.scopeNames = [];
		for(var p in fixedScopeMap){
			bc.scopeNames.push(p);
		}
	})();

	bc.internSkip = function(){return false;};
	if(bc.internSkipList){
		bc.internSkip = function(mid, referenceModule){
			return bc.internSkipList.some(function(item){
				var result = false;
				if(item instanceof RegExp){
					result = item.test(mid);
				}else if(item instanceof Function){
					result = item(mid, referenceModule);
				}else{
					result = item==mid;
				}
				if(result){
					bc.log("internStrings", ["module", referenceModule.mid, "skipping", mid]);
				}
				return result;
			});
		};
	}

	// dump bc (if requested) before changing gate names to gate ids below
	if(bc.check){
		(function(){
			var toDump = {
				basePath:1,
				buildReportDir:1,
				buildReportFilename:1,
				closureCompilerPath:1,
				copyright:1,
				copyrightLayers:1,
				copyrightNonlayers:1,
				copyTests:1,
				destBasePath:1,
				destModules:1,
				destPackages:1,
				destPathTransforms:1,
				destPathsMapProg:1,
				dirs:1,
				discoveryProcs:1,
				files:1,
				internStringsSkipList:1,
				layers:1,
				localeList:1,
				maxOptimizationProcesses:1,
				mini:1,
				optimize:1,
				layerOptimize:1,
				"package":1,
				packages:1,
				paths:1,
				pathsMapProg:1,
				plugins:1,
				replacements:1,
				startTimestamp:1,
				staticHasFeatures:1,
				stripConsole:1,
				trees:1
			};
			for(var p in toDump){
				toDump[p] = bc[p];
			}
			bc.log("pacify", stringify(toDump));
		})();
		bc.release = 0;
	}

	if(bc.writeProfile){
		// TODO
		// fs.writeFileSync(bc.writeProfile, "dependencies = " + dojo.toJson(profileProperties, true), "utf8");
	}

	if(bc.debugCheck){
		(function(){
			var toDump = {};
			for(var p in bc){
				if(bc[p]!==messages[p] && typeof bc[p]!="function"){
					toDump[p] = bc[p];
				}
			}
			console.log("profile:");
			console.log(stringify(toDump));
			toDump = {};
			for(p in require){
				if(p!="modules" && p!="module" && p!="rawConfig" && typeof require[p]!="function"){
					toDump[p] = require[p];
				}
			}
			console.log("require config:");
			console.log(stringify(toDump));
		})();
		bc.release = 0;
	}

	// clean up the gates and transforms
	(function(){
		// check that each transform references a valid gate
		for(var gates = {}, i = 0; i<bc.gates.length; i++){
			gates[bc.gates[i][1]] = i;
		}
		var
			transforms = bc.transforms,
			gateId;
		for(var transformId in transforms){
			// each item is a [AMD-MID, gateName] pair
			gateId = gates[transforms[transformId][1]];
			if(typeof gateId == "undefined"){
				bc.log("inputUnknownGate", ["transform", transformId, "gate", transforms[transformId][1]]);
			}else{
				transforms[transformId][1] = gateId;
			}
		}
	})();

	// clean up the transformJobs
	(function(){
		// check that that each transformId referenced in transformJobs references an existing item in transforms
		// ensure proper gate order of the transforms given in transformJobs; do not disturb order within a given
		// gate--this is the purview of the user
		var transforms = bc.transforms;
		bc.transformJobs.forEach(function(item){
			// item is a [predicate, vector of transformId] pairs
			var error = false;
			var tlist = item[1].map(function(id){
				// item is a transformId
				if(transforms[id]){
					// return a [trandformId, gateId] pair
					return [id, transforms[id][1]];
				}else{
					error = true;
					bc.log("inputUnknownTransform", ["transform", id]);
					return 0;
				}
			});
			// tlist is a vector of [transformId, gateId] pairs than need to be checked for order
			if(!error){
				for(var i = 0, end = tlist.length - 1; i<end;){
					if(tlist[i][1]>tlist[i+1][1]){
						var t = tlist[i];
						tlist[i] = tlist[i+1];
						tlist[i+1] = t;
						i && i--;
					}else{
						i++;
					}
				}
				// now replace the vector of transformIds with the sorted list
				item[1] = tlist;
			}
		});
	})();

	if(argv.args.unitTest=="dumpbc"){
		console.log(stringify(bc) + "\n");
	}

	if(bc.quiet){
		(function(){
			var delSet = {};
			for(var p in bc.pacifySet){
				if(bc.messageMap[p][1]>199){
					delSet[p] = 1;
				}
			}
			for(p in delSet){
				delete bc.pacifySet[p];
			}
		})();
	}

	if(bc.unitTestComputedProfile){
		bc.unitTestComputedProfile();
		// stop the build
		bc.release = 0;
	}

	if(!bc.unitTestComputedProfile && !bc.check && !bc.debugCheck && !bc.clean && !bc.release){
		bc.log("pacify", "Nothing to do; you must explicitly instruct the application to do something; use the option --help for help.");
	}

	return bc;
});

define([
	"require",
	"./buildControlBase",
	"./fs", "./fileUtils"
], function(require, bc, fs, fileUtils){
	eval(require.scopeify("./fs, ./fileUtils"));
	var mix = function(dest, src){
			dest = dest || {};
			src = src || {};
			for(var p in src) dest[p] = src[p];
			return dest;
		},

		// any profile properties default values that are different in a 1.6- profile are listed below
		defaultBuildProps = {
			// these are computed explicitly in processProfile() below
			//releaseName:"dojo",
			//releaseDir:"../../release",

			staticHasFeatures:{
				// consider turning these hard on for standard 1.x build
				//'config-publishRequireResult':1,
				//'config-tlmSiblingOfDojo':1,
			},

			defaultConfig:{
				// no changes
				hasCache:{
					// no changes
				}
			}
		},

		processProfile = function(profile, dojoPath, utilBuildscriptsPath, profilePath){
			// process a v1.6- profile
			//
			// v1.6- has the following relative path behavior:
			//
			//	 * the util/buildscripts/ directory is assumed to be the cwd upon build program startup
			//	 * the dojo directory as specified in profile dependencies.prefixes (if relative) is
			//	   assumed to be relative to util/buildscripts/; usually, it is not explicitly specified
			//	   and is automatically set by the v1.6 build application to ../../dojo.
			//	 * similarly the releaseDir directory (if relative) is assumed to be relative to util/buildscripts/
			//	 * all other relative paths are relative to the dojo directory (in spite of what some docs say)
			//	 * all input module hierarchies are "flattened" so they are siblings of the dojo directory
			//
			// This has the net effect of forcing the assumption that build program is be executed from util/buildscripts.
			// when relative paths are used; this may be inconvenient. The behavior is probably consequent to rhino's design
			// that does not report the full path of the script being executed.
			//
			var
				p,
				result = {},
				layers = profile.layers || [],
				prefixes = profile.prefixes || [];

			for(p in defaultBuildProps){
				result[p] = defaultBuildProps[p];
			}
			for(p in profile){
				if(/^(loader|xdDojoPath|scopeDjConfig|xdScopeArgs|xdDojoScopeName|expandProvide|buildLayers|query|removeDefaultNameSpaces|addGuards)$/.test(p)){
					bc.log("inputDeprecated", ["switch", p]);
				}else if(p=="staticHasFeatures"){
					mix(result.staticHasFeatures, profile.staticHasFeatures);
				}else if(p=="defaultConfig"){
					for(p in profile.defaultConfig){
						if(p=="hasCache"){
							mix(result.defaultConfig.hasCache, profile.defaultConfig.hasCache);
						}else{
							result.defaultConfig[p] = profile.defaultConfig[p];
						}
					}
				}else{
					// this is gross, but it's in the v1.6 app...and it's used in some of our own profiles as of [26706]
					result[p] = (profile[p]=="false" ? false : profile[p]);
				}
			}

			// convert the prefix vector to a map
			var prefixMap =
					// map from top-level mid --> path
					{},
				copyrightMap =
					// map from top-level mid --> copyright message (usually undefined)
					{},
				runtimeMap =
					// map from top-level mid --> runtime environment for computing depenencies in transforms/depsScan (usually undefined)
					{};
			prefixes.forEach(function(pair){
				// pair a [mid, path], mid, a top-level module id, path relative to dojo directory
				var mid = pair[0];
				prefixMap[mid]= pair[1];
				// copyright is relaxed in 1.7+: it can be a string or a filename
				copyrightMap[mid] = (pair[2] && (maybeRead(computePath(pair[2], utilBuildscriptsPath)) || maybeRead(computePath(pair[2], profilePath)) || pair[2])) || "";
				runtimeMap[mid] = pair[3];
			});

			// make sure we have a dojo path; notice we default to the dojo being used to run the build program as per the v1.6- build system
			// the only place basePath is used when processing a v1.6- profile is to compute releaseDir when releaseDir is relative
			// in this case, basePath in v1.6- is always assumed to be /util/buildscripts
			var basePath = result.basePath = utilBuildscriptsPath;

			if(!prefixMap.dojo){
				prefixMap.dojo = dojoPath;
			}
			// make sure it is absolute
			prefixMap.dojo = computePath(prefixMap.dojo, basePath);
			if(prefixMap.dojo!=dojoPath){
				bc.log("buildUsingDifferentDojo");
			}
			dojoPath = prefixMap.dojo;

			// now we can compute an absolute path for each prefix (top-level module)
			// (recall , in v1.6-, relative prefix paths are relative to the dojo path because of "flattening"
			for(var mid in prefixMap){
				if(mid!="dojo"){
					prefixMap[mid] = computePath(prefixMap[mid], dojoPath);
				}
			}

			// now fixup and make absolute the releaseDir; releaseDir, if relative, is relative to /util/buildscripts
			// by making it absolute, later profiles can change basePath without affecting releaseDir
			result.releaseDir = computePath((profile.releaseDir || "../../release").replace(/\\/g, "/"), basePath);

			// make sure releaseName is clean
			if(typeof profile.releaseName == "undefined"){
				profile.releaseName = "dojo";
			}
			if(!profile.releaseName){
				profile.releaseName = "";
			}

			result.releaseName = profile.releaseName.replace(/\\/g, "/");

			// now make a package for each top-level module
			var packages = result.packages = [];
			for(mid in prefixMap){
				packages.push({
					name:mid,
					location:prefixMap[mid],
					copyright:copyrightMap[mid]!==undefined ? copyrightMap[mid] : bc.defaultCopyright,
					runtime:runtimeMap[mid]
				});
			}

			// recall the v1.6- build system "flattens" the module structure, no matter how it is arranged on input, into a set of sibling
			// top-level modules (dojo, dijit, dojox, demos, myStuff, yourStuff, etc.). The layer.name property is just a filename. Theoretically,
			// it could be placed anywhere, but in practice, it's always places somewhere in this flattened forest of module trees by giving
			// a name like "../myTopLevelModule/someModule.js". Therefore, the intendeded module name can be deduced by chopping off the "../"
			// prefix and ".js" suffix. Again, in theory, this won't work 100% of the time, but we don't have any examples of it not working. This
			// technique also works for layerDependencies. Therefore, transform a v1.6 layer object into a v1.7 layer object
			var getLayerCopyrightMessage = function(explicit, mid){
					// this is a bit obnoxious as a default, but it's the v1.6- behavior
					// TODO: consider changing
					if(explicit!==undefined){
						return explicit;
					}
					var copyright = copyrightMap[mid.split('/',1)[0]];
					if(copyright){
						return copyright;
					}else{
						return bc.defaultCopyright + bc.defaultBuildNotice;
					}
				},

				transformDependencies = function(list){
					return list ? list.map(function(mid){
						modulesSeen[mid = mid.replace(/\./g, "/")] = 1;
						return mid;
					}) : [];
				},

				transformLayerDependencies = function(list, layerName){
					return list ? list.map(function(mid){
						if(!/\//.test(mid) && !/\.js$/.test(mid)){
							// not a slash and doesn't end in .js; therefore, must be a module name
							modulesSeen[mid.split(".")[0]] = 1;
							return mid;
						}
						var match;
						if(/^\.\//.test(mid)){
							mid = mid.substring(2);
						}
						if(mid=="dojo/dojo"){
							return mid;
						}else if(mid=="dojo.js"){
							return "dojo/dojo";
						}else if((match = mid.match(nameRe))){
							// sibling of dojo
							modulesSeen[match[1]] = 1;
							return match[1];
						}else if((match = mid.match(dojoModuleRe))){
							// assuming a dojo module
							bc.log("assumeLayerDependencyIsDojoModule", ["layer dependency", mid]);
							return match[1];
						}else{
							bc.log("cannotDeduceModuleIdFrom16LayerDependency", ["layer name", layerName, "layer dependency name", mid]);
							return "error";
						}
					}) : [];
				},

				nameRe = /^\.\.\/([^\.].*)\.js$/,

				dojoModuleRe = /^([^\.].*)\.js$/,

				modulesSeen = {},

				fixedLayers = {};
			layers.forEach(function(layer){
				var match, name;
				if(layer.resourceName){
					name = layer.resourceName.replace(/\./g, "/");
				}else{
					name = layer.name;
					if(/^\.\//.test(name)){
						name = name.substring(2);
					}
					if(layer.name=="dojo.js"){
						// custom base
						name = "dojo/dojo";
						if(!layer.customBase){
							layer.dependencies.push("dojo/main");
						}
						layer.boot = true;
					}else if((match = name.match(nameRe))){
						// sibling of dojo
						name = match[1];
					}else if((match = name.match(dojoModuleRe))){
						// hopefully a dojo module
						name = "dojo/" + match[1];
						bc.log("assumeLayerIsDojoModule", ["layer name", layer.name]);
					}else{
						bc.log("cannotDeduceModuleIdFrom16LayerName", ["layer name", layer.name]);
					}
				}
				layer.include = transformDependencies(layer.dependencies);
				layer.exclude = transformLayerDependencies(layer.layerDependencies, layer.name);
				if(name!="dojo/dojo" && !layer.customBase){
					layer.exclude.push("dojo/dojo");
				}
				layer.name = name;
				modulesSeen[name.split("/")[0]] = 1;
				layer.copyright = getLayerCopyrightMessage(layer.copyright, name);
				fixedLayers[name] = layer;
			});

			// lastly, check that all the top-level module seen were in the prefixes vector
			for(p in modulesSeen){
				var tlm = p.split("/")[0];
				if(!prefixMap[tlm]){
					bc.log("missingPrefix", ["top-level module", tlm]);
				}
			}
			result.layers = fixedLayers;

			return result;
		},

		processHtmlFiles = function(files, dojoPath, utilBuildscriptsPath){
			bc.log("processHtmlFiles", ["files", files.join(", ")]);
			var
				basePath = "",
				layers = {},
				prefix = "",
				prefixes = {dijit: true, dojox: true};
			files.forEach(function(htmlFile){
				var
					priorLayers = [],
					addLayer = function(scriptName){
						if(layers[scriptName]){
						// if this module has been added before, find the intersection of dependencies
							layers[scriptName] = layers[scriptName].filter(function(scriptName){
								return priorLayers.indexOf(scriptName) > -1;
							});
						}else{
							layers[scriptName] = priorLayers.concat();
						}
						if(scriptName.indexOf('.') > -1){
							prefixes[scriptName.substring(scriptName, scriptName.indexOf('.'))] = true;
						}
						priorLayers.push(scriptName);
					};

				var html = fs.readFileSync(htmlFile, "utf8");
				html.replace(/<script [^>]*src=["']([^'"]+)["']/gi, function(t, scriptName){
					// for each script tag
					if(scriptName.indexOf("dojo/dojo.js") > -1){
						// use dojo.js to determine the prefix for our namespaces
						prefix = scriptName.substring(0, scriptName.indexOf("dojo/dojo.js"));

						// the release dir is relative to the dir that contains the html file(s)
						// the prefix, if relative, is relative to basePath
						if(!basePath){
							basePath = fileUtils.getFilepath(htmlFile);
						}
					}else{
						// non-dojo.js script files, add it to our list of layers
						addLayer(scriptName = scriptName.substring(prefix.length, scriptName.length - 3).replace(/\//g, '.'));
					}
				});
				html.replace(/dojo\.require\(["']([^'"]+)["']\)/g, function(t, scriptName){
					// for each dojo.require call add it to the layers as well
					addLayer(scriptName);
				});
			});

			var prefixPaths = [];
			// normalize the prefixes into the arrays that the build expects
			for(prefix in prefixes){
				prefixPaths.push([prefix, "../" + prefix]);
			}
			var layersArray = [];
			for(var name in layers){
				// for each layer, create a layer object
				layersArray.push({
					name: "../" + name.replace(/\./g,'/') + ".js", // use filename
					dependencies: [
						name.replace(/\//g,'.') // use module name
					],
					//use all previous layers as layer dependencies
					layerDependencies: layers[name].map(function(name){
						return "../" + name.replace(/\./g,'/') + ".js";
					})
				});
			}
			var profileProperties = {
				layers: layersArray,
				prefixes: prefixPaths,
				basePath:basePath
			};
			return processProfile(profileProperties, dojoPath, utilBuildscriptsPath);
		};

	return {
		processProfile:processProfile,
		processHtmlFiles:processHtmlFiles
	};
});

define([
	"./buildControl",
	"./fileUtils",
	"./fs"
], function(bc, fileUtils, fs){
	// find all files as given by files, dirs, trees, and packages
	var
		dirsProcessed =
			// a set of the directory names that have been inspected
			{},

		treesDirsFiles = ["trees", "dirs", "files"],

		srcDirs = {},

		destDirs = {},

		getFilepath = fileUtils.getFilepath,
		catPath = fileUtils.catPath,
		compactPath = fileUtils.compactPath,

		start = function(resource, tagResource){
			if(!resource.tag){
				resource.tag = {};
			}
			if(tagResource){
				tagResource(resource);
			}
			bc.start(resource);
			srcDirs[getFilepath(resource.src)] = 1;
			destDirs[getFilepath(resource.dest)] = 1;
		},

		getResourceTagFunction = function(resourceTags){
			//resource tags is a map from tag to a function or a regular expression
			var getFilterFunction = function(item){
					return typeof item=="function" ?
						item :
						function(filename){
							return item.test(filename);
						};
				},
				tag = {},
				gotOne	= false;
			for(var p in resourceTags){
				tag[p] = getFilterFunction(resourceTags[p]);
				gotOne	= true;
			}
			if(!gotOne){
				return 0;
			}
			return function(resource){
				for(var p in tag){
					if(tag[p](resource.src, resource.mid, resource)){
						resource.tag[p] = 1;
					}
				}
			};
		},

		neverExclude = function(){
			return 0;
		},

		getExcludes = function(excludes){
			// excludes is falsy, a function, or a regulare expression
			if(!excludes){
				return neverExclude;
			}else if(typeof excludes=="function"){
				return excludes;
			}else{
				return function(filename){
					return excludes.test(filename);
				};
			}
		},

		readSingleDir = function(srcBase, destBase, current, excludes, advise, traverse){
			// Read a directory and advise of each child contained therein if the child is
			// not excluded.
			//
			// If traverse is truthy, then traverse the directory tree. When traversing,
			// current gives the current position in the traversal relative to srcBase.
			// The first call when traversing (or only call when not traversing) must
			// have current set to falsy.
			//
			// Notice that only the complete child path relative to srcBase is submitted
			// to excludes. This simplifies constructing exclude functions since srcBase
			// will never be part of the input to those functions.

			var dir = srcBase + (current ? "/" + current : ""),
				fullPrefix = dir + "/",
				currentPrefix = current ? current + "/" : "",
				subdirs = [];

			// inspect each directory once per build
			if(dirsProcessed[dir]){
				return;
			}
			dirsProcessed[dir] = 1;

			fs.readdirSync(dir).forEach(function(filename){
				var current = currentPrefix + filename;
				if(!excludes || !excludes(current)){
					var fullFilename = fullPrefix + filename,
						stats = fs.statSync(fullFilename);
					if(stats.isDirectory()){
						subdirs.push(current);
					}else{
						advise(fullFilename, destBase + "/" + current);
					}
				}
			});
			if(traverse && subdirs.length){
				subdirs.forEach(function(current){
					readSingleDir(srcBase, destBase, current, excludes, advise, 1);
				});
			}
		},

		readFile = function(item, advise){
			advise(item[0], item[1]);
		},

		srcPathExists = function(srcPath){
			if(!fileUtils.dirExists(srcPath)){
				bc.log("missingDirDuringDiscovery", ["directory", srcPath]);
				return 0;
			}
			return 1;
		},

		readDir = function(item, advise){
			if(srcPathExists(item[0])){
				readSingleDir(item[0], item[1], 0, getExcludes(item[2]), advise, 0, 0);
			}
		},

		readTree = function(item, advise){
			if(srcPathExists(item[0])){
				readSingleDir(item[0], item[1], 0, getExcludes(item[2]), advise, 1);
			}
		},

		discover = {
			files:readFile,
			dirs:readDir,
			trees:readTree
		},

		processPackage = function(pack, destPack){
			// treeItem is the package location tree; it may give explicit exclude instructions
			var treeItem;
			for(var trees = pack.trees || [], i = 0; i<trees.length; i++){
				if(trees[i][0]==pack.location){
					treeItem = trees[i];
					break;
				}
			}
			if(!treeItem){
				// create a tree item; don't traverse into hidden, backup, etc. files (e.g., .svn, .git, etc.)
				treeItem = [pack.location, destPack.location, /(\/\.)|(^\.)|(~$)/];
			}

			var filenames = [];
			readTree(treeItem, function(filename){ filenames.push(filename); });

			// next, sift filenames to find AMD modules
			var
				maybeAmdModules = {},
				notModules = {},
				locationPathLength = pack.location.length + 1,
				packName = pack.name,
				prefix = packName ? packName + "/" : "",
				mainModuleInfo = packName && bc.getSrcModuleInfo(packName),
				mainModuleFilename = packName && mainModuleInfo.url;
			filenames.forEach(function(filename){
				// strip the package location path and the .js suffix(iff any) to get the mid
				var
					maybeModule = /\.js$/.test(filename),
					mid = prefix + filename.substring(locationPathLength, maybeModule ? filename.length-3 : filename.length),
					moduleInfo = maybeModule && bc.getSrcModuleInfo(mid);
				if(!maybeModule){
					notModules[mid] = [filename, mid];
				}else if(filename==mainModuleFilename){
					maybeAmdModules[packName] = mainModuleInfo;
				}else{
					maybeAmdModules[mid] = moduleInfo;
				}
			});

			// add modules as per explicit pack.modules vector; this is a way to add modules that map strangely
			// (for example "myPackage/foo" maps to the file "myPackage/bar"); recall, packageInfo.modules has two forms:
			//
			//	 modules:{
			//		 "foo":1,
			//		 "foo":"path/to/foo/filename.js"
			//	 }
			for(var mid in pack.modules){
				var
					fullMid = prefix + mid,
					moduleInfo = bc.getSrcModuleInfo(fullMid);
				if(typeof pack.modules[mid]=="string"){
					moduleInfo.url = pack.modules[mid];
				}
				maybeAmdModules[fullMid] = moduleInfo;
				delete notModules[fullMid];
			};

			var tagResource = getResourceTagFunction(pack.resourceTags);

			// start all the package modules; each property holds a module info object
			for(var p in maybeAmdModules){
				moduleInfo = maybeAmdModules[p];
				var resource = {
					src:moduleInfo.url,
					dest:bc.getDestModuleInfo(moduleInfo.mid).url,
					pid:moduleInfo.pid,
					mid:moduleInfo.mid,
					pack:pack,
					deps:[]
				};
				start(resource, tagResource);
			}

			// start all the "notModules"
			var prefixLength = prefix.length;
			for(p in notModules){
				resource = {
					src:notModules[p][0],
					// not really an AMD mid, but the filename with installation-dependent prefix stripped
					// this makes tagging easier
					mid:notModules[p][1],
					dest:catPath(destPack.location, p.substring(prefixLength))
				};
				start(resource, tagResource);
			}

			// finish by processing all the trees, dirs, and files explicitly specified for the package
			for(i = 0; i<treesDirsFiles.length; i++){
				var set = treesDirsFiles[i];
				if(pack[set]){
					pack[set].forEach(function(item){
						discover[set](item, function(src, dest){
							start({src:src, dest:dest}, tagResource);
						});
					});
				}
			}
		},

		discoverPackages = function(){
			// discover all the package modules; discover the default package last since it may overlap
			// into other packages and we want modules in those other packages to be discovered as members
			// of those other packages; not as a module in the default package
			for(var p in bc.packages){
				processPackage(bc.packages[p], bc.destPackages[p]);
			}
		};

	return function(){
		///
		// build/discover

		bc.waiting++; // matches *1*

		// start the synthetic report resource
		start({
			tag:{report:1},
			src:"*report",
			dest:"*report",
			reports:[]
		});

		discoverPackages();

		// discover all trees, dirs, and files
		var tagResource = getResourceTagFunction(bc.resourceTags);
		for(var i = 0; i<treesDirsFiles.length; i++){
			var set = treesDirsFiles[i];
			bc[set].forEach(function(item){
				discover[set](item, function(src, dest){
					start({src:src, dest:dest}, tagResource);
				});
			});
		}

		// advise all modules that are to be written as a layer
		// advise the loader of boot layers
		for(var mid in bc.layers){
			var
				layer = bc.layers[mid],
				moduleInfo = bc.getSrcModuleInfo(mid),
				resource = bc.resources[moduleInfo.url];
			if(!resource){
				// this is a synthetic layer (just a set of real modules aggregated but doesn't exist in the source)
				resource = {
					tag:{synthetic:1, amd:1},
					src:moduleInfo.url,
					dest:bc.getDestModuleInfo(moduleInfo.mid).url,
					pid:moduleInfo.pid,
					mid:moduleInfo.mid,
					pack:moduleInfo.pack,
					deps:[],
					text:"define([], 1);" + bc.newline,
					getText:function(){
						return this.text;
					},
					encoding:"utf8"
				};
				start(resource);
			}
			resource.layer = layer;
			if(layer.boot){
				if(bc.loader){
					bc.loader.boots.push(resource);
				}else{
					bc.log("inputNoLoaderForBoot", ["boot layer", mid]);
				}
			}
		}

		bc.passGate(); // matches *1*
	};
});

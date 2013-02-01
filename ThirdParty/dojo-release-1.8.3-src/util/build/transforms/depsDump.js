define([
	"../buildControl",
	"../fileUtils",
	"../fs",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/json"
], function(bc, fileUtils, fs, lang, array, json){
	return function(resource, callback){
		if(!bc.depsDumpDotFilename && !bc.depsDumpFilename){
			return 0;
		}

		var dotModules = 0, traceForDot = {}, traceForDotDone = {};
		if(bc.dotModules){
			dotModules = {};
			array.forEach(bc.dotModules.split(","), function(module){
				dotModules[lang.trim(module)] = traceForDot;
			});
		}

		var modules = [],
			midToId = {},
			i = 0,
			dotOutput = "digraph {\n",
			r, p, destFilename;
		for(p in bc.resources){
			r = bc.resources[p];
			if(r.deps){
				if(!dotModules || dotModules[r.mid]){
					dotModules[r.mid] = traceForDotDone;
					r.deps.forEach(function(module){
						dotOutput += '"' + r.mid + '" -> "' + module.mid + '";\n';
						if (dotModules[module.mid]!==traceForDotDone){
							dotModules[module.mid] = traceForDot;
						}
					});
				}
				r.uid = i;
				midToId[bc.resources[p].mid] = i;
				modules.push(r);
				i++;
			}
		}

		if(bc.depsDumpDotFilename){
			var foundOne = dotModules;
			while(foundOne){
				foundOne = false;
				for(p in bc.resources){
					r = bc.resources[p];
					if(dotModules[r.mid]==traceForDot){
						foundOne = true;
						dotModules[r.mid] = traceForDotDone;
						if(r.deps){
							r.deps.forEach(function(module){
								dotOutput += '"' + r.mid + '" -> "' + module.mid + '";\n';
								if (dotModules[module.mid]!==traceForDotDone){
									dotModules[module.mid] = traceForDot;
								}
							});
						}
					}
				}
			}
			dotOutput += "}\n";

			var filename = fileUtils.computePath(bc.depsDumpDotFilename, bc.destBasePath);
			fileUtils.ensureDirectory(fileUtils.getFilepath(filename));
			fs.writeFileSync(filename, dotOutput, "ascii");
		}

		if(bc.depsDumpFilename){
			var depsTree = modules.map(function(module){
					return module.deps.map(function(item){ return item.uid; });
				}),
				idTree = {},
				getItem = function(parts, bag){
					var part = parts.shift();
					if(!(part in bag)){
						bag[part] = {};
					}
					if(parts.length){
						return getItem(parts, bag[part]);
					}else{
						return bag[part];
					}
				};
			modules.forEach(function(item, i){
				var parts = item.mid.split("/");
				getItem(parts, idTree)["*"] = i;
			});

			filename = fileUtils.computePath(bc.depsDumpFilename, bc.destBasePath);
			fileUtils.ensureDirectory(fileUtils.getFilepath(filename));
			fs.writeFileSync(filename, json.stringify({depsTree:depsTree, idTree:idTree}), "ascii");
		}

		return 0;
	};
});

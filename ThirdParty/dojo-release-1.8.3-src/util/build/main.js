//
// The Dojo Build System
//
// This is application is implemented as an AMD package intended to be loaded and executed by dojo. It is known to work correctly
// with node.js (fast!) and rhino (slow!). The program may be started from a command prompt as follows:
//
// node.js:
//	 >node path/to/dojotoolkit/dojo/dojo.js load=build <arguments>
//
// rhino:
//	 >java -jar path/to/js.jar path/to/dojotoolkit/dojo/dojo.js baseUrl=path/to/dojotoolkit/dojo load=build <arguments>
//
//	 * notice that, owing to the defective design of rhino, it is impossible for a script to know the location from
//		 which it was executed; therefore, the baseUrl must be provided.
//
// util/buildscripts/bng:
//	 TODOC
//
// The application proceeds as follows:
//
// 1. Process the command line and then process the build control script(s)/profile as specified by the command line.
// 2. Discover all resources as instructed by the build control script
// 3. Move the resources through an ordered set of gates. Zero to many synchronous and/or asynchronous transforms may be applied to various
//		resources as specified by the build control script. Different resources can be subject to different transforms. Resources are allowed
//		to move through gates without stopping until a "synchronized" gate is encountered. All transforms must complete for the previous gate before
//		any transform is allowed on the synchronized gate.
// 4. After the last gate has been completed, print a done message and terminate.
//
// See also:
//
// project home: http://bdframework.org/bdBuild/index
// fossil: http://bdframework.org/bdBuild/repo
// github: https://github.com/altoviso/bdBuild
// docs: http://bdframework.org/bdBuild/docs

define(["require", "dojo/has"], function(require, has){

	// host-dependent environment initialization
	if(has("host-node")){
		define("commandLineArgs", function(){
			//arg[0] is node; argv[1] is dojo.js; therefore, start with argv[2]
			return process.argv.slice(2);
		});

		// helps during dev or heavily async node...
		var util = require.nodeRequire("util");
		debug = function(it, depth, inspect){
			util.debug(inspect ? util.inspect(it, false, depth) : it);
		};

		has.add("is-windows", process.platform == "win32");
	}else if(has("host-rhino")){
		define("commandLineArgs", [], function(){
			var result = [];
			require.rawConfig.commandLineArgs.forEach(function(item){
				var parts = item.split("=");
				if(parts[0]!="baseUrl"){
					result.push(item);
				}
			});
			return result;
		});
		// TODO: make this real
		has.add("is-windows", /indows/.test(environment["os.name"]));
	}else{
		console.log("unknown environment; terminating.");
		return 0;
	}

	this.require.scopeify = function(moduleList){
		for(var p, mid, module, text = "", contextRequire = this, args = moduleList.split(","), i = 0; i<args.length;){
			mid = args[i++].match(/\S+/)[0];
			module = contextRequire(mid);
			mid = mid.match(/[^\/]+$/)[0];
			for(p in module){
				text+= "var " + p + "=" + mid + "." + p + ";\n";
			}
		}
		return text;
	};

	// run the build program
	require(["./buildControl", "./process"], function(bc, process){
		var
			gateListeners = bc.gateListeners = [],

			transforms = bc.transforms,
			transformJobs = bc.transformJobs,
			transformJobsLength = transformJobs.length,

			// all discovered resources
			resources = [],

			reportError = function(resource, err){
				bc.log("transformFailed", ["resource", resource.src, "transform", resource.jobPos, "error", err]);
				resource.error = true;
			},

			returnFromAsyncProc = function(resource, err){
				bc.waiting--;
				if(err){
					// notice reportError can decide to continue or panic
					reportError(resource, err);
				}
				advance(resource, true);
			},

			advance = function(resource, continuingSameGate){
				if(resource.error){
					return;
				}
				if(!continuingSameGate){
					// first time trying to advance through the current gate
					bc.waiting++;
				}

				// apply all transforms with a gateId <= the current gate for resource that have not yet been applied
				var err, nextJobPos, candidate;
				while(1){
					nextJobPos = resource.jobPos + 1,
					candidate = nextJobPos<resource.job.length && resource.job[nextJobPos];
					// candidate (if any) is a [transformProc, gateId] pair
					if(candidate && candidate[1]<=bc.currentGate){
						resource.jobPos++;
						bc.waiting++;
						err = candidate[0](resource, returnFromAsyncProc);
						if(err===returnFromAsyncProc){
							// the transform proc must call returnFromAsyncProc when complete
							return;
						}
						bc.waiting--;
						if(err){
							// notice we reportError can decide to continue or panic
							reportError(resource, err);
							// if reportError didn't panic, then this break will cause this resource to clear the next
							// gate; when all resources have cleared the next gate, passGate will notice error count and
							// quit
							break;
						}
					}else{
						break;
					}
				}

				// got through the gate; advise passGate which will decrement the lock we set at top of this function
				passGate();
			},

			advanceGate = function(currentGate){
				while(1){
					bc.currentGate = ++currentGate;
					bc.log("pacify", "starting " + bc.gates[bc.currentGate][2] + "...");
					gateListeners.forEach(function(listener){
						listener(bc.gates[bc.currentGate][1]);
					});
					if(currentGate==bc.gates.length-1 || bc.gates[currentGate+1][0]){
						// if we've either advanced to the last gate or the next gate is a synchronized gate, then hold at the current gate
						return;
					}
				}
			},

			passGate = bc.passGate = function(){
				if(--bc.waiting){
					return;
				} //	else all processes have passed through bc.currentGate

				if(bc.checkDiscovery){
					//passing the first gate which is dicovery and just echoing discovery; therefore
					process.exit(0);
				}

				if(bc.currentGate<bc.gates.length-1){
					advanceGate(bc.currentGate);
					// hold the next gate until all resources have been advised
					bc.waiting++;
					resources.forEach(function(resource){ advance(resource, 0); });
					// release the hold placed above
					passGate();
				}else{
					if(!resources.length){
						bc.log("discoveryFailed");
					}
					bc.log("pacify", "Process finished normally.\n\terrors: " + bc.getErrorCount() + "\n\twarnings: " + bc.getWarnCount() + "\n\tbuild time: " + ((new Date()).getTime() - bc.startTimestamp.getTime()) / 1000 + " seconds");
					if(!bc.exitCode && bc.getErrorCount()){
						bc.exitCode = 1;
					}
					process.exit(bc.exitCode);
					// that's all, folks...
				}
			};

		bc.start = function(resource){
			// check for collisions
			var
				src = resource.src,
				dest = resource.dest;
			if(bc.resourcesByDest[src]){
				// a dest is scheduled to overwrite a source
				bc.log("overwrite", ["input", src, "resource destined for same location: ", bc.resourcesByDest[src].src]);
				return;
			}
			if(bc.resourcesByDest[dest]){
				// multiple srcs scheduled to write into a single dest
				bc.log("outputCollide", ["source-1", src, "source-2", bc.resourcesByDest[dest].src]);
				return;
			}
			// remember the resources in the global maps
			bc.resources[resource.src] = resource;
			bc.resourcesByDest[resource.dest] = resource;

			if(bc.checkDiscovery){
				bc.log("pacify", src + "-->" + dest);
				return;
			}

			// find the transformJob and start it...
			for(var i = 0; i<transformJobsLength; i++){
				if(transformJobs[i][0](resource, bc)){
					// job gives a vector of functions to apply to the resource
					// jobPos says the index in the job vector that has been applied
					resources.push(resource);
					resource.job = transformJobs[i][1];
					resource.jobPos = -1;
					advance(resource);
					return;
				}
			}
			bc.log("noTransform", ["resoures", resource.src]);
		};

		function doBuild(){
			var
				transformNames = [],
				pluginNames = [],
				deps = [];
			bc.discoveryProcs.forEach(function(mid){ deps.push(mid); });
			for(var p in bc.transforms){
				// each item is a [AMD-MID, gateId] pair
				transformNames.push(p);
				deps.push(bc.transforms[p][0]);
			}
			for(p in bc.plugins){
				pluginNames.push(p);
				deps.push(bc.plugins[p]);
			}
			bc.plugins = {};
			require(deps, function(){
				// pull out the discovery procedures
				for(var discoveryProcs = [], argsPos = 0; argsPos<bc.discoveryProcs.length; discoveryProcs.push(arguments[argsPos++]));

				// replace the transformIds in the transformJobs with the actual transform procs; similarly for plugins
				for(var id, proc, i=0; i<transformNames.length;){
					id = transformNames[i++];
					proc = arguments[argsPos++];
					// replace every occurence of id with proc
					transformJobs.forEach(function(item){
						// item is a [predicate, vector of [transformId, gateId] pairs] pairs
						for(var transforms=item[1], i = 0; i<transforms.length; i++){
							if(transforms[i][0]==id){
								transforms[i][0] = proc;
								break;
							}
						}
					});
				}
				for(i=0; i<pluginNames.length;){
					bc.plugins[bc.getSrcModuleInfo(pluginNames[i++]).mid] = arguments[argsPos++];
				}

				// start the transform engine: initialize bc.currentGate and bc.waiting, then discover and start each resource.
				// note: discovery procs will call bc.start with each discovered resource, which will call advance, which will
				// enter each resource in a race to the next gate, which will result in many bc.waiting incs/decs
				bc.waiting = 1;	// matches *1*
				bc.log("pacify", "discovering resources...");
				advanceGate(-1);
				discoveryProcs.forEach(function(proc){ proc(); });
				passGate();	 // matched *1*
			});
		}

		if(!bc.errorCount && bc.release){
			doBuild();
		}
	});
});

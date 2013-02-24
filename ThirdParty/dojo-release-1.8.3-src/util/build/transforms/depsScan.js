define([
	"require",
	"../buildControl",
	"../fileUtils",
	"../removeComments",
	"dojo/json",
	"dojo/_base/lang",
	"dojo/_base/loader",
	"../fs"
], function(require, bc, fileUtils, removeComments, json, lang, syncLoader, fs){
	return function(resource){
		var
			newline = bc.newline,

			mix = function(dest, src){
				dest = dest || {};
				for(var p in src){
					dest[p] = src[p];
				}
				return dest;
			},

			absMid = 0,

			aggregateDeps = [],

			defineApplied = 0,

			simulatedDefine = function(mid, dependencies, factory){
				defineApplied = 1;
				var
					arity = arguments.length,
					args = 0,
					defaultDeps = ["require", "exports", "module"];

				// TODO: add the factory scan?
				if(0){
					if(arity==1){
						dependencies = [];
						mid.toString()
							.replace(/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg, "")
							.replace(/require\(["']([\w\!\-_\.\/]+)["']\)/g, function(match, dep){
								dependencies.push(dep);
							});
						args = [0, defaultDeps.concat(dependencies), mid];
					}
				}
				if(!args){
					args = arity==1 ? [0, defaultDeps, mid] :
						(arity==2 ? (mid instanceof Array ? [0, mid, dependencies] : [mid, defaultDeps, dependencies]) :
							[mid, dependencies, factory]);
				}

				if(args[1].some(function(item){return !lang.isString(item);})){
					throw new Error("define dependency vector contains elements that are not of type string.");
				}

				absMid = args[0];
				aggregateDeps = aggregateDeps.concat(args[1]);
			},

			simulatedRequire = function(depsOrConfig, callbackOrDeps){
				// add contents of deps vector to aggregateDeps iff it contains no relative ids; do not process deps property in config
				var hasRelativeIds = function(deps){ return deps.some(function(item){ return /^\./.test(item); }); };
				if(lang.isArray(depsOrConfig) && !hasRelativeIds(depsOrConfig)){
					aggregateDeps = aggregateDeps.concat(depsOrConfig);
				}else if(lang.isArray(callbackOrDeps) && !hasRelativeIds(callbackOrDeps)){
					aggregateDeps = aggregateDeps.concat(callbackOrDeps);
				}
			},

			slashName = function(dottedName){
				return dottedName.replace(/\./g, "/");
			},

			pluginStrategyRequired =
				// truthy if dojo.loadInit|require[After]If|platformRequire detected that cannot be resolved at build-time; falsy otherwise
				0,

			dojoProvides =
				// vector of modules dojo.provide'd by the resource
				[],

			dojoRequires =
				// vector of modules dojo.require'd by the resource
				[],

			simulatedDojo =
				// the dojo legacy loader API
				{
					require:function(moduleName, omitModuleCheck){
						dojoRequires.push(slashName(moduleName));
					},
					provide:function(moduleName){
						dojoProvides.push(slashName(moduleName));
					},
					requireLocalization: function(moduleName, bundleName, locale){
						aggregateDeps.push("dojo/i18n!" + slashName(moduleName) + "/nls/" + (!locale || /root/i.test(locale) ? "" : locale + "/") + slashName(bundleName));
					},
					platformRequire:function(modMap){
						pluginStrategyRequired = 1;
						(modMap.common || []).concat((bc.platform && modMap[bc.platform]) || []).forEach(function(item){
							dojoRequires.push(lang.isArray(item) ? slashName(item[0]) : slashName(item));
						});
					},
					loadInit:function(callback){
						pluginStrategyRequired = 1;
						callback();
					},
					requireIf:function(expr, moduleName, omitModuleCheck){
						pluginStrategyRequired = 1;
						expr && dojoRequires.push(slashName(moduleName));
					},
					requireAfterIf:function(expr, moduleName, omitModuleCheck){
						pluginStrategyRequired = 1;
						expr && dojoRequires.push(slashName(moduleName));
					}
				},

			evaluatorWithNoRuntime =
				new Function("dojo", "__text", "eval(__text);"),

			applyLegacyCalls = function(callList){
				var evaluator;
				if(resource.pack.runtime){
					// if a runtime is provided, then a special evaluator has to be constructed
					var runtime = resource.pack.runtime,
						args = [],
						params = [],
						p;
					runtime.dojo = mix(runtime.dojo, simulatedDojo);
					for(p in runtime){
						args.push(runtime[p]);
						params.push(p);
					}
					evaluator = new Function("__bc", "__args", "__text", "(function(" + params.join(",") + "){ eval(__text); }).apply(__bc, __args);");
					args = [bc, args];
				}else{
					args = [simulatedDojo];
					evaluator = evaluatorWithNoRuntime;
				}

				// apply the legacy API calls
				var results = callList.map(function(application){
					try{
						evaluator.apply(bc, args.concat(application));
						return 0;
					}catch(e){
						pluginStrategyRequired = 1;
						return [e, application];
					}
				});

				// report the results
				results.forEach(function(item){
					if(item){
						bc.log("legacyFailedEval", ["module", resource.mid, "text", item[0], "error", item[1]]);
					}
				});
			},

			getAmdModule = function(
				mid,
				referenceModule
			){
				var match = mid.match(/^([^\!]+)\!(.*)$/);
				if(match){
					var pluginModuleInfo = bc.getSrcModuleInfo(match[1], referenceModule),
						pluginModule = pluginModuleInfo &&	bc.amdResources[pluginModuleInfo.mid],
						pluginId = pluginModule && pluginModule.mid,
						pluginProc = bc.plugins[pluginId];
					if(!pluginModule){
						return 0;
					}else if(!pluginProc){
						if(!pluginModule.noBuildResolver){
							bc.log("missingPluginResolver", ["module", resource.mid, "plugin", pluginId]);
						}
						return pluginModule;
					}else{
						return pluginProc.start(match[2], referenceModule, bc);
					}
				}else{
					var moduleInfo = bc.getSrcModuleInfo(mid, referenceModule),
						module = moduleInfo && bc.amdResources[moduleInfo.mid];
					return module;
				}
			},

			tagAbsMid = function(absMid){
				if(absMid && absMid!=resource.mid){
					bc.log("amdInconsistentMid", ["module", resource.mid, "specified", absMid]);
				}
				if(absMid){
					resource.tag.hasAbsMid = 1;
				}
			},

			processPureAmdModule = function(){
				// find the dependencies for this resource using the fast path if the module says it's OK
				// pure AMD says the module can be executed in the build environment
				// note: the user can provide a build environment with TODO
				try{
					if(resource.mid!="dojo/_base/loader" && /dojo\.(require|provide)\s*\(/.test(removeComments(resource.text))){
						bc.log("amdPureContainedLegacyApi", ["module", resource.mid]);
					}
					(new Function("define", "require", resource.text))(simulatedDefine, simulatedRequire);
					tagAbsMid(absMid);
				}catch (e){
					bc.log("amdFailedEval", ["module", resource.mid, "error", e]);
				}
			},

			convertToStrings = function(text){
				var strings = [],

					// a DFA, the states...
					spaces = "spaces",
					string = "string",
					endOfString = "endOfString",
					done = "done",
					error = "error",

					// the machine...
					dfa = {
						spaces:function(c){
							if(/\s/.test(c)){
								return spaces;
							}
							if(c=="'" || c=='"'){
								quoteType = c;
								current = "";
								return string;
							}
							if(c==0){
								return done;
							}
							return error;
						},
						string:function(c){
							if(c==quoteType){
								strings.push(current);
								return "endOfString";
							}else{
								current+= c;
								return "string";
							}
						},
						endOfString:function(c){
							if(/\s/.test(c)){
								return endOfString;
							}
							if(c==0){
								return done;
							}
							if(c==","){
								return spaces;
							}
							return error;
						}
					},

					state = spaces,

					quoteType, current;


				for(var i = 0; i<text.length; i++){
					state = dfa[state](text.charAt(i));
					if(state==error){
						return 0;
					}
				}
				if(dfa[state](0)!=error){
					return strings;
				}
				return 0;
			},

			processPossibleAmdWithRegExs = function(text){
				// look for AMD define and/or require; require must not have relative mids; require signature with config argument is not discovered
				// (remember, a config could have a string or regex that could have an unmatched right "}", so there is not way to guarantee we can find the correct
				// end of the config arg without parsing)

				var amdCallCount =
						// the number of AMD applications found
						0,

					defineExp=
						// look for define applications with an optional string first arg and an optional array second arg;
						// notice the regex stops after the second arg
						// a test run in the console
						// test = [
						//	'define("test")',
						//	'define("test", ["test1"])',
						//	'define("test", ["test1", "test2"])',
						//	'define(["test1"])',
						//	'define(["test1", "test2"])',
						//	'define("test", ["test1"], function(test){ hello;})',
						//	'define("test", function(test){ hello;})',
						//	'define(["test1"], function(test){ hello;})',
						//	'define(function(test){ hello;})',
						//	'define({a:1})'
						// ]
						//					  2					  3		 4				  5
						/(^|\s)define\s*\(\s*(["'][^'"]+['"])?\s*(,)?\s*(\[[^\]]*?\])?\s*(,)?/g,

					result;
				while((result = defineExp.exec(text)) != null){
					try{
						if(result[2]){
							// first arg a string
							if(result[3]){
								// first arg a module id
								if(result[5]){
									// (mid, deps, <factory>)
									result = result[0] + "{})";
								}else if(result[4]){
									// (mid, <factory:array value>)
									result = result[0] + ")";
								}else{
									// (mid, <factory>)
									result = result[0] + "{})";
								}
							}else{
								// (<factory:string-value>)
								result = result[0]	+ ")";
							}
						}else if(result[4]){
							// first arg an array
							if(result[5]){
								// (deps, <factory>)
								result = result[0] + "{})";
							}else{
								// (<factory:array-value>)
								result = result[0] + ")";
							}
						}else{
							//just a factory
							result = "define({})";
						}
						amdCallCount++;
						(new Function("define", result))(simulatedDefine);
						tagAbsMid(absMid);
					}catch(e){
						amdCallCount--;
						bc.log("amdFailedDefineEval", ["module", resource.mid, "text", result, "error", e]);
					}
				}

				var requireExp=
						// look for require applications with an array for the first arg; notice the regex stops after the first arg and config signature is not processed
						/(^|\s)require\s*\(\s*\[([^\]]*?)\]/g;
				while((result = requireExp.exec(text)) != null){
					var mids = convertToStrings(result[2]);
					if(mids){
						amdCallCount++;
						aggregateDeps = aggregateDeps.concat(mids.filter(function(item){return item.charAt(0)!=".";}));
					}
				}
				return amdCallCount;
			},

			evalNlsResource = function(resource){
				var bundleValue = 0;
				try{
					function simulatedDefine(a1, a2){
						if(lang.isString(a1) && lang.isObject(a2)){
							tagAbsMid(a1);
							bundleValue = a2;
						}else if(lang.isObject(a1)){
							bundleValue = a1;
						}
					}
					(new Function("define", resource.text))(simulatedDefine);
					if(bundleValue){
						resource.bundleValue = bundleValue;
						resource.bundleType = "amd";
						return;
					}
				}catch(e){
					// TODO: consider a profile flag to cause errors to be logged
				}
				try{
					bundleValue = (new Function("return " + resource.text + ";"))();
					if(lang.isObject(bundleValue)){
						resource.bundleValue = bundleValue;
						resource.bundleType = "legacy";
						return;
					}
				}catch(e){
					// TODO: consider a profile flag to cause errors to be logged
				}

				// if not building flattened layer bundles, then it's not necessary for the bundle
				// to be evaluable; still run processPureAmdModule to compute possible dependencies
				processPureAmdModule();
				if(!defineApplied){
					bc.log("i18nImproperBundle", ["module", resource.mid]);
				}
			},

			processNlsBundle = function(){
				// either a v1.x sync bundle or an AMD NLS bundle

				// compute and remember the set of localized bundles; attach this info to the root bundle
				var match = resource.mid.match(/(^.*\/nls\/)(([^\/]+)\/)?([^\/]+)$/),
					prefix = resource.prefix = match[1],
					locale = resource.locale = match[3],
					bundle = resource.bundle = match[4],
					rootPath = prefix + bundle,
					rootBundle = bc.amdResources[rootPath];

				// if not root, don't process any localized bundles; a missing root bundle serves as a signal
				// to other transforms (e.g., writeAmd) to ignore this bundle family
				if(!rootBundle){
					bc.log("i18nNoRoot" ["bundle", resource.mid]);
					return;
				}
				// accumulate all the localized versions in the root bundle
				if(!rootBundle.localizedSet){
					rootBundle.localizedSet = {};
				}

				// try to compute the value of the bundle; sets properties bundleValue and bundleType
				evalNlsResource(resource);

				if((bc.localeList || resource.bundleType=="legacy") && !resource.bundleValue){
					// profile is building flattened layer bundles or converting a legacy-style bundle
					// to an AMD-style bundle; either way, we need the value of the bundle
					bc.log("i18nUnevaluableBundle", ["module", resource.mid]);
				}

				if(resource.bundleType=="legacy" && resource===rootBundle && resource.bundleValue){
					resource.bundleValue = {root:resource.bundleValue};
				}

				if(resource!==rootBundle){
					rootBundle.localizedSet[locale] = resource;
				}
			},

			interningDojoUriRegExpString =
				// the following is a direct copy from the v1.6- build util; this is so janky, we dare not touch
				//23								 4				  5														6					   78					9						  0			  1
				"(((templatePath|templateCssPath)\\s*(=|:)\\s*)dojo\\.(module)?Url\\(|dojo\\.cache\\s*\\(\\s*)\\s*?[\\\"\\']([\\w\\.\\/]+)[\\\"\\'](([\\,\\s]*)[\\\"\\']([\\w\\.\\/-]*)[\\\"\\'])?(\\s*,\\s*)?([^\\)]*)?\\s*\\)",

			interningGlobalDojoUriRegExp = new RegExp(interningDojoUriRegExpString, "g"),

			interningLocalDojoUriRegExp = new RegExp(interningDojoUriRegExpString),

			internStrings = function(){
				var getText = function(src){
						return fs.readFileSync(src, "utf8");
					},
					skipping = [],
					notFound = [],
					nothing = [];

				resource.text = resource.text.replace(interningGlobalDojoUriRegExp, function(matchString){

					var parts = matchString.match(interningLocalDojoUriRegExp);

					var textModuleInfo = bc.getSrcModuleInfo(fileUtils.catPath(parts[6].replace(/\./g, "/"), parts[9]), 0, true);
					if(bc.internSkip(textModuleInfo.mid, resource)){
						return matchString;
					}

					var textModule = bc.resources[textModuleInfo.url];
					if(!textModule){
						notFound.push(textModuleInfo.url);
						return matchString;
					}

					// note: it's possible the module is being processed by a set of transforms that don't add a
					// getText method (e.g., copy); therefore, we provide one for these cases
					var text = (textModule.getText && textModule.getText()) || getText(textModule.src);
					if(!text){
						nothing.push(textModule.src);
						return matchString;
					}

					text = json.stringify(text);

					if(matchString.indexOf("dojo.cache") != -1){
						//Handle dojo.cache-related interning.
						var endContent = parts[11];
						if(!endContent){
							endContent = text;
						}else{
							var braceIndex = endContent.indexOf("{");
							if(braceIndex != -1){
								endContent = endContent.substring(0, braceIndex + 1)
									+ 'value: ' + text + ','
									+ endContent.substring(braceIndex + 1, endContent.length);
							}
						}
						return 'dojo.cache("' + parts[6] + '", "' + parts[9] + '", ' + endContent + ')';
					}else if(parts[3] == "templatePath"){
						//Replace templatePaths
						return "templateString" + parts[4] + text;
					}else{
						//Dealing with templateCssPath; not doing this anymore
						return matchString;
					}
				});
				if(skipping.length || notFound.length || nothing.length){
					var logArgs = ["module", resource.mid];
					if(skipping.length){
						logArgs.push("skipping", skipping);
					}
					if(notFound.length){
						logArgs.push("not found", notFound);
					}
					if(nothing.length){
						logArgs.push("nothing to intern", nothing);
					}
					bc.log("internStrings", logArgs);
				}
			},

			processWithRegExs = function(){
				// try to figure out if the module is legacy or AMD and then process the loader applications found
				//
				// Warning: the process is flawed because regexs will find things that are not there and miss things that are
				// there is no way around this without a proper parser.	 Note however, this kind of process has been in use
				// with the v1.x build system for a long time.
				//
				// TODO: replace this process with a parser
				//
				// do it the unreliable way; first try to find "dojo.provide" et al since those names are less likely
				// to be overloaded than "define" and "require"
				if(bc.internStrings){
					internStrings();
				}

				var text =
						// apply any replacements before processing
						resource.getText(),

					names =
						bc.scopeNames,

					extractResult =
						// a vector of legacy loader API applications as pairs of [function-name, complete-function-application-text] + the following two properties
						//	 * text: the original text with all dojo.loadInit applications preceeded by 0 &&, thereby causing those applications to be discarded by the minifier
						//	 * extractText: all legacy loader applications, with all dojo.loadInit applications moved to the beginning
						// See dojo.js
						syncLoader.extractLegacyApiApplications(text, removeComments(text));
				if(!extractResult.extractText && processPossibleAmdWithRegExs(removeComments(text))){
					// zero legacy calls detected *and* at least one AMD call detected; therefore, assume it's AMD
					bc.log("amdNotPureContainedNoLegacyApi", ["module", resource.mid]);
					return;
				}
				bc.log("legacyAssumed", ["module", resource.mid]);

				if(!extractResult){
					// no legacy API calls to worry about; therefore...
					resource.getText = function(){ return "define(" + json.stringify(names) + ", function(" + names.join(",") + "){" + newline + text + "});" + newline; };
					return;
				}
				// apply the legacy calls in a special environment
				applyLegacyCalls(extractResult[2]);

				// check for multiple or irrational dojo.provides
				if(dojoProvides.length){
					if(dojoProvides.length>1){
						bc.log("legacyMultipleProvides", ["module", resource.mid, "provides", dojoProvides]);
					}
					dojoProvides.forEach(function(item){
						if(item.replace(/\./g, "/")!=resource.mid){
							bc.log("legacyImproperProvide", ["module", resource.mid, "provide", item]);
						}
					});
				}

				if(pluginStrategyRequired){
					// some loadInit and/or require[After]If and/or platformRequire applications that could not be resolved at build time
					bc.log("legacyUsingLoadInitPlug", ["module", resource.mid]);

					// construct and start the synthetic plugin resource
					var pluginText, mid, pluginResource, pluginResourceId;
					pluginText =
						"// generated by build app" + newline +
						"define([], {" + newline +
						"\tnames:" + json.stringify(names) + "," + newline +
						"\tdef:function(" + names.join(",") + "){" + newline + extractResult[1] + "}" + newline +
						"});" + newline;
					mid = resource.mid + "-loadInit";
					pluginResource = mix({}, mix(resource, {
						src:resource.src.substring(0, resource.src.length-3) + "-loadInit.js",
						dest:bc.getDestModuleInfo(mid).url,
						mid:mid,
						tag:{loadInitResource:1},
						deps:[],
						getText:function(){ return pluginText; }
					}));
					bc.start(pluginResource);

					pluginResourceId = "dojo/loadInit!" + mid;
					aggregateDeps.push(pluginResourceId);
				}else if(dojoRequires.length){
					aggregateDeps.push("dojo/require!" + dojoRequires.join(","));
				}
				aggregateDeps = names.concat(aggregateDeps);
				// need to use extractResult[0] since it may delete the dojo.loadInit applications
				resource.getText = function(){ return "// wrapped by build app" + newline + "define(" + json.stringify(aggregateDeps) + ", function(" + names.join(",") + "){" + newline + extractResult[0] + newline + "});" + newline; };
			};

		// scan the resource for dependencies
		if(resource.tag.nls){
			processNlsBundle();
		}else if(resource.tag.amd || /\/\/>>\s*pure-amd/.test(resource.text)){
			processPureAmdModule();
		}else{
			processWithRegExs();
		}

		// resolve the dependencies into modules
		var deps = resource.deps;
		resource.aggregateDeps = aggregateDeps;
		aggregateDeps.forEach(function(dep){
			if(!(/^(require|exports|module)$/.test(dep))){
				try{
					var module = getAmdModule(dep, resource);
					if(lang.isArray(module)){
						module.forEach(function(module){ deps.push(module); });
					}else if(module){
						deps.push(module);
					}else{
						bc.log("amdMissingDependency", ["module", resource.mid, "dependency", dep]);
					}
				}catch(e){
					bc.log("amdMissingDependency", ["module", resource.mid, "dependency", dep, "error", e]);
				}
			}
		});

	};
});

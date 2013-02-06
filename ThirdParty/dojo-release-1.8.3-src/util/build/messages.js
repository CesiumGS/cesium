define([], function(){
	var categories = {
			info:[[100, 199]],
			warn:[[200, 299]],
			error:[[300, 399]],
			report:[[400, 499]]
		},

		messages = [
		// [order, numeric-id, symbolic-id, message]
		// info 100-199
		[1, 100, "legacyAssumed", "Assumed module uses legacy loader API."],
		[1, 101, "legacyUsingLoadInitPlug", "Using dojo/loadInit plugin for module."],
		[1, 102, "optimize", "Optimizing module"],
		[1, 103, "optimizeDone", "Optimizing module complete."],
		[1, 104, "optimizeMessages", "Optimizer messages."],
		[1, 105, "pacify", ""],
		[1, 106, "cssOptimize", "Optimizing CSS."],
		[1, 107, "packageVersion", "Package Version:"],
		[1, 108, "internStrings", "Interning strings."],
		[1, 109, "processHtmlFiles", "Processing HTML files."],
		[1, 110, "userTrace", "User trace:"],
		[1, 111, "userInfo", "User info:"],
		[1, 112, "cssOptimizeIgnored", "While optimizing a CSS file, an import directive was not expanded as instructed by the profile."],
		[1, 113, "cssOptimizeIgnoredMultiMediaTypes", "While optimizing a CSS file, an import directive was not expanded because it indicated multiple media types."],


		// warn 200-299
		[1, 200, "configUnresolvedValues", "Configuration contains unsolved values."],
		[1, 201, "amdCircularDependency", "Cycle detected in layer dependencies."],
		[1, 202, "amdInconsistentMid", "AMD module specified and absolute module identifier that is not consistent with the configuration and filename"],
		[1, 203, "amdPureContainedLegacyApi", "Module tagged as pure AMD yet it contains legacy loader API applications."],
		[1, 205, "amdNotPureContainedNoLegacyApi", "Module not tagged as pure AMD yet it contains AMD API applications."],
		[1, 206, "legacyMultipleProvides", "Module included multiple dojo.provide applications."],
		[1, 207, "legacyImproperProvide", "dojo.provide application identifier inconsistent with module identifier."],
		[1, 208, "inputDeprecatedProfileFile", "The \"profileFile\" switch has been deprecated; use \"profile\" instead."],
		[1, 209, "missingPackageJson", "Missing or empty package.json."],
		[1, 210, "inputDeprecatedStripConsole", "Given strip console value is deprecated."],
		[1, 211, "inputDeprecated", "Deprecated switch; ignored"],
		[1, 212, "oddDojoPath", "No profile.basePath provided, yet dojo path is relative and running build with the current working directory different than util/buildscripts"],
		[1, 213, "buildUsingDifferentDojo", "Dojo path specified in profile is different than the dojo being used for the build program"],
		[1, 214, "ignoringReleaseDirName", "DestBasePath given; ignoring releaseDir and releaseName."],
		[1, 215, "inputLoggerRemoved", "Logger has been removed; all calls ignored"],
		[1, 216, "dojoHasUnresolvedMid", "dojo/has plugin resource could not be resolved during build-time."],
		[1, 217, "cleanRemoved", "the clean action has been removed; use rm (*nix) or rmdir (Windows)"],
		[1, 218, "inputProfileFileDeprecated", "the command line switch profileFile is deprectated; use profile for both files and profiles"],
		[1, 219, "userWarn", "User warn:"],
		[1, 220, "outputToProfileFileDeprecated", "Writing htmlFiles- or htmlDirs-derived profile via the profileFile option is deprecated; use the writeProfile option instead"],
		[1, 221, "assumeLayerIsDojoModule", "Assumed layer is referencing a dojo module."],
		[1, 222, "assumeLayerDependencyIsDojoModule", "Assumed layer is referencing a dojo module."],
		[1, 223, "possibleLegacyModuleId", "Name in internStringsSkipList looks like a legacy module identifier."],
		[1, 224, "missingPluginResolver", "A plugin dependency was encountered but there was no build-time plugin resolver."],
		[1, 225, "missingDirDuringDiscovery", "A directory that was scheduled to be read during discovery did not exist."],
		[1, 226, "missingProfile", "A package without a profile could throw errors or warnings."],
		[1, 227, "symbolsLeak", "Inserting symbols (by setting the profile variable 'symbol') causes leaks in IE."],

		// error 300-399
		[1, 300, "dojoHasMissingPlugin", "Missing dojo/has module."],
		[1, 302, "dojoHasMissingMid", "Missing dojo/has plugin resource that was resolved at build-time."],
		[1, 303, "amdMissingLayerIncludeModule", "Missing include module for layer."],
		[1, 304, "amdMissingLayerExcludeModule", "Missing exclude module for layer."],
		[1, 305, "amdMissingLayerModuleText", "Missing module text for layer."],
		[1, 306, "legacyFailedEval", "Failed to evaluate legacy API application."],
		[1, 307, "amdFailedEval", "Failed to evaluate module tagged as pure AMD (fell back to processing with regular expressions)."],
		[1, 308, "amdFailedDefineEval", "Failed to evaluate AMD define function."],
		[1, 309, "i18nNoRoot", "Missing root bundle for locale-specific legacy i18n bundle"],
		[1, 310, "i18nImproperBundle", "Non-i18n module found in nls tree (copied only)."],
		[1, 311, "amdMissingDependency", "Missing dependency."],
		[1, 312, "optimizeFailedWrite", "Failed to write optimized file."],
		[1, 313, "cssOptimizeFailed", "Failed to optimize CSS file."],
		[1, 314, "execFailed", "(Rhino)External process threw."],
		[1, 315, "inputInvalidPath", "Unable to compute absolute path."],
		[1, 316, "inputUnknownAction", "Unknown action."],
		[1, 317, "inputUnknownStripConsole", "Unknown strip console value."],
		[1, 318, "inputUnknownLayerOptimize", "Unknown layer optimize value."],
		[1, 319, "inputUnknownOptimize", "Unknown optimize value."],
		[1, 320, "inputUnknownTransform", "Unknown transform."],
		[1, 321, "inputUnknownGate", "Unknown gate."],
		[1, 322, "inputNoLoaderForBoot", "Unable to find loader for boot layer."],
		[1, 323, "failedReadAndEval", "failed to read and eval file."],
		[1, 324, "transformFailed", "Error while transforming resource."],
		[1, 325, "discoveryFailed", "Failed to discover any resources to transform. Nothing to do; terminating application"],
		[1, 326, "overwrite", "Output intersects input"],
		[1, 327, "outputCollide", "Multiple resources are destined for same filename."],
		[1, 328, "noTransform", "No transform found for discovered resouce."],
		[1, 329, "layerToMidFailed", "Failed to resolve layer name into a module identifier."],
		[1, 330, "layerMissingDependency", "Failed to resolve layer dependency."],
		[1, 331, "getDependencyListRemoved", "load(\"getDependencyList.js\") is no supported."],
		[1, 332, "invalidMessageId", "Invalid message identifier."],
		[1, 333, "legacyMissingDependency", "Missing dependency in legacy module."],
		[1, 334, "amdCannotInstantiateLayer", "Cannot instantiate all modules in layer."],
		[1, 335, "dojoPragmaEvalFail", "Failed to evaluate dojo pragma."],
		[1, 336, "dojoPragmaInvalid", "Failed to find end marker for dojo pragma."],
		[1, 337, "inputMissingPackageJson", "Missing or empty package.json file at location specified by package flag."],
		[1, 337, "inputMalformedPackageJson", "Malformed package.json file."],
		[1, 338, "inputProfileDoesNotExist", "Profile given for \"profile\" switch does not exist."],
		[1, 339, "inputProfileFileDoesNotExist", "Profile file given for \"profileFile\" switch does not exist."],
		[1, 340, "inputHTMLFileDoesNotExist", "HTML file given for \"htmlFiles\" switch does not exist."],
		[1, 341, "inputHTMLDirDoesNotExist", "HTML directory given for \"htmlDir\" switch does not exist."],
		[1, 342, "inputHTMLDirNoFiles","HTML directory given for \"htmlDir\" switch contains no HTML files."],
		[1, 343, "inputIllegalCommandlineArg", "Illegal command line argument."],
		[1, 344, "inputFileDoesNotExist", "File does not exist."],
		[1, 345, "inputProcessingHtmlFileNotImplemented", "Pulling profiles from HTML files is not implemented."],
		[1, 346, "inputFailedReadfile", "Failed to read input file."],
		[1, 347, "inputFailedToEvalProfile", "Failed to evaluate profile file."],
		[1, 348, "userError", "User error:"],
		[1, 349, "missingPrefix", "Missing prefix for top-level module."],
		[1, 350, "cannotDeduceModuleIdFrom16LayerName", "Cannot deduce module identifier from layer name"],
		[1, 351, "cannotDeduceModuleIdFrom16LayerDependency", "Cannot deduce module identifier from layer dependency"],
		[1, 352, "optimizerReportedErrors", "Optimizer reported errors; consult build report for details."],
		[1, 352, "failedToReadLayerCopyrightFile", "Failed to read copyright file given with layer."],
		[1, 353, "i18nUnevaluableBundle", "I18n bundle was not evaluable in the build environment; therefore it will not be included in the flattening computations."],
		[1, 354, "missingL10n", "Root bundle indicates localized bundles that don't exist."],
		[1, 355, "declarativeRequireFailed", "Unable to convert declarative require."],
		[1, 356, "optimizeFailed", "The optimizer threw an exception; the module probably contains syntax errors."],
		[1, 357, "cssOptimizeUnableToResolveURL", "While optimizing a CSS file, it was impossible to compute the destination location of a relative URL."],
		[1, 358, "cssOptimizeImproperComment", "While optimizing a CSS file, an improper comment was encountered."],
		[1, 359, "cssOptimizeIgnoredNoResource", "While optimizing a CSS file, an import directive was not expanded because the source for the import was not available to the builder."],

		// reports 400-499
		[1, 400, "hasReport", "Has Features Detected"],
		[3, 499, "signoff", "Process completed normally:"]],

		// 500-999, reserved by build programs
		// 1000+, may be used by extension apps

		lastReportId = 400,

		lastUserId = 500,

		warnCount = 0,

		errorCount = 0,

		messageMap = {},

		pacifySet = {},

		getNewMessageId = function(report){
			return report ? ++lastReportId : ++lastUserId;
		},

		addMessage = function(order, numericId, symbolicId, message, pacifyMessage){
			for(var i= 0; i<messages.length; i++){
				if(messages[i][0]>order){
					break;
				}
			}
			messages.splice(i, 0, [order, numericId, symbolicId, message, []]);
			messageMap[symbolicId] = messages[i];

			if(pacifyMessage){
				pacifySet[symbolicId] = 1;
			}
		},

		addCategory = function(name, range){
			if(categories[name]){
				categories[name].push(range);
			}else{
				categories[name] = [range];
			}
		},

		getPrefix = function(id){
			var result;
			for(var p in categories){
				if(categories[p].some(function(range){
					if(range[0]<=id && id<range[1]){
						return result = p + "(" + id + ")";
					}
					return 0;
				})){
					return result;
				}
			}
			return "message-id(" + id + ")";
		},

		getArgs = function(args){
			var result = "";
			if(typeof args=="undefined"){
				// nothing to decode
			}else if(typeof args=="string"){
				result+= args;
			}else if(args.length==1){
				result+= args[0];
			}else{
				for(var i= 0; i<args.length;){
					result+= args[i++];
					if(i<args.length){
						result+= ": " + args[i++];
					}
					if(i<args.length){
						result+= "; ";
					}
				}
			}
			return result;
		},

		stop = 0,

		log = function(id, args){
			if(stop){
				return;
			}
			if(id=="pacify"){
				console.log(args);
			}else if(id in messageMap){
				var item = messageMap[id];
				item[4].push(args);
				if(200<=item[1] && item[1]<=299){
					warnCount++;
				}else if(300<=item[1] && item[1]<=399){
					errorCount++;
				}
				if(id in pacifySet){
					console.log(getPrefix(item[1]) + " " + item[3] + " " + getArgs(args));
				}
			}else{
				//require.nodeRequire("assert").fail(1, 2, "here", "x");
				messageMap.invalidMessageId[4].push(["id", id].concat(args));
			}
		},

		optimizerReportedErrors = 0,

		logOptimizerReportedErrors = function(){
			if(!optimizerReportedErrors){
				log("optimizerReportedErrors");
				optimizerReportedErrors = 1;
			}
		},

		optimizerOutput= "",

		logOptimizerOutput = function(text){
			if(/\sERROR\s/.test(text)){
				// the google closure error format
				logOptimizerReportedErrors();
			}
			optimizerOutput+= text;
		},

		getOptimizerOutput = function(){
			return optimizerOutput;
		},

		getAllNonreportMessages = function(){
			var result = "";
			messages.forEach(function(item){
				if ((item[1]<400 || 499<item[1]) && item[4].length){
					result+= getPrefix(item[1]) + " " + item[3] + "\n";
					item[4].forEach(function(item){
						result+= "\t" + getArgs(item) + "\n";
					});
				}
			});
			return result;
		},

		getAllReportMessages = function(){
			var result = "";
			messages.forEach(function(item){
				if (400<=item[1] && item[1]<=499 && item[4].length){
					result+= "\n\n" + item[3] + "\n";
					item[4].forEach(function(item){
						result+= "\t" + getArgs(item) + "\n";
					});
				}
			});
			return result;
		};

	// sort the messages; maybe some added, maybe they are out of order above
	var temp = messages;
	messages = [];
	temp.forEach(function(item){
		addMessage(item[0], item[1], item[2], item[3]);

		// by default, send all warnings and errors to the console
		if(200<=item[1] && item[1]<=399){
			pacifySet[item[2]] = 1;
		}
	});

	//also send this to the console
	pacifySet.packageVersion = 1;
	pacifySet.signoff = 1;

	return {
		stop:function(){stop = 1;},
		messages:messages,
		messageMap:messageMap,
		pacifySet:pacifySet,
		getNewMessageId:getNewMessageId,
		addMessage:addMessage,
		addCategory:addCategory,
		log:log,
		logOptimizerOutput:logOptimizerOutput,
		getOptimizerOutput:getOptimizerOutput,
		getAllNonreportMessages:getAllNonreportMessages,
		getAllReportMessages:getAllReportMessages,
		getWarnCount:function(){return warnCount;},
		getErrorCount:function(){return errorCount;},
		trace:function(message){log("userTrace", message);},
		info:function(message){log("userInfo", message);},
		warn:function(message){log("userWarn", message);},
		error:function(message){log("userError", message);}
	};
});

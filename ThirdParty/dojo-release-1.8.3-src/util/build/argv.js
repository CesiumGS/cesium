define([
	"require",
	"dojo/json",
	"dojo/has",
	"./fs",
	"./fileUtils",
	"./process",
	"commandLineArgs",
	"./stringify",
	"./version",
	"./messages",
	"./v1xProfiles",
	"dojo/text!./help.txt"
], function(require, json, has, fs, fileUtils, process, argv, stringify, version, messages, v1xProfiles, help){
	///
	// AMD-ID build/argv
	//
	// This module parses the command line and returns the result as a hash of from switch-name to switch value
	// plus the additional property profiles which is a a vector of profile objects build objects, ordered as
	// provided on the command line.
	//
	// Design of relative paths:
	//
	//	 * All relative source paths and relative bc.releaseDir are relative to bc.basePath
	//	 * All relative destination paths are relative to bc.releaseDir
	//	 * Relative bd.basePath found in a build control script is relative to the directory that contains the script
	//	 * Any relative path found on the command line is relative to the current working directory
	//
	// For each build control script that is compiled, if bc.basePath is undefined, it is set to the directory that
	// contains the script. Notice that this feature can be disabled by setting e.g., "basePath==0" in any build control script.

	eval(require.scopeify("./fileUtils"));
	var
		// used to build up the result
		result = {
			profiles:[]
		},

		cwd = process.cwd(),

		// we need to know the dojo path and the path to /util/buildscripts to process v1.x profiles and profiles in the
		// /util/buildscripts/profiles directory
		dojoPath = computePath(require.toUrl("dojo/package.json").match(/(.+)\/package\.json$/)[1], cwd),
		utilBuildscriptsPath = compactPath(catPath(dojoPath, "/../util/buildscripts")),

		printVersion = 0,
		printHelp = 0,
		checkArgs = 0,

		illegalArgumentValue = function(argumentName, position){
			messages.log("inputIllegalCommandlineArg", ["switch", argumentName, "position", position]);
		},

		evalScriptArg=
			function(arg){
				if(arg=="true"){
					return true;
				}else if(arg=="false"){
					return false;
				}else if(arg=="null"){
					return null;
				}else if(isNaN(arg)){
					return json.parse("{\"result\":\"" + arg + "\"}").result;
				}else{
					return Number(arg);
				}
			},

		readProfile = function(
			scriptType,
			filename
		){
			///
			// Load, evaluate and return the result of the contents of the file given by
			// filename in a scope type given by scriptType as follows:
			//
			// When scriptType is "require", contents of filename should be either an application of require to a configuration object or
			// a bare require object. The contents is evaluated as follows:
			// `code
			// (function(){
			//	 var __result = 0, require = function(config){__result=config;};
			//	 <contents>
			//	 return __result || require;
			// })();
			//
			// Notice if <contents> defines require as a bare object, it will overwrite the provided require, result will be 0, and the bare
			// object will be returned; otherwise, if <contents> contains an application to a configuration object, result will be truthy
			// and therefore be returned.
			//
			// When scriptType is "dojoConfig", contents of filename should include the variable "dojoConfig" which should hold a
			// a dojo loader configuration:
			// `code
			// (function(){
			//	 <contents>
			//	 return dojoConfig;
			// })();
			//
			// When scriptType is "profile", contents of filename should be Javascript code that either defines the variable "dependencies"
			// or the variable "profile". The name dependencies is deprecated; if both names exist, then the value of dependencies is ignored.
			// The value should be a Javascript object that contains profile properties necessary to effect the desired output. If filename does not
			// contain a ".js" suffix, then it is assumed to be a profile in the /util/buildscripts/profile directory
			// `code
			// (function(selfPath, profile, dependencies){
			//	 return profile || dependencies;
			// })(<filename>, 0, 0);
			//
			// For script types "require" and "dojoConfig", if filename gives the filetype ".html" or ".htm", then the file is assumed to be
			// an html file that contains a <script> element that contains Javascript source code as described above.
			//
			// If a profile is processed and it contains the property prefixes or the property layers with a layer further containing the property
			// dependencies, then it is assumed to be a pre-version 1.7 build profile and the following additional processing is accomplished:
			//
			// If result contains the property basePath and/or build.basePath that is a relative path, then these are normalized
			// with respect to the path given by filename.

			// remember the the directory of the last build script processed; this is the default location of basePath
			var path = getFilepath(filename);

			if(!fileExists(filename)){
				messages.log("inputFileDoesNotExist", [scriptType, filename]);
				return 0;
			}

			try{
				var src = fs.readFileSync(filename, "utf8");
			}catch (e){
				messages.log("inputFailedReadfile", [scriptType, filename, "error", e]);
				return 0;
			}

			if(scriptType=="profileFile"){
				messages.log("inputProfileFileDeprecated");
				scriptType = "profile";
			}

			var fixupBasePath = function(profile){
					// relative basePath is relative to the directory in which the profile resides
					// all other relative paths are relative to basePath or releaseDir, and releaseDir, if relative, is relative to basePath
					var fixupBasePath = function(path, referencePath){
						if(path){
							path = computePath(path, referencePath);
						}else if(typeof path == "undefined"){
							path = referencePath;
						}
						return path;
					};
					profile.basePath = fixupBasePath(profile.basePath, path);
					if(profile.build && profile.build.basePath){
						profile.build.basePath = fixupBasePath(profile.build.basePath, path);
					}
				},
				f, profile;
			try{
				src = fs.readFileSync(filename, "utf8");
				if(scriptType=="require"){
					f = new Function("var __result, require= function(config){__result=config;};" + src + "; return __result || require;");
					profile = f();
					fixupBasePath(profile);
				}else if(scriptType=="dojoConfig"){
					f = new Function(src + "; return dojoConfig;");
					profile = f();
					fixupBasePath(profile);
				}else if(scriptType=="profile"){
					f = new Function("selfPath", "logger", "profile", "dependencies",
									 src + "; return {profile:profile, dependencies:dependencies}");
					profile = f(path, messages, 0, 0, 0);
					if(profile.profile){
						profile = profile.profile;
						fixupBasePath(profile);
					}else{
						profile = v1xProfiles.processProfile(profile.dependencies, dojoPath, utilBuildscriptsPath, path);
						// notice we do *not* fixup the basePath for legacy profiles since they have no concept of basePath
					}
				}
				profile.selfFilename = filename;
				messages.log("pacify", "processing " + scriptType + " resource " + filename);
				return profile;
			}catch(e){
				messages.log("inputFailedToEvalProfile", [scriptType, filename, "error", e]);
				return 0;
			}
		},

		processHtmlDir = function(arg){
			if(!fileUtils.dirExists(arg)){
				messages.log("inputHTMLDirDoesNotExist", ["directory", arg]);
				return 0;
			}else{
				var htmlFiles = [];
				fs.readdirSync(arg).forEach(function(filename){
					if(/\.html$/.test(filename)){
						htmlFiles.push(arg + "/" + filename);
					}
				});
				if(!htmlFiles.length){
					messages.log("inputHTMLDirNoFiles", ["directory", arg]);
					return 0;
				}else{
					return v1xProfiles.processHtmlFiles(htmlFiles, dojoPath, utilBuildscriptsPath);
				}
			}
		},

		processHtmlFiles = function(arg){
			var htmlFiles = arg.split(",").filter(function(filename){
				if(!fileUtils.fileExists(filename)){
					messages.log("inputHTMLFileDoesNotExist", ["filename", filename]);
					return 0;
				}else{
					return 1;
				}
			});
			if(htmlFiles.length){
				return v1xProfiles.processHtmlFiles(htmlFiles, dojoPath, utilBuildscriptsPath);
			}else{
				return 0;
			}
		},

		readPackageJson = function(filename, missingMessageId){
			if(!fileUtils.fileExists(filename)){
				messages.log(missingMessageId, ["filename", filename]);
			}else{
				try{
					var result = json.parse(fs.readFileSync(filename, "utf8"));
					result.selfFilename = filename;
					return result;
				}catch(e){
					messages.log("inputMalformedPackageJson", ["filename", filename]);
				}
			}
			return 0;
		},

		processPackageJson = function(packageRoot){
			// process all the packages given by package.json first since specific profiles are intended to override the defaults
			// packageRoot gives a path to a location where a package.json rides
			var packageJsonFilename = catPath(packageRoot, "package.json"),
				packageJson= readPackageJson(packageJsonFilename, "inputMissingPackageJson");
			if(packageJson){
				// use package.json to define a package config
				packageJson.selfFilename = packageJsonFilename;
				result.profiles.push({
					packages:[{
						name:packageJson.progName || packageJson.name,
						packageJson:packageJson
					}]
				});
			}
		},

		readCopyrightOrBuildNotice = function(filename, hint){
			if(!fileExists(filename)){
				messages.log("inputFileDoesNotExist", [hint, filename]);
			}
			try{
				var prop = hint=="copyrightFile" ? "copyright" : "buildNotice";
				result[prop] = fs.readFileSync(filename, "utf8");
			}catch (e){
				messages.log("inputFailedReadfile", [hint, filename, "error", e]);
			}
		},

		normalizeSwitch = {
			"-p":"profile",
			"--profile":"profile",
			"--profileFile":"profileFile",
			"p":"profile",
			"profile":"profile",
			"profileFile":"profileFile",

			"--package":"package",
			"package":"package",

			"--require":"require",
			"require":"require",

			"--dojoConfig":"dojoConfig",
			"dojoConfig":"dojoConfig",

			"--htmlDir":"htmlDir",
			"htmlDir":"htmlDir",

			"--htmlFiles":"htmlFiles",
			"htmlFiles":"htmlFiles",

			"--copyrightFile":"copyrightFile",
			"copyrightFile":"copyrightFile",

			"--buildNoticeFile":"buildNoticeFile",
			"buildNoticeFile":"buildNoticeFile"
		};

	//arg[0] is "load=build"; therefore, start with argv[1]
	for (var arg, processVector = [], i = 1, end = argv.length; i<end;){
		arg = argv[i++];
		switch (arg){
			case "-p":
			case "--profile":
				if(i<end){
					processVector.push([normalizeSwitch[arg], argv[i++], cwd]);
				}else{
					illegalArgumentValue(arg, i);
				}
				break;

			case "--profileFile":
			case "--require":
			case "--dojoConfig":
			case "--htmlDir":
			case "--htmlFiles":
			case "--copyrightFile":
			case "--buildNoticeFile":
				if(i<end){
					processVector.push([normalizeSwitch[arg], getAbsolutePath(argv[i++], cwd)]);
				}else{
					illegalArgumentValue(arg, i);
				}
				break;

			case "--package":
				if(i<end){
					argv[i++].split(",").forEach(function(path){
						processVector.push(["package", getAbsolutePath(path, cwd)]);
					});
				}else{
					illegalArgumentValue(arg, i);
				}
				break;

			case "--writeProfile":
				if(i<end){
					result.writeProfile = getAbsolutePath(argv[i++], cwd);
				}else{
					illegalArgumentValue(arg, i);
				}
				break;

			case "--check":
				// read, process, and send the profile to the console and then exit
				result.check = true;
				break;

			case "--check-args":
				// read and process the command line args, send the profile to the console and then exit
				checkArgs = true;
				break;

			case "--check-discovery":
				// echo discovery and exit
				result.checkDiscovery = true;
				result.release = true;
				break;

			case "--debug-check":
				// read, process, and send the profile to the console, including gory details, and then exit
				result.debugCheck = true;
				break;

			case "--clean":
				// deprecated; warning given when the profile is processed
				result.clean = true;
				break;

			case "-r":
			case "--release":
				// do a build
				result.release = true;
				break;

			case "--help":
				// print help message
				printHelp = true;
				break;

			case "-v":
				// print the version
				printVersion = function(){
					messages.log("pacify", version+"");
				};
				break;

			case "--unit-test":
				// special hook for testing
				if(i<end){
					result.unitTest = argv[i++];
				}else{
					illegalArgumentValue("unit-test", i);
				}
				break;

			case "--unit-test-param":
				// special hook for testing
				if(i<end){
					result.unitTestParam = result.unitTestParam || [];
					result.unitTestParam.push(evalScriptArg(argv[i++]));
				}else{
					illegalArgumentValue("unit-test", i);
				}
				break;

			default:
				// possible formats
				//
				//	 -switch value
				//	 --switch value
				//	 switch=value

				var match = arg.match(/^\-\-?(.+)/);
				if(match && i<end){
					// all of the switches that take no values are listed above; therefore,
					// *must* provide a value
					result[match[1]] = evalScriptArg(argv[i++]);
				}else{
					// the form switch=value does *not* provide an individual value arg (it's all one string)
					var parts = arg.split("=");
					if(parts.length==2){
						switch(parts[0]){
							case "p":
							case "profile":
								processVector.push([normalizeSwitch[parts[0]], parts[1]]);
								break;

							case "package":
								parts[1].split(",").forEach(function(path){
									processVector.push(["package", getAbsolutePath(path, cwd)]);
								});
								break;

							case "profileFile":
							case "require":
							case "dojoConfig":
							case "htmlDir":
							case "htmlFiles":
							case "copyrightFile":
							case "buildNoticeFile":
								processVector.push([normalizeSwitch[parts[0]], getAbsolutePath(parts[1], cwd)]);
								break;
							default:
								result[parts[0]] = evalScriptArg(parts[1]);
						}
					}else{
						illegalArgumentValue(arg, i);
					}
				}
		}
	}

	// if processing html files and a nonexisting profile file is given, then assume the user intends to write
	// the computed profile to that file. This feature is deprecated; use the switch --writeProfile
	var processingHtmlFiles = processVector.some(function(item){ return item[0]=="htmlFiles" || item[0]=="htmlDir"; });
	if(processingHtmlFiles){
		for(i= 0; i<processVector.length; i++){
			if(processVector[i][0]=="profileFile" && !fileExists(processVector[i][1])){
				messages.log("outputToProfileFileDeprecated");
				result.writeProfile = processVector[i][1];
				processVector.splice(i, 1);
				break;
			}
		}
	}
	processVector.forEach(function(item){
		// item[0] is the switch
		// item[1] is an absolute filename
		var profile;
		switch(item[0]){
			case "profile":
				var type = getFiletype(item[1], true), filename;
				if(type==""){
					// prefer a user profile, then the stock profiles
					filename = getAbsolutePath(item[1] + ".profile.js", cwd);
					if(!fileExists(filename) && !/\//.test(item[1])){
						// the name given include no path; maybe it's a stock profile
						filename = catPath(utilBuildscriptsPath, "profiles/" + item[1] + ".profile.js");
					}
					if(!fileExists(filename)){
						messages.log("inputFileDoesNotExist", ["filename", filename]);
						break;
					}
				}else if(/^(html|htm)$/.test(type)){
					messages.log("inputProcessingHtmlFileNotImplemented", ["profile", filename]);
					return;
				}else{
					filename = getAbsolutePath(item[1], cwd);
				}
				profile = readProfile(item[0], filename);
				break;
			case "htmlDir":
				profile = processHtmlDir(item[1]);
				break;
			case "htmlFiles":
				profile = processHtmlFiles(item[1]);
				break;
			case "package":
				profile = processPackageJson(item[1]);
				break;
			case "copyrightFile":
			case "buildNoticeFile":
				profile = readCopyrightOrBuildNotice(item[1], item[0]);
				break;
			default:
				profile = readProfile(item[0], item[1]);
		}
		if(profile){
			result.profiles.push(profile);
		}
	});



	if(((printHelp || printVersion) && argv.length==2) || (printHelp && printVersion && argv.length==3)){
		//just asked for either help or version or both; don't do more work or reporting
		if(printHelp){
			messages.log("pacify", help);
			messages.log("pacify", version+"");
			has("host-rhino") && messages.log("pacify", "running under rhino");
			has("host-node") && messages.log("pacify", "running under node");
		}
		printVersion && printVersion();
		process.exit(0);
		return 0;
	}

	printVersion && printVersion();

	if (checkArgs){
		messages.log("pacify", stringify(result));
		process.exit(0);
		return 0;
	}

	if(messages.getErrorCount()){
		messages.log("pacify", "errors on command line; terminating application.");
		process.exit(-1);
		return 0;
	}

	if(!result.profiles.length){
		messages.log("pacify", "no profile provided; use the option --help for help");
		process.exit(-1);
		return 0;
	}

	if(result.unitTest=="argv"){
		var testId = result.unitTestParam[0],
			writingExpected = testId<0;
		if(writingExpected){
			testId = -testId;
		}
		result.unitTestParam = testId;
		var expectedFilename = compactPath(utilBuildscriptsPath + "/../build/tests/argvTestsExpected.js"),
			expected = json.parse(fs.readFileSync(expectedFilename, "utf8")),
			pathNormalize = utilBuildscriptsPath.match(/(.*)\/util\/buildscripts/)[1],
			testResult = stringify(result).replace(RegExp(pathNormalize, "g"), "~"),
			passed = 1;

		if(writingExpected){
			// write out the expected result;
			console.log("result:");
			debug(testResult);
			expected[result.unitTestParam] = testResult;
			fs.writeFileSync(expectedFilename, json.stringify(expected), "utf8");
		}else{
			passed = testResult==expected[result.unitTestParam];
			console.log(result.unitTestParam + ":" + (passed ? "PASSED" : "FAILED"));
			if(!passed){
				console.log("Expected:");
				console.log(expected[result.unitTestParam]);
				console.log("But Got:");
				console.log(testResult);
			}
		}
		process.exit(passed ? 0 : -1);
	}

	return {
		args:result,
		readPackageJson:readPackageJson,
		readProfile:readProfile
	};
});



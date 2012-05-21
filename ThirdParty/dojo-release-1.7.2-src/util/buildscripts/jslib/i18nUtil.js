i18nUtil = {};

i18nUtil.setup = function(/*Object*/kwArgs){
	//summary: loads dojo so we can use it for i18n bundle flattening.
	
	//Do the setup only if it has not already been done before.
	if(typeof djConfig == "undefined" || !(typeof dojo != "undefined" && dojo["i18n"])){
		djConfig={
			locale: 'xx',
			extraLocale: kwArgs.localeList,
			baseUrl: buildScriptsPath + "../../dojo/"
		};

		load(buildScriptsPath + '../../dojo/dojo.js');

		//Now set baseUrl so it is current directory, since all the prefixes
		//will be relative to the release dir from this directory.
		dojo.baseUrl = "./";

		//Also be sure we register the right paths for module prefixes.
		buildUtil.configPrefixes(kwArgs.profileProperties.dependencies.prefixes);

		dojo.require("dojo.i18n");
	}
}

i18nUtil.flattenLayerFileBundles = function(/*String*/fileName, /*String*/fileContents, /*Object*/kwArgs){
	//summary:
	//		This little utility is invoked by the build to flatten all of the JSON resource bundles used
	//		by dojo.requireLocalization(), much like the main build itself, to optimize so that multiple
	//		web hits will not be necessary to load these resources.  Normally, a request for a particular
	//		bundle in a locale like "en-us" would result in three web hits: one looking for en_us/ another
	//		for en/ and another for ROOT/.  All of this multiplied by the number of bundles used can result
	//		in a lot of web hits and latency.  This script uses Dojo to actually load the resources into
	//		memory, then flatten the object and spit it out using dojo.toJson.  The bootstrap
	//		will be modified to download exactly one of these files, whichever is closest to the user's
	//		locale.
	//fileName:
	//		The name of the file to process (like dojo.js). This function will use
	//		it to determine the best resource name to give the flattened bundle.
	//fileContents:
	//		The contents of the file to process (like dojo.js). This function will look in
	//		the contents for dojo.requireLocation() calls.
	//kwArgs:
	//		The build's kwArgs.
	
	var destDirName = fileName.replace(/\/[^\/]+$/, "/") + "nls";
	var nlsNamePrefix = fileName.replace(/\.js$/, "");
	nlsNamePrefix = nlsNamePrefix.substring(nlsNamePrefix.lastIndexOf("/") + 1, nlsNamePrefix.length);

	i18nUtil.setup(kwArgs);
	var djLoadedBundles = [];
	
	//TODO: register plain function handler (output source) in jsonRegistry?
	var drl = dojo.requireLocalization;
	var dupes = {};
	dojo.requireLocalization = function(modulename, bundlename, locale){
		var dupName = [modulename, bundlename, locale].join(":");
		if(!dupes[dupName]){
			drl(modulename, bundlename, locale);
			djLoadedBundles.push({modulename: modulename, module: eval(modulename), bundlename: bundlename});
			dupes[dupName] = 1;
		}
	};
	
	var requireStatements = fileContents.match(/dojo\.requireLocalization\(.*\)\;/g);
	if(requireStatements){
		eval(requireStatements.join(";"));

		//print("loaded bundles: "+djLoadedBundles.length);
		
		var djBundlesByLocale = {};
		var jsLocale, entry, bundle;
		
		for (var i = 0; i < djLoadedBundles.length; i++){
			entry = djLoadedBundles[i];
			bundle = entry.module.nls[entry.bundlename];
			for (jsLocale in bundle){
				if (!djBundlesByLocale[jsLocale]){djBundlesByLocale[jsLocale]=[];}
				djBundlesByLocale[jsLocale].push(entry);
			}
		}
		
		localeList = [];
		
		//Save flattened bundles used by dojo.js.
		var mkdir = false;
		var dir = new java.io.File(destDirName);
		var modulePrefix = buildUtil.mapPathToResourceName(fileName, kwArgs.profileProperties.dependencies.prefixes);

		//Adjust modulePrefix to include the nls part before the last segment.
		var lastDot = modulePrefix.lastIndexOf(".");
		if(lastDot != -1){
			modulePrefix = modulePrefix.substring(0, lastDot + 1) + "nls." + modulePrefix.substring(lastDot + 1, modulePrefix.length);
		}else{
			throw "Invalid module prefix for flattened bundle: " + modulePrefix;
		}

		for (jsLocale in djBundlesByLocale){
			var locale = jsLocale.replace(/\_/g, '-');
			if(!mkdir){ dir.mkdir(); mkdir = true; }
			
			var outFile = new java.io.File(dir, nlsNamePrefix + "_" + locale + ".js");
			//Make sure we can create the final file.
			var parentDir = outFile.getParentFile();
			if(!parentDir.exists()){
				if(!parentDir.mkdirs()){
					throw "Could not create directory: " + parentDir.getAbsolutePath();
				}
			}

			var os = new java.io.BufferedWriter(
					new java.io.OutputStreamWriter(new java.io.FileOutputStream(outFile), "utf-8"));
			try{
				os.write("dojo.provide(\""+modulePrefix+"_"+locale+"\");");
				for (var j = 0; j < djLoadedBundles.length; j++){
					entry = djLoadedBundles[j];
					var bundlePkg = [entry.modulename,"nls",entry.bundlename].join(".");
					var translationPkg = [bundlePkg,jsLocale].join(".");
					bundle = entry.module.nls[entry.bundlename];
					if(bundle[jsLocale]){ //FIXME:redundant check?
						os.write("dojo.provide(\""+bundlePkg+"\");");
						os.write(bundlePkg+"._built=true;");
						os.write("dojo.provide(\""+translationPkg+"\");");
						os.write(translationPkg+"="+dojo.toJson(bundle[jsLocale])+";");
					}
				}
			}finally{
				os.close();
			}
			localeList.push(locale);
		}
		
		//Remove dojo.requireLocalization calls from the file.
		fileContents = fileContents.replace(/dojo\.requireLocalization\(.*\)\;/g, "");


		var preloadCall = '\ndojo.i18n._preloadLocalizations("' + modulePrefix + '", ' + dojo.toJson(localeList.sort()) + ');\n';
		//Inject the dojo._preloadLocalizations call into the file.
		//Do this at the end of the file, since we need to make sure dojo.i18n has been loaded.
		//The assumption is that if dojo.i18n is not in this layer file, dojo.i18n is
		//in one of the layer files this layer file depends on.
		//Allow call to be inserted in the dojo.js closure, if that is in play.
		i18nUtil.preloadInsertionRegExp.lastIndex = 0;
		if(fileContents.match(i18nUtil.preloadInsertionRegExp)){
			i18nUtil.preloadInsertionRegExp.lastIndex = 0;
			fileContents = fileContents.replace(i18nUtil.preloadInsertionRegExp, preloadCall);
		}else{
			fileContents += preloadCall;
		}
	}

	return fileContents; //String
}

i18nUtil.preloadInsertionRegExp = /\/\/INSERT dojo.i18n._preloadLocalizations HERE/;

i18nUtil.flattenDirBundles = function(/*String*/prefixName, /*String*/prefixDir, /*Object*/kwArgs, /*RegExp*/nlsIgnoreRegExp){
	//summary: Flattens the i18n bundles inside a directory so that only request
	//is needed per bundle. Does not handle resource flattening for dojo.js or
	//layered build files.

	i18nUtil.setup(kwArgs);
	var fileList = fileUtil.getFilteredFileList(prefixDir, /\.js$/, true);
	var prefixes = kwArgs.profileProperties.dependencies.prefixes;
	for(var i= 0; i < fileList.length; i++){
		//Use new String so we get a JS string and not a Java string.
		var jsFileName = String(fileList[i]);
		var fileContents = null;
		
		//Files in nls directories, except for layer bundles that already have been processed.
		if(jsFileName.match(/\/nls\//) && !jsFileName.match(nlsIgnoreRegExp)){
			fileContents = "(" + i18nUtil.makeFlatBundleContents(prefixName, prefixDir, jsFileName) + ")";
		}else{
			fileContents = i18nUtil.modifyRequireLocalization(readText(jsFileName), prefixes);
		}

		if(fileContents){
			fileUtil.saveUtf8File(jsFileName, fileContents);
		}
	}
}

i18nUtil.modifyRequireLocalization = function(/*String*/fileContents, /*Array*/prefixes){
	//summary: Modifies any dojo.requireLocalization calls in the fileContents to have the
	//list of supported locales as part of the call. This allows the i18n loading functions
	//to only make request(s) for locales that actually exist on disk.
	var dependencies = [];
	
	//Make sure we have a JS string, and not a Java string.
	fileContents = String(fileContents);
	
	var modifiedContents = fileContents;
	
	if(fileContents.match(buildUtil.globalRequireLocalizationRegExp)){
		modifiedContents = fileContents.replace(buildUtil.globalRequireLocalizationRegExp, function(matchString){
			var replacement = matchString;
			var partMatches = matchString.match(buildUtil.requireLocalizationRegExp);
			var depCall = partMatches[1];
			var depArgs = partMatches[2];
	
			if(depCall == "requireLocalization"){
				//Need to find out what locales are available so the dojo loader
				//only has to do one script request for the closest matching locale.
				var reqArgs = i18nUtil.getRequireLocalizationArgsFromString(depArgs);
				if(reqArgs.moduleName){
					//Find the list of locales supported by looking at the path names.
					var locales = i18nUtil.getLocalesForBundle(reqArgs.moduleName, reqArgs.bundleName, prefixes);
	
					//Add the supported locales to the requireLocalization arguments.
					if(!reqArgs.localeName){
						depArgs += ", null";
					}
	
					depArgs += ', "' + locales.join(",") + '"';
					
					replacement = "dojo." + depCall + "(" + depArgs + ")";
				}
			}
			return replacement;
		});
	}
	return modifiedContents;
}

i18nUtil.makeFlatBundleContents = function(prefix, prefixPath, srcFileName){
	//summary: Given a nls file name, flatten the bundles from parent locales into the nls bundle.
	var bundleParts = i18nUtil.getBundlePartsFromFileName(prefix, prefixPath, srcFileName);
	if(!bundleParts){
		return null;
	}
	var moduleName = bundleParts.moduleName;
	var bundleName = bundleParts.bundleName;
	var localeName = bundleParts.localeName;

	dojo.requireLocalization(moduleName, bundleName, localeName);
	
	//Get the generated, flattened bundle.
	var module = dojo.getObject(moduleName);
	var bundleLocale = localeName ? localeName.replace(/-/g, "_") : "ROOT";
	var flattenedBundle = module.nls[bundleName][bundleLocale];
	
	if(!flattenedBundle){
		throw "Cannot create flattened bundle for src file: " + srcFileName;
	}

	return dojo.toJson(flattenedBundle);
}

//Given a module and bundle name, find all the supported locales.
i18nUtil.getLocalesForBundle = function(moduleName, bundleName, prefixes){
	//Build a path to the bundle directory and ask for all files that match
	//the bundle name.
	var filePath = buildUtil.mapResourceToPath(moduleName, prefixes);
	
	var bundleRegExp = new RegExp("nls[/]?([\\w\\-]*)/" + bundleName + ".js$");
	var bundleFiles = fileUtil.getFilteredFileList(filePath + "nls/", bundleRegExp, true);
	
	//Find the list of locales supported by looking at the path names.
	var locales = [];
	for(var j = 0; j < bundleFiles.length; j++){
		var bundleParts = bundleFiles[j].match(bundleRegExp);
		if(bundleParts && bundleParts[1]){
			locales.push(bundleParts[1]);
		}else{
			locales.push("ROOT");
		}
	}

	return locales.sort();
}

i18nUtil.getRequireLocalizationArgsFromString = function(argString){
	//summary: Given a string of the arguments to a dojo.requireLocalization
	//call, separate the string into individual arguments.
	var argResult = {
		moduleName: null,
		bundleName: null,
		localeName: null
	};
	
	var l10nMatches = argString.split(/\,\s*/);
	if(l10nMatches && l10nMatches.length > 1){
		argResult.moduleName = l10nMatches[0] ? l10nMatches[0].replace(/\"/g, "") : null;
		argResult.bundleName = l10nMatches[1] ? l10nMatches[1].replace(/\"/g, "") : null;
		argResult.localeName = l10nMatches[2];
	}
	return argResult;
}

i18nUtil.getBundlePartsFromFileName = function(prefix, prefixPath, srcFileName){
	//Pull off any ../ values from prefix path to make matching easier.
	var prefixPath = prefixPath.replace(/\.\.\//g, "");

	//Strip off the prefix path so we can find the real resource and bundle names.
	var prefixStartIndex = srcFileName.lastIndexOf(prefixPath);
	if(prefixStartIndex != -1){
		var startIndex = prefixStartIndex + prefixPath.length;
		
		//Need to add one if the prefiPath does not include an ending /. Otherwise,
		//We'll get extra dots in our bundleName.
		if(prefixPath.charAt(prefixPath.length) != "/"){
			startIndex += 1;
		}
		srcFileName = srcFileName.substring(startIndex, srcFileName.length);
	}
	
	//var srcIndex = srcFileName.indexOf("src/");
	//srcFileName = srcFileName.substring(srcIndex + 4, srcFileName.length);
	var parts = srcFileName.split("/");

	//Split up the srcFileName into arguments that can be used for dojo.requireLocalization()
	var moduleParts = [prefix];
	for(var i = 0; parts[i] != "nls"; i++){
		moduleParts.push(parts[i]);
	}
	var moduleName = moduleParts.join(".");
	if(parts[i+1].match(/\.js$/)){
		var localeName = "";
		var bundleName = parts[i+1];
	}else{
		var localeName = parts[i+1];
		var bundleName = parts[i+2];
	}

	if(!bundleName || bundleName.indexOf(".js") == -1){
		//Not a valid bundle. Could be something like a README file.
		return null;
	}else{
		bundleName = bundleName.replace(/\.js/, "");
	}

	return {moduleName: moduleName, bundleName: bundleName, localeName: localeName};
}

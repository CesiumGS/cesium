//Helper functions to deal with file I/O.

var fileUtil = {};

fileUtil.getLineSeparator = function(){
	//summary: Gives the line separator for the platform.
	//For web builds override this function.
	return java.lang.System.getProperty("line.separator"); //Java String
}

fileUtil.getFilteredFileList = function(/*String*/startDir, /*RegExp*/regExpFilters, /*boolean?*/makeUnixPaths, /*boolean?*/startDirIsJavaObject, /*boolean?*/dontRecurse){
	//summary: Recurses startDir and finds matches to the files that match regExpFilters.include
	//and do not match regExpFilters.exclude. Or just one regexp can be passed in for regExpFilters,
	//and it will be treated as the "include" case.
	//Ignores files/directories that start with a period (.).
	var files = [];

	var topDir = startDir;
	if(!startDirIsJavaObject){
		topDir = new java.io.File(startDir);
	}

	var regExpInclude = regExpFilters.include || regExpFilters;
	var regExpExclude = regExpFilters.exclude || null;

	if(topDir.exists()){
		var dirFileArray = topDir.listFiles();
		for (var i = 0; i < dirFileArray.length; i++){
			var file = dirFileArray[i];
			if(file.isFile()){
				var filePath = file.getPath();
				if(makeUnixPaths){
					//Make sure we have a JS string.
					filePath = new String(filePath);
					if(filePath.indexOf("/") == -1){
						filePath = filePath.replace(/\\/g, "/");
					}
				}
				
				var ok = true;
				if(regExpInclude){
					ok = filePath.match(regExpInclude);
				}
				if(ok && regExpExclude){
					ok = !filePath.match(regExpExclude);
				}

				if(ok && !file.getName().match(/^\./)){
					files.push(filePath);
				}
			}else if(file.isDirectory() && !file.getName().match(/^\./) && !dontRecurse){
				var dirFiles = this.getFilteredFileList(file, regExpFilters, makeUnixPaths, true);
				files.push.apply(files, dirFiles);
			}
		}
	}

	return files; //Array
}


fileUtil.copyDir = function(/*String*/srcDir, /*String*/destDir, /*RegExp*/regExpFilter, /*boolean?*/onlyCopyNew){
	//summary: copies files from srcDir to destDir using the regExpFilter to determine if the
	//file should be copied. Returns a list file name strings of the destinations that were copied.
	var fileNames = fileUtil.getFilteredFileList(srcDir, regExpFilter, true);
	var copiedFiles = [];
	
	for(var i = 0; i < fileNames.length; i++){
		var srcFileName = fileNames[i];
		var destFileName = srcFileName.replace(srcDir, destDir);

		if(fileUtil.copyFile(srcFileName, destFileName, onlyCopyNew)){
			copiedFiles.push(destFileName);
		}
	}

	return copiedFiles.length ? copiedFiles : null; //Array or null
}

fileUtil.asyncFixEOLRe= new RegExp(fileUtil.getLineSeparator(), "g");

fileUtil.transformAsyncModule= function(filename, contents) {
	var match,
		bundleMatch,
		moduleId,
		requireArgs = [],
		lineSeparator = fileUtil.getLineSeparator(),
		dojo = { isBrowser:true },
		getAsyncArgs = function(moduleId_, deps){
			if(!deps){
				//no moduleId given
				deps= moduleId_;
			} else {
				moduleId= moduleId_;
			}
			for (var i = 0; i < deps.length; i++) {
				if (deps[i]!="require") {
					requireArgs.push(deps[i].replace(/\//g, "."));
				}
			}
		}
	;

	// the v1.x content in the i18n bundles is bracketed by "//begin v1.x content" and "//end v1.x content"
	match = contents.match(/(\/\/begin\sv1\.x\scontent)([\s\S]+)(\/\/end\sv1\.x\scontent)/);
	if(match){
		return match[2];
	}
	// must not be an i18n bundle

	match = contents.match(/\/\/\s*AMD\-ID\s*"([^\n"]+)"/i);
	moduleId = (match && match[1]) || "";
	if(moduleId || contents.substring(0, 8) == "define(\""){
		if((match = contents.match(/^define\(([^\]]+)\]\s*\,[\s\n]*function.+$/m))){
			eval("getAsyncArgs(" + match[1] + "])");
			if(!moduleId){
				logger.info("warning: the module " + filename + " looked like an AMD module, but didn't provide a module id");
				return contents;
			}
			var prefix = "dojo.provide(\"" + moduleId.replace(/\//g, ".") + "\");" + lineSeparator;
			for(var req, reqs = requireArgs, i = 0; i<reqs.length; i++){
				req = reqs[i];
				if(req.substring(0, 5) == "text!"){
					// do nothing
				}else if(req.substring(0, 5) == "i18n!"){
					bundleMatch = req.match(/i18n\!(.+)\.nls\.(\w+)/);
					prefix += "dojo.requireLocalization(\"" + bundleMatch[1].replace(/\//g, ".") + "\", \"" +	 bundleMatch[2] +	 "\");" + lineSeparator;
				}else if(req != "dojo" && req != "dijit" && req != "dojox" && !/^dojo\.lib/.test(req)){
					prefix += "dojo.require(\"" + req +	"\");" + lineSeparator;
				}
			}

			// strip all module return values that end with the comment "// AMD-result"
			contents = contents.replace( /^\s*return\s+.+\/\/\s*AMD-return((\s.+)|(\s*))$/img , "");
			var matchLength = match.index + match[0].length + 1;
			var contentsLength = contents.search(/\s*return\s+[_a-zA-Z\.0-9]+\s*;\s*(\/\/.+)?\s*\}\);\s*$/);
			if(contentsLength == -1){
				//logger.info("warning: no return for: " + fileUtil.asyncProvideArg);
				contentsLength= contents.search(/\}\);\s*$/);
			}
			return prefix + lineSeparator + contents.substring(matchLength, contentsLength);
		} else {
			return contents;
		}
	} else {
		return contents;
	}
};

fileUtil.copyFile = function(/*String*/srcFileName, /*String*/destFileName, /*boolean?*/onlyCopyNew){
	//summary: copies srcFileName to destFileName. If onlyCopyNew is set, it only copies the file if
	//srcFileName is newer than destFileName. Returns a boolean indicating if the copy occurred.
	var destFile = new java.io.File(destFileName);

	//logger.trace("Src filename: " + srcFileName);
	//logger.trace("Dest filename: " + destFileName);

	//If onlyCopyNew is true, then compare dates and only copy if the src is newer
	//than dest.
	if(onlyCopyNew){
		var srcFile = new java.io.File(srcFileName);
		if(destFile.exists() && destFile.lastModified() >= srcFile.lastModified()){
			return false; //Boolean
		}
	}

	//Make sure destination dir exists.
	var parentDir = destFile.getParentFile();
	if(!parentDir.exists()){
		if(!parentDir.mkdirs()){
			throw "Could not create directory: " + parentDir.getAbsolutePath();
		}
	}

	if (/.+\.js$/.test(srcFileName)) {
		fileUtil.saveUtf8File(destFileName, fileUtil.transformAsyncModule(srcFileName, fileUtil.readFile(srcFileName)).replace(fileUtil.asyncFixEOLRe, "\n"));
	} else {
		//Java's version of copy file.
		var srcChannel = new java.io.FileInputStream(srcFileName).getChannel();
		var destChannel = new java.io.FileOutputStream(destFileName).getChannel();
		destChannel.transferFrom(srcChannel, 0, srcChannel.size());
		srcChannel.close();
		destChannel.close();
	}
	
	return true; //Boolean
}

fileUtil.readFile = function(/*String*/path, /*String?*/encoding){
	//summary: reads a file and returns a string
	encoding = encoding || "utf-8";
	var file = new java.io.File(path);
	var lineSeparator = fileUtil.getLineSeparator();
	var input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding));
	try{
		var stringBuffer = new java.lang.StringBuffer();
		var line = input.readLine();

		// Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
		// http://www.unicode.org/faq/utf_bom.html
		
		// Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
		// http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
		if(line && line.length() && line.charAt(0) === 0xfeff){
			// Eat the BOM, since we've already found the encoding on this file,
			// and we plan to concatenating this buffer with others; the BOM should
			// only appear at the top of a file.
			line = line.substring(1);
		}
		while(line !== null){
			stringBuffer.append(line);
			stringBuffer.append(lineSeparator);
			line = input.readLine();
		}
		//Make sure we return a JavaScript string and not a Java string.
		return new String(stringBuffer.toString()); //String
	}finally{
		input.close();
	}
}

fileUtil.saveUtf8File = function(/*String*/fileName, /*String*/fileContents){
	//summary: saves a file using UTF-8 encoding.
	fileUtil.saveFile(fileName, fileContents, "utf-8");
}

fileUtil.saveFile = function(/*String*/fileName, /*String*/fileContents, /*String?*/encoding){
	//summary: saves a file.
	var outFile = new java.io.File(fileName);
	var outWriter;
	
	var parentDir = outFile.getParentFile();
	if(!parentDir.exists()){
		if(!parentDir.mkdirs()){
			throw "Could not create directory: " + parentDir.getAbsolutePath();
		}
	}
	
	if(encoding){
		outWriter = new java.io.OutputStreamWriter(new java.io.FileOutputStream(outFile), encoding);
	}else{
		outWriter = new java.io.OutputStreamWriter(new java.io.FileOutputStream(outFile));
	}

	var os = new java.io.BufferedWriter(outWriter);
	try{
		os.write(fileContents);
	}finally{
		os.close();
	}
}

fileUtil.deleteFile = function(/*String*/fileName){
	//summary: deletes a file or directory if it exists.
	var file = new java.io.File(fileName);
	if(file.exists()){
		if(file.isDirectory()){
			var files = file.listFiles();
			for(var i = 0; i < files.length; i++){
				this.deleteFile(files[i]);
			}
		}
		file["delete"]();
	}
}

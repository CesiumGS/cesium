//START of the "main" part of the script.
//This is the entry point for this script file.
load("jslib/logger.js");
load("jslib/fileUtil.js");
load("jslib/buildUtil.js");

var profileFile = arguments[0];
var lineSeparator = java.lang.System.getProperty("line.separator");

var result = buildUtil.loadDependencyList(buildUtil.evalProfile(profileFile));

var buildText = "Files included in this profile:" + lineSeparator;
for(var i = 0; i < result.length; i++){
	buildText += lineSeparator + result[i].layerName + ":" + lineSeparator;
	buildText += result[i].depList.join(lineSeparator) + lineSeparator;
}

print(buildText);

//This file generates a list of modules that can be used in a web build.
//This file should be called from ant/command line, and the output file
//needs to be generated before the web build will work.


function buildTreeData(/*Object*/obj, /*String*/nodeName){
	//summary: makes a TreeV3-friendly data structure.
	
	var result = null;
	var childNames = [];
	if(obj["dojoModuleName"]){
		result = { title: nodeName, dojoModuleName: obj["dojoModuleName"]};
	}else{
		result = {};
	}
	
	//Working with a branch.
	for(var childName in obj){
		if(childName != "dojoModuleName"){
			childNames.push(childName);
		}
	}
	childNames = childNames.sort();
	if(childNames.length > 0){
		result.children = [];
		result = { title: nodeName, children: []};
		for(var i = 0; i < childNames.length; i++){
			result.children.push(buildTreeData(obj[childNames[i]], childNames[i]));
		}
	}
	return result;
}


//START of the "main" part of the script.
//This is the entry point for this script file.
var srcRoot = arguments[0];
var outputFileName = arguments[1];

//Load Dojo so we can reuse code.
djConfig={
	baseUrl: "../../../dojo/"
};
load('../../../dojo/dojo.js');

load("../jslib/logger.js");
load("../jslib/fileUtil.js");

//Get a list of files that might be modules.
var fileList = fileUtil.getFilteredFileList(srcRoot, /\.js$/, true);

var provideRegExp = /dojo\.provide\(\".*\"\)/g;

//Search the modules for a matching dojo.provide() call.
//Need to do this because some files (like nls/*.js files) are
//not really modules.
var provideList = [];
for(var i = 0; i < fileList.length; i++){
	var fileName = fileList[i];
	var fileContents = new fileUtil.readFile(fileName);

	var matches = fileContents.match(provideRegExp);
	
	if(matches){
		for(var j = 0; j < matches.length; j++){
			//strip off the .js file extension
			var modFileName = fileName.substring(0, fileName.length - 3);
			var provideName = matches[j].substring(matches[j].indexOf('"') + 1, matches[j].lastIndexOf('"'));

			//Skip certain kinds of modules not needed in end use.
			if(provideName.indexOf("tests.") != -1
				|| provideName.indexOf("._") != -1
				|| provideName.indexOf(".robot") != -1){
				continue;
			}

			//Only allow the provides that match the file name.
			//So, the different dijit permutations of dijit.form.Button will not show up.
			if (modFileName.lastIndexOf(provideName.replace(/\./g, "/")) == modFileName.length - provideName.length){
				provideList.push(provideName);
				break;
			}
		}
	
	}
}

provideList = provideList.sort();

logger.trace(provideList);

//Create the object that represents the module structures.
/*var moduleHolder = {};

for(var i = 0; i < provideList.length; i++){
	var moduleObject = dojo.getObject(provideList[i], moduleHolder, true);
	moduleObject.obj[moduleObject.prop] = {dojoModuleName: provideList[i] };
}

//Transform the object into something appropriate for a tree control.
var treeData = buildTreeData(moduleHolder, "Dojo Modules");

//Output the results.
fileUtil.saveFile(outputFileName, "var treeData = " + dojo.toJson(treeData) + ";");
*/
fileUtil.saveFile(outputFileName, "var provideList = [" + provideList + "];");


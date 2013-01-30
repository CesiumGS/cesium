//Checkstyle script for Dojo
var buildTimerStart = (new Date()).getTime();

load("../buildscripts/jslib/logger.js");
load("../buildscripts/jslib/fileUtil.js");
load("checkstyleUtil.js");

//*****************************************************************************

if(arguments[0] == "help"){
	print("Usage: \n\tTo generate a HTML report on dojo, dijit and dojox folders use:\n\t\t"
		+ "checkstyle \n\t"
		+ "To specify a single directory to check in, including all child folders, use:\n\t\t"
		+ "checkstyle dir={folderName}\n\t"
		+ "To specify directories to ignore, use:\n\t\t"
		+ "checkstyle ignoreDirs={folderName1},{folderName2}\n\t"
		+ "To specify a list of files to process, use the 'files' parameter, passing a list of space separated files, e.g.\n\t\t"
		+ "checkstyle files=\"dojo/_base/Color.js dojo/back.js\"\n\t"
		+ "To force the script to fail when a specified file has failed the check, use the 'failOnError' parameter, e.g.\n\t\t"
		+ "checkstyle failOnError=true files=\"dojo/_base/Color.js dojo/back.js\"\n\t"
		+ "To commit fixes made by the checkstyleReport.html tool, use\n\t\t"
		+ "checkstyle commit");
		
} else if(arguments[0] == "commit"){
	runCommit();
} else{
	
	//Convert arguments to keyword arguments.
	var kwArgs = convertArrayToObject(arguments);

	checkstyle();

	var buildTime = ((new Date().getTime() - buildTimerStart) / 1000);
	print("Build time: " + buildTime + " seconds");

}
//*****************************************************************************

// Take from old buildUtil.js in 1.6
function convertArrayToObject(/*Array*/ary){
	// summary:
	//		converts an array that has String members of "name=value"
	//		into an object, where the properties on the object are the names in the array
	//		member name/value pairs.
	var result = {};
	for(var i = 0; i < ary.length; i++){
		var separatorIndex = ary[i].indexOf("=");
		if(separatorIndex == -1){
			throw "Malformed name/value pair: [" + ary[i] + "]. Format should be name=value";
		}
		result[ary[i].substring(0, separatorIndex)] = ary[i].substring(separatorIndex + 1, ary[i].length);
	}
	return result; //Object
}

//********* Start checkstyle *********
function checkstyle(){
	
	var dirs, i, ignoreDirs;
	var reportFile = "./checkstyleData.js";

	
	if(kwArgs.files){
		var files = kwArgs.files.split(" ");
		
		for(i = 0; i < files.length; i++){
			checkstyleUtil.applyRules("../../" + files[i], fileUtil.readFile("../../" + files[i]));
		}
		if(checkstyleUtil.errors){
			var errors = checkstyleUtil.serializeErrors();
			if(kwArgs.failOnError == "true"){
				throw Error("Checkstyle failed. \n" + errors);
			} else{
				print(errors);
			}
		}
		return;
	}
	
	
	if(kwArgs.dir){
		dirs = [kwArgs.dir];
	} else{
		dirs = ["dojo", "dijit", "dojox"];
	}
	if(kwArgs.ignoreDirs){
		ignoreDirs = kwArgs.ignoreDirs.split(",");
	}else{
		ignoreDirs = [];
	}
	
	for(i = 0; i < dirs.length; i++){
		var fileList = fileUtil.getFilteredFileList("../../" + dirs[i], /\.js$/, true);
		for(var j = 0; j < fileList.length; j++){
			if(fileList[j].indexOf("/test") < 0
				&& fileList[j].indexOf("/nls") < 0
				&& fileList[j].indexOf("/demos") < 0){
				
				var ignore = false;
				if(ignoreDirs.length > 0){
					for(var k = 0; k < ignoreDirs.length; k++){
						if(fileList[j].indexOf(ignoreDirs[k]) > -1){
							ignore = true;
							break;
						}else{
							
						}
					}
				}
				
				if(!ignore){
					checkstyleUtil.applyRules(fileList[j], fileUtil.readFile(fileList[j]));
				}
			}
		}
	}
	var report = checkstyleUtil.generateReport();
	fileUtil.saveUtf8File(reportFile, report);
}

function runCommit(){
	var dirs = ["dojo", "dijit", "dojox"];
	
	var committedFiles = [];

	for(var i = 0; i < dirs.length; i++){
		var fileList = fileUtil.getFilteredFileList("../../" + dirs[i], /\.checkstyle.js$/, true);
		
		for(var j = 0; j < fileList.length; j++){
			if(fileList[j].indexOf("/test") < 0
				&& fileList[j].indexOf("/nls") < 0
				&& fileList[j].indexOf("/demos") < 0){
				var fileName = fileList[j].substring(0, fileList[j].length - ".checkstyle.js".length);
				fileUtil.saveUtf8File(fileName, fileUtil.readFile(fileList[j]));
				fileUtil.deleteFile(fileList[j]);
				committedFiles.push(fileName);
			}
		}
	}
	print("Committed checkstyle fixes for the following files:\n" + committedFiles.join("\n"));
}

//********* End checkstyle *********
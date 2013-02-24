/**
 * Takes plain JSON structures and wraps them as to requireJS i18n bundles
 */

djConfig={baseUrl: "../../../dojo/", paths: {"dojo/_base/xhr": "../util/buildscripts/cldr/xhr"}};

load("../../../dojo/dojo.js");
load("../jslib/logger.js");
load("../jslib/fileUtil.js");
load("cldrUtil.js");

dojo.require("dojo.i18n");

var dir/*String*/ = arguments[0];// ${dojo}/dojo/cldr/nls
var logDir = arguments[1];
var logStr = "";

print('wrap.js...');

var wrap = function(contents){
    return "\n//begin v1.x content\n" + contents + "\n//end v1.x content\n";
};

// for each .js file in the top-level directory, make a filtered list
// of all files matching that name in the directory tree
var fileLists = fileUtil.getFilteredFileList(dir, /\.js$/, true, false, true)
	.map(function(file){
		var name = file.substring(file.lastIndexOf("/"));
		return fileUtil.getFilteredFileList(dir, new RegExp(name+"$"), true);
	});
	
fileLists.forEach(function(fileList){
	var map = {},
	    list = [],
	    rootFile;
	fileList.forEach(function(file /*Java String*/){
logStr += "WRAP processing file: "+file.toString()+"\n";
		var path = file.split("/"),
		    locale = path[path.length-2],
		    obj = dojo.fromJson(fileUtil.readFile(file));

		if(locale=="nls"){
		    rootFile = file;
		    map.root = obj;
logStr += "rootFile="+file.toString()+"\n";

		}else{
logStr += "locale added: "+locale+"\n";
			list.push(locale);
			map[locale] = true;
			fileUtil.saveUtf8File(file, "define(" + wrap(dojo.toJson(obj, true)) + ");");
		}
	});

logStr += "writing rootFile="+rootFile+"\n";
//	var contents = wrap(dojo.toJson(map, true));

//	Assemble file contents to include 1.x markers around map.root
	var contents = "{ root:\n";
	contents += wrap(dojo.toJson(map.root, true));
	if(list.length){
		list.sort();
		list.forEach(function(l){
			contents += ',\n\t"' + l + '": true';
		});
		contents += "\n";
	}
	contents += "}";

	fileUtil.saveUtf8File(rootFile, "define(" + contents + ");");
});

fileUtil.saveUtf8File(logDir + '/wrap.log',logStr+'\n');
//print('wrap finished, please refer to logs at ' + logDir + ' for more details.');

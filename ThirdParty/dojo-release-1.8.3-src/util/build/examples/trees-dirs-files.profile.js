var profile = {
	basePath:"../../..",
	releaseDir:"./trees-dirs-files-ouput",
	releaseName:"",
	trees:[
		["dojo/tests", "./dojo-tests", /(\/\.)|(~$)/],
		["dijit/tests", "./dijit-tests", /(\/\.)|(~$)/]
 	],
	dirs:[
		["dojo", "./dojo-root", /(\/\.)|(~$)/],
		["dijit", "./dijit-root", /(\/\.)|(~$)/]
	],
	files:[
		["dojo/dojo.js", "./dojo.js"],
		["dijit/dijit.js", "./dijit.js"]
	],
	resourceTags:{
		copyOnly: function(filename, mid){
			return true;
		}
	}
};

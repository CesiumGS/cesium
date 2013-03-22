define([
	"dojo/_base/lang"
], function(lang){

	var o = lang.getObject("dojox.mobile.tests.doh.MyFileTypeMap", true);

	o.map = {
		"html": "html",
		"json": "json",
		"mydata": "json"
	};

	o.add = function(/*String*/ key, /*String*/ contentType){
		this.map[key] = contentType;
	};

	o.getContentType = function(/*String*/ fileName){
		var fileType = (fileName || "").replace(/.*\./, "");
		return this.map[fileType];
	};
	
	console.log("This is MyFileTypeMap");
	window._MyFileTypeMapFlag = true;

	return o;

});
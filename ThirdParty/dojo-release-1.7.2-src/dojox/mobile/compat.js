define([
	"dojo/_base/lang",
	"dojo/_base/sniff"
], function(lang, has){
	var dm = lang.getObject("dojox.mobile", true);
	if(!has("webkit")){
		var s = "dojox/mobile/_compat"; // assign to a variable so as not to be picked up by the build tool
		require([s]);
	}
	return dm;
});

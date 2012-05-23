require(['doh', 'dojo/_base/kernel', 'dojo/_base/sniff', 'dojo/_base/url'], function(doh, dojo){

if(dojo.isBrowser){
	doh.registerUrl("dojox.io.tests.scriptFrame", dojo.moduleUrl("dojox.io.tests", "scriptFrame.html"));
}

});

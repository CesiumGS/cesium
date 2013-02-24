dojo.provide("dojox.html.tests.module");
try{
	dojo.requireIf(dojo.isBrowser, "dojox.html.tests.entities");
	dojo.requireIf(dojo.isBrowser, "dojox.html.tests.format");
}catch(e){
	doh.debug(e);
}


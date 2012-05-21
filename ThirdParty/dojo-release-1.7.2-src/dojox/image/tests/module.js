dojo.provide("dojox.image.tests.module");

try{

	doh.registerUrl("dojox.image.tests._base", dojo.moduleUrl("dojox.image.tests", "test_base.html"));
	doh.registerUrl("dojox.image.tests.Lightbox", dojo.moduleUrl("dojox.image.tests", "Lightbox.html"));
	doh.registerUrl("dojox.image.tests.onloads", dojo.moduleUrl("dojox.image.tests", "onloads.html"));
	
}catch(e){
	doh.debug(e);
}



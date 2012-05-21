dojo.provide("dojox.gfx.tests.module");

try{
	dojo.require("dojox.gfx.tests.matrix");
	dojo.require("dojox.gfx.tests.decompose");
	doh.registerUrl("GFX: Utils", dojo.moduleUrl("dojox", "gfx/tests/test_utils.html"), 3600000);
}catch(e){
	doh.debug(e);
}


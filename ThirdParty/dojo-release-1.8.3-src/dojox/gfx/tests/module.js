dojo.provide("dojox.gfx.tests.module");

try{
	dojo.require("dojox.gfx.tests.matrix");
	dojo.require("dojox.gfx.tests.decompose");
	doh.registerUrl("GFX: Utils", dojo.moduleUrl("dojox", "gfx/tests/test_utils.html"), 3600000);
	doh.registerUrl("GFX: Base", dojo.moduleUrl("dojox", "gfx/tests/test_base.html"), 3600000);
	doh.registerUrl("GFX: Clean up", dojo.moduleUrl("dojox", "gfx/tests/test_lifecycle.html"), 3600000);
	doh.registerUrl("GFX: Container bbox", dojo.moduleUrl("dojox", "gfx/tests/test_containerBBox.html"), 3600000);
}catch(e){
	doh.debug(e);
}


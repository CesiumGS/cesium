dojo.provide('dojox.mdnd.tests.unitTests.dropMode.module');

try{
	doh.registerUrl("dojox.mdnd.tests.unitTests.dropMode.VerticalDropModeTest",
			dojo.moduleUrl("dojox.mdnd","tests/unitTests/dropMode/VerticalDropModeTest.html"), 60000);
	doh.registerUrl("dojox.mdnd.tests.unitTests.dropMode.OverDropModeTest",
			dojo.moduleUrl("dojox.mdnd","tests/unitTests/dropMode/OverDropModeTest.html"), 60000);
}catch(e){
	doh.debug(e);
}

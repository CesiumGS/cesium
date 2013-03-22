dojo.provide("dojox.mdnd.tests.unitTests.areaManager.module");

try{
	doh.registerUrl("dojox.mdnd.tests.unitTests.AreaManagerCoverPresence",
			dojo.moduleUrl("dojox.mdnd","tests/unitTests/areaManager/AreaManagerCoverPresence.html"), 60000);
	doh.registerUrl("dojox.mdnd.tests.unitTests.AreaManagerManagingDragItems",
			dojo.moduleUrl("dojox.mdnd","tests/unitTests/areaManager/AreaManagerManagingDragItems.html"), 60000);
	doh.registerUrl("dojox.mdnd.tests.unitTests.AreaManagerRegistering",
			dojo.moduleUrl("dojox.mdnd","tests/unitTests/areaManager/AreaManagerRegistering.html"), 60000);
}catch(e){
	doh.debug(e);
}

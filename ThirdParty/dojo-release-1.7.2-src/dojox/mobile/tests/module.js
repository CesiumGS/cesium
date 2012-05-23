dojo.provide("dojox.mobile.tests.module");

try{
	dojo.require("dojox.mobile.tests.doh.module");
	if(!dojo.isBB && !dojo.isAndroid && !dojo.isIPhone && !dojo.isIPad && !dojo.isIPod) {
		dojo.require("dojox.mobile.tests.robot.module");
	}

}catch(e){
	doh.debug(e);
}


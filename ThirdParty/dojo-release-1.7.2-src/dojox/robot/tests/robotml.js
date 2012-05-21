dojo.provide("dojox.robot.tests.robotml");

try{
	if(dojo.isBrowser){
		doh.registerUrl("dojox.robot.tests.test_recorder", dojo.moduleUrl("dojox", "robot/tests/test_recorder.html"), 999999);
	}
}catch(e){
	doh.debug(e);
}

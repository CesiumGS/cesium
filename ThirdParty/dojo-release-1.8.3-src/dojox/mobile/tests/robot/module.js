dojo.provide("dojox.mobile.tests.robot.module");

try{
	var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g,"").replace(/^&/,"?"),
		test_robot = true;

	if(test_robot){
		doh.registerUrl("dojox.mobile.tests.robot.ButtonList", dojo.moduleUrl("dojox.mobile", "tests/robot/ButtonList.html"), 999999);
		doh.registerUrl("dojox.mobile.tests.robot.ButtonList", dojo.moduleUrl("dojox.mobile", "tests/robot/ButtonList2.html"), 999999);
		doh.registerUrl("dojox.mobile.tests.robot.switch", dojo.moduleUrl("dojox.mobile", "tests/robot/Switch.html"), 999999);
		doh.registerUrl("dojox.mobile.tests.robot.switch", dojo.moduleUrl("dojox.mobile", "tests/robot/Switch2.html"), 999999);
		doh.registerUrl("dojox.mobile.tests.robot.ListItem", dojo.moduleUrl("dojox.mobile", "tests/robot/ListItem.html"), 999999);
		doh.registerUrl("dojox.mobile.tests.robot.tabBar", dojo.moduleUrl("dojox.mobile", "tests/robot/TabBar.html"), 999999);
		doh.registerUrl("dojox.mobile.tests.robot.tabBar", dojo.moduleUrl("dojox.mobile", "tests/robot/TabBar2.html"), 999999);
//		doh.registerUrl("dojox.mobile.tests.robot.IconItem", dojo.moduleUrl("dojox.mobile", "tests/robot/Icon.html",999999));
//		doh.registerUrl("dojox.mobile.tests.robot.IconItem", dojo.moduleUrl("dojox.mobile", "tests/robot/Icon2.html",999999));
		doh.registerUrl("dojox.mobile.tests.robot.Animation", dojo.moduleUrl("dojox.mobile", "tests/robot/Animation.html"),999999);
		if(!dojo.isSafari) {
			doh.registerUrl("dojox.mobile.tests.robot.Settings", dojo.moduleUrl("dojox.mobile", "tests/robot/Settings.html"),999999);
//			doh.registerUrl("dojox.mobile.tests.robot.Flippable", dojo.moduleUrl("dojox.mobile", "tests/robot/Flippable.html"),999999);
			doh.registerUrl("dojox.mobile.tests.robot.Scrollable", dojo.moduleUrl("dojox.mobile", "tests/robot/ScrollableView.html"),999999);
			doh.registerUrl("dojox.mobile.tests.robot.Scrollable", dojo.moduleUrl("dojox.mobile", "tests/robot/ScrollableView2.html"),999999);
			doh.registerUrl("dojox.mobile.tests.robot.Scrollable", dojo.moduleUrl("dojox.mobile", "tests/robot/ScrollableView3.html"),999999);
		}
	}
}catch(e){
	doh.debug(e);
}

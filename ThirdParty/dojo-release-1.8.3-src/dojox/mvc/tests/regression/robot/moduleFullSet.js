define([
	"doh/runner",
	"dojo/_base/sniff",
	"../../../equals",
	"../../StatefulModelOptions"
], function(doh, has){
	try{
		var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g, "").replace(/^&/, "?");

		// only run the regression Robot tests
		if(!has("ie")){
			// Hit an error with the mobile parser with IE, need to investigate more
			doh.registerUrl("dojox.mvc.tests.regression.robot.mobile-demo-test", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mobile-demo-test.html"+userArgs), 999999);
			doh.registerUrl("dojox.mvc.tests.regression.robot.android_repeat-ins", dojo.moduleUrl("dojox.mvc","tests/regression/robot/android_repeat-ins.html"+userArgs), 999999);
		}
		doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_shipto-billto-simple", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_shipto-billto-simple.html"+userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_generate-view", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_generate-view.html"+userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_loan-stateful", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_loan-stateful.html"+userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_ref-set-repeat", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_ref-set-repeat.html"+userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_search-results-repeat", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_search-results-repeat.html"+userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_search-results-ins-del", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_search-results-ins-del.html"+userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.regression.robot.iphone_shipto-billto", dojo.moduleUrl("dojox.mvc","tests/regression/robot/iphone_shipto-billto.html"+userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_shipto-billto-hierarchical", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_shipto-billto-hierarchical.html"+userArgs), 999999);
	}catch(e){
		doh.debug(e);
	}
});

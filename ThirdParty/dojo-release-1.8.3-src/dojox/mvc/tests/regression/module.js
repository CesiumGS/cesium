dojo.provide("dojox.mvc.tests.module");

try{
	var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g,"").replace(/^&/,"?");
	// DOH
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_shipto-billto-simple", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_shipto-billto-simple.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_search-results-repeat", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_search-results-repeat.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_search-results-repeat-store", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_search-results-repeat-store.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_programmatic-repeat-store", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_programmatic-repeat-store.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_binding-simple", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_binding-simple.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_ref-set-repeat", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_ref-set-repeat.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_billto-hierarchical", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_shipto-billto-hierarchical.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_async_mvc_input-output-simple", dojo.moduleUrl("dojox.mvc","tests/regression/doh_async_mvc_input-output-simple.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_async_mvc_zero-value-test", dojo.moduleUrl("dojox.mvc","tests/regression/doh_async_mvc_zero-value-test.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_template_repeat_exprchar", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_template_repeat_exprchar.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_form-kitchensink", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_form-kitchensink.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_date_test", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_date_test.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_mvc_validation-test-simple", dojo.moduleUrl("dojox.mvc","tests/regression/doh_mvc_validation-test-simple.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.doh_new-mvc_input-output-simple.html", dojo.moduleUrl("dojox.mvc","tests/doh_new-mvc_input-output-simple.html"+userArgs), 999999);
	// Robot
	doh.registerUrl("dojox.mvc.tests.regression.robot.mobile-demo-test", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mobile-demo-test.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_shipto-billto-simple", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_shipto-billto-simple.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_generate-view", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_generate-view.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_loan-stateful", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_loan-stateful.html"+userArgs), 999999);
	//doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_ref-set-repeat", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_ref-set-repeat.html"+userArgs), 999999);
	//doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_search-results-repeat", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_search-results-repeat.html"+userArgs), 999999);
	doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_search-results-ins-del", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_search-results-ins-del.html"+userArgs), 999999);
	//doh.registerUrl("dojox.mvc.tests.regression.robot.iphone_shipto-billto", dojo.moduleUrl("dojox.mvc","tests/regression/robot/iphone_shipto-billto.html"+userArgs), 999999);
	//doh.registerUrl("dojox.mvc.tests.regression.robot.android_repeat-ins", dojo.moduleUrl("dojox.mvc","tests/regression/robot/android_repeat-ins.html"+userArgs), 999999);
	//doh.registerUrl("dojox.mvc.tests.regression.robot.mvc_shipto-billto-hierarchical", dojo.moduleUrl("dojox.mvc","tests/regression/robot/mvc_shipto-billto-hierarchical.html"+userArgs), 999999);
}catch(e){
	doh.debug(e);
}

dojo.provide("dojox.grid.tests.robot.module");

try{
	var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g,"").replace(/^&/,"?");

	// Safari 3 doesn't support focus on nodes like <div>, so keyboard isn't supported there...
	// Safari 4 almost works, but has problems with shift-tab (#8987) and ESC (#9506).
	// Enable tests when those bugs are fixed.
	var test_a11y = dojo.isFF || dojo.isIE;
	
	var test_robot = true;

	doh.registerUrl("dojox.grid.tests.robot.DataGrid_mouse", dojo.moduleUrl("dojox.grid", "tests/robot/DataGrid_mouse.html"), 99999999);
	doh.registerUrl("dojox.grid.tests.robot.DataGrid_a11y", dojo.moduleUrl("dojox.grid", "tests/robot/DataGrid_a11y.html"), 99999999);
	doh.registerUrl("dojox.grid.tests.robot.7815", dojo.moduleUrl("dojox.grid", "tests/robot/7815.html"), 99999999);
}catch(e){
	doh.debug(e);
}



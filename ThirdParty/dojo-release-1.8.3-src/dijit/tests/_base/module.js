dojo.provide("dijit.tests._base.module");

try{
	var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g,"").replace(/^&/,"?"),
		test_robot = true;

	doh.registerUrl("dijit.tests._base.manager", dojo.moduleUrl("dijit", "tests/_base/manager.html"), 999999);
	doh.registerUrl("dijit.tests._base.wai", dojo.moduleUrl("dijit", "tests/_base/wai.html"), 999999);
	doh.registerUrl("dijit.tests._base.place", dojo.moduleUrl("dijit", "tests/_base/place.html"), 999999);
	doh.registerUrl("dijit.tests._base.popup", dojo.moduleUrl("dijit", "tests/_base/popup.html"), 999999);
	if(test_robot){
		doh.registerUrl("dijit.tests._base.robot.CrossWindow", dojo.moduleUrl("dijit","tests/_base/robot/CrossWindow.html"), 999999);
		doh.registerUrl("dijit.tests._base.robot.FocusManager", dojo.moduleUrl("dijit","tests/_base/robot/FocusManager.html"), 999999);
		doh.registerUrl("dijit.tests._base.robot.focus_mouse", dojo.moduleUrl("dijit","tests/_base/robot/focus_mouse.html"), 999999);
	}

}catch(e){
	doh.debug(e);
}

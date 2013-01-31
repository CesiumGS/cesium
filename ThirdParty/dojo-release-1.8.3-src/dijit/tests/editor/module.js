dojo.provide("dijit.tests.editor.module");

try{
	var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g,"").replace(/^&/,"?");

	// inline doh tests
	doh.registerUrl("dijit.tests.editor.nls_8859-2", dojo.moduleUrl("dijit","tests/editor/nls_8859-2.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.nls_sjis", dojo.moduleUrl("dijit","tests/editor/nls_sjis.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.nls_utf8", dojo.moduleUrl("dijit","tests/editor/nls_utf8.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.Editor_stylesheet", dojo.moduleUrl("dijit","tests/editor/Editor_stylesheet.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.html", dojo.moduleUrl("dijit","tests/editor/html.html"+userArgs), 999999);

	// Base editor functionality
	doh.registerUrl("dijit.tests.editor.robot.Editor_mouse", dojo.moduleUrl("dijit","tests/editor/robot/Editor_mouse.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.Editor_a11y", dojo.moduleUrl("dijit","tests/editor/robot/Editor_a11y.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.Misc", dojo.moduleUrl("dijit","tests/editor/robot/Editor_misc.html"+userArgs), 999999);

	// Plugins
	doh.registerUrl("dijit.tests.editor.robot.CustomPlugin", dojo.moduleUrl("dijit","tests/editor/robot/CustomPlugin.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.EnterKeyHandling", dojo.moduleUrl("dijit","tests/editor/robot/EnterKeyHandling.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.FullScreen", dojo.moduleUrl("dijit","tests/editor/robot/Editor_FullScreen.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.ViewSource", dojo.moduleUrl("dijit","tests/editor/robot/Editor_ViewSource.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.NewPage", dojo.moduleUrl("dijit","tests/editor/robot/Editor_NewPage.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.LinkDialog", dojo.moduleUrl("dijit","tests/editor/robot/Editor_LinkDialog.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.FontChoice", dojo.moduleUrl("dijit","tests/editor/robot/Editor_FontChoice.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.ToggleDir", dojo.moduleUrl("dijit","tests/editor/robot/ToggleDir.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.ToggleDir_rtl", dojo.moduleUrl("dijit","tests/editor/robot/ToggleDir_rtl.html"+userArgs), 999999);
	doh.registerUrl("dijit.tests.editor.robot.TabIndent", dojo.moduleUrl("dijit","tests/editor/robot/TabIndent.html"+userArgs), 999999);
	
	if(!dojo.isWebKit){
		// The back button on webkit is URL for the browser itself, restarting the entire test suite,
		// rather than just for the iframe holding the test file (BackForwardState.html and BackForwardStateHelper.html)
		doh.registerUrl("dijit.tests.editor.robot.BackForwardState", dojo.moduleUrl("dijit","tests/editor/robot/BackForwardState.html"+userArgs), 999999);
	}

	// Special test for IE9 in IE8 compat mode (#14900)
	if(dojo.isIE == 9){
		doh.registerUrl("dijit.tests.editor.robot.Editor_IE8Compat", dojo.moduleUrl("dijit","tests/editor/robot/Editor_IE8Compat.html"+userArgs), 999999);

	}
}catch(e){
	doh.debug(e);
}




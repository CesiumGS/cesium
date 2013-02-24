dojo.provide("dijit.tests.layout.module");

try{
	doh.registerUrl("dijit.tests.layout.ContentPane", dojo.moduleUrl("dijit", "tests/layout/ContentPane.html"), 999999);
	doh.registerUrl("dijit.tests.layout.test_ContentPane", dojo.moduleUrl("dijit", "tests/layout/test_ContentPane.html"), 999999);
	doh.registerUrl("dijit.tests.layout.ContentPaneLayout", dojo.moduleUrl("dijit", "tests/layout/ContentPaneLayout.html"), 999999);
	doh.registerUrl("dijit.tests.layout.ContentPane-remote", dojo.moduleUrl("dijit","tests/layout/ContentPane-remote.html"), 999999);
	doh.registerUrl("dijit.tests.layout.ContentPane-auto-require", dojo.moduleUrl("dijit","tests/layout/ContentPane-auto-require.html"), 999999);

	doh.registerUrl("dijit.tests.layout.robot.GUI", dojo.moduleUrl("dijit","tests/layout/robot/GUI.html"), 999999);

	doh.registerUrl("dijit.tests.layout.LayoutContainer", dojo.moduleUrl("dijit", "tests/layout/LayoutContainer.html"), 999999);

	doh.registerUrl("dijit.tests.layout.StackContainer", dojo.moduleUrl("dijit", "tests/layout/StackContainer.html"), 999999);
	doh.registerUrl("dijit.tests.layout.NestedStackContainer", dojo.moduleUrl("dijit", "tests/layout/nestedStack.html"), 999999);

	doh.registerUrl("dijit.tests.layout.TabContainer", dojo.moduleUrl("dijit", "tests/layout/TabContainer.html"), 999999);
	doh.registerUrl("dijit.tests.layout.robot.TabContainer_a11y", dojo.moduleUrl("dijit","tests/layout/robot/TabContainer_a11y.html"), 999999);
	doh.registerUrl("dijit.tests.layout.robot.TabContainer_mouse", dojo.moduleUrl("dijit","tests/layout/robot/TabContainer_mouse.html"), 999999);
	doh.registerUrl("dijit.tests.layout.robot.TabContainer_noLayout", dojo.moduleUrl("dijit","tests/layout/robot/TabContainer_noLayout.html"), 999999);
	doh.registerUrl("dijit.tests.layout.TabContainerTitlePane", dojo.moduleUrl("dijit","tests/layout/TabContainerTitlePane.html"), 999999);
	
	doh.registerUrl("dijit.tests.layout.AccordionContainer", dojo.moduleUrl("dijit", "tests/layout/AccordionContainer.html"), 999999);
	doh.registerUrl("dijit.tests.layout.robot.AccordionContainer_a11y", dojo.moduleUrl("dijit","tests/layout/robot/AccordionContainer_a11y.html"), 999999);
	doh.registerUrl("dijit.tests.layout.robot.AccordionContainer_mouse", dojo.moduleUrl("dijit","tests/layout/robot/AccordionContainer_mouse.html"), 999999);

	doh.registerUrl("dijit.tests.layout.BorderContainer", dojo.moduleUrl("dijit", "tests/layout/BorderContainer.html"), 999999);
	doh.registerUrl("dijit.tests.layout.robot.BorderContainer", dojo.moduleUrl("dijit", "tests/layout/robot/BorderContainer.html"), 999999);
	doh.registerUrl("dijit.tests.layout.robot.BorderContainer_full", dojo.moduleUrl("dijit", "tests/layout/robot/BorderContainer_full.html"), 999999);
	doh.registerUrl("dijit.tests.layout.robot.BorderContainer_complex", dojo.moduleUrl("dijit", "tests/layout/robot/BorderContainer_complex.html"), 999999);

	doh.registerUrl("dijit.tests.layout.robot.BorderContainer_nested", dojo.moduleUrl("dijit", "tests/layout/robot/BorderContainer_nested.html"), 999999);
}catch(e){
	doh.debug(e);
}

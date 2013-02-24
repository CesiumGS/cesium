dojo.provide("dijit.tests.tree.module");

try{
	var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g,"").replace(/^&/,"?"),
		test_robot = true;

	doh.registerUrl("dijit.tests.tree.CustomLabel", dojo.moduleUrl("dijit", "tests/tree/CustomLabel.html"), 999999);
	doh.registerUrl("dijit.tests.tree.Tree_ForestStoreModel", dojo.moduleUrl("dijit", "tests/tree/Tree_ForestStoreModel.html"), 999999);
	doh.registerUrl("dijit.tests.tree.Tree_with_JRS", dojo.moduleUrl("dijit", "tests/tree/Tree_with_JRS.html"), 999999);
	doh.registerUrl("dijit.tests.tree.Tree_ObjectStoreModel", dojo.moduleUrl("dijit", "tests/tree/Tree_ObjectStoreModel.html"), 999999);

	if(test_robot){
		doh.registerUrl("dijit.tests.tree.robot.Tree_a11y", dojo.moduleUrl("dijit","tests/tree/robot/Tree_a11y.html"+userArgs), 999999);
		doh.registerUrl("dijit.tests.tree.robot.Tree_Custom_TreeNode", dojo.moduleUrl("dijit","tests/tree/robot/Tree_Custom_TreeNode.html"+userArgs), 999999);
		doh.registerUrl("dijit.tests.tree.robot.Tree_DnD", dojo.moduleUrl("dijit","tests/tree/robot/Tree_dnd.html"+userArgs), 999999);
		doh.registerUrl("dijit.tests.tree.robot.Tree_selector", dojo.moduleUrl("dijit","tests/tree/robot/Tree_selector.html"+userArgs), 999999);
		doh.registerUrl("dijit.tests.tree.robot.Tree_selector_only",
			dojo.moduleUrl("dijit","tests/tree/robot/Tree_selector.html?controller=selector&"+userArgs.substr(1)), 999999);
		doh.registerUrl("dijit.tests.tree/robot.Tree_DnD_multiParent", dojo.moduleUrl("dijit","tests/tree/robot/Tree_dnd_multiParent.html"+userArgs), 999999);
		doh.registerUrl("dijit.tests.tree.robot.Tree_v1", dojo.moduleUrl("dijit","tests/tree/robot/Tree_v1.html"+userArgs), 999999);
	}
}catch(e){
	doh.debug(e);
}

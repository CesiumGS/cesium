dojo.provide("dijit.tests.infrastructure-module");

try{
	// Utility methods (previously in dijit/_base)
	doh.registerUrl("dijit.tests.registry", dojo.moduleUrl("dijit", "tests/registry.html"), 999999);
	doh.registerUrl("dijit.tests.focus", dojo.moduleUrl("dijit", "tests/focus.html"), 999999);
	doh.registerUrl("dijit.tests.place", dojo.moduleUrl("dijit", "tests/place.html"), 999999);
	doh.registerUrl("dijit.tests.place-margin", dojo.moduleUrl("dijit", "tests/place-margin.html"), 999999);
	doh.registerUrl("dijit.tests.place-clip", dojo.moduleUrl("dijit", "tests/place-clip.html"), 999999);
	doh.registerUrl("dijit.tests.popup", dojo.moduleUrl("dijit", "tests/popup.html"), 999999);
	doh.registerUrl("dijit.tests.a11y", dojo.moduleUrl("dijit", "tests/a11y.html"), 999999);
	doh.registerUrl("dijit.tests.robot.typematic", dojo.moduleUrl("dijit","tests/robot/typematic.html"), 999999);

	// _Widget
	doh.registerUrl("dijit.tests._Widget-lifecycle", dojo.moduleUrl("dijit", "tests/_Widget-lifecycle.html"), 999999);
	doh.registerUrl("dijit.tests._Widget-attr", dojo.moduleUrl("dijit", "tests/_Widget-attr.html"), 999999);
	doh.registerUrl("dijit.tests._Widget-subscribe", dojo.moduleUrl("dijit", "tests/_Widget-subscribe.html"), 999999);
	doh.registerUrl("dijit.tests._Widget-placeAt", dojo.moduleUrl("dijit", "tests/_Widget-placeAt.html"), 999999);
	doh.registerUrl("dijit.tests.robot._Widget-on", dojo.moduleUrl("dijit","tests/_Widget-on.html"), 999999);
	doh.registerUrl("dijit.tests.robot._Widget-deferredConnect", dojo.moduleUrl("dijit","tests/robot/_Widget-deferredConnect.html"), 999999);
	doh.registerUrl("dijit.tests.robot._Widget-ondijitclick_mouse", dojo.moduleUrl("dijit","tests/robot/_Widget-ondijitclick_mouse.html"), 999999);
	doh.registerUrl("dijit.tests.robot._Widget-ondijitclick_a11y", dojo.moduleUrl("dijit","tests/robot/_Widget-ondijitclick_a11y.html"), 999999);

	// _Templated and other mixins
	doh.registerUrl("dijit.tests._TemplatedMixin", dojo.moduleUrl("dijit", "tests/_TemplatedMixin.html"), 999999);
	doh.registerUrl("dijit.tests._WidgetsInTemplateMixin", dojo.moduleUrl("dijit", "tests/_WidgetsInTemplateMixin.html"), 999999);
	doh.registerUrl("dijit.tests._Templated-widgetsInTemplate1.x", dojo.moduleUrl("dijit", "tests/_Templated-widgetsInTemplate1.x.html"), 999999);
	doh.registerUrl("dijit.tests._Container", dojo.moduleUrl("dijit", "tests/_Container.html"), 999999);
	doh.registerUrl("dijit.tests._HasDropDown", dojo.moduleUrl("dijit", "tests/_HasDropDown.html"), 999999);

	doh.registerUrl("dijit.tests.Declaration", dojo.moduleUrl("dijit","tests/test_Declaration.html"), 999999);
	doh.registerUrl("dijit.tests.Declaration_1.x", dojo.moduleUrl("dijit","tests/test_Declaration_1.x.html"), 999999);

	// Miscellaneous
	doh.registerUrl("dijit.tests.NodeList-instantiate", dojo.moduleUrl("dijit","tests/NodeList-instantiate.html"), 999999);
	doh.registerUrl("dijit.tests.Destroyable", dojo.moduleUrl("dijit","tests/Destroyable.html"), 999999);
}catch(e){
	doh.debug(e);
}

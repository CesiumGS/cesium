dojo.provide("dijit.tests.infrastructure-module");

try{
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

	doh.registerUrl("dijit.tests.Declaration", dojo.moduleUrl("dijit","tests/test_Declaration.html"), 999999);
	doh.registerUrl("dijit.tests.Declaration_1.x", dojo.moduleUrl("dijit","tests/test_Declaration_1.x.html"), 999999);

	// Miscellaneous
	doh.registerUrl("dijit.tests.NodeList-instantiate", dojo.moduleUrl("dijit","tests/NodeList-instantiate.html"), 999999);
}catch(e){
	doh.debug(e);
}

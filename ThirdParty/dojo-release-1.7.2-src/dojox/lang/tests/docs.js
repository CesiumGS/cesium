dojo.provide("dojox.lang.tests.docs");

dojo.require("dojox.lang.docs");
dojo.require("dijit.ColorPalette");

tests.register("dojox.lang.tests.docs", [
	function notReady(t){
		t.is(!dijit.ColorPalette.description, true);
	},
	function pastClassHasSchema(t){
		dojox.lang.docs.init();
		t.is(!!dijit.ColorPalette.description, true);
		dojox.lang.docs.init(); // make sure it can be called twice without any problems
		t.is(!!dijit.ColorPalette.properties.defaultTimeout.description, true);
		t.is(dijit.ColorPalette.properties.defaultTimeout.type, "number");
		t.is(dijit.ColorPalette.methods.onChange.parameters[0].type, "string");
		t.is(dijit.ColorPalette.methods.onChange.parameters[0].name, "color");
		t.is(dijit.ColorPalette["extends"], dijit._Widget);
	},
	function futureClassHasSchema(t){
		dojo.require("dijit.Dialog");
		t.is(!!dijit.Dialog.description, true);
		t.is(!!dijit.Dialog.properties.autofocus.description, true);
		t.is(dijit.Dialog.properties.autofocus.type, "boolean");
	},
	function testSchema(t){
		
	}
]);

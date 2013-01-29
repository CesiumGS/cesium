dojo.provide("dojox.wire.tests.programmatic.DataWire");

dojo.require("dojox.wire.DataWire");
dojo.require("dojox.data.XmlStore");

tests.register("dojox.wire.tests.programmatic.DataWire", [

	function test_DataWire_attribute(t){
		var store = new dojox.data.XmlStore();
		var item = store.newItem({tagName: "x"});
		new dojox.wire.DataWire({dataStore: store, object: item, attribute: "y"}).setValue("Y");
		var value = new dojox.wire.DataWire({dataStore: store, object: item, attribute: "y"}).getValue();
		t.assertEqual("Y", value);

		// nested attribute
		new dojox.wire.DataWire({dataStore: store, object: item, attribute: "y.z"}).setValue("Z");
		value = new dojox.wire.DataWire({dataStore: store, object: item, attribute: "y.z"}).getValue();
		t.assertEqual("Z", value);
	}

]);

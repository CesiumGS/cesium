dojo.provide("dojox.wire.tests.programmatic.XmlWire");

dojo.require("dojox.wire.XmlWire");

tests.register("dojox.wire.tests.programmatic.XmlWire", [

	function test_XmlWire_path(t){
		var object = {};
		var wire = dojox.wire.create({object: object, property: "element"});
		new dojox.wire.XmlWire({object: wire, path: "/x/y/text()"}).setValue("Y");
		var value = new dojox.wire.XmlWire({object: object, property: "element", path: "y/text()"}).getValue();
		t.assertEqual("Y", value);

		// attribute
		new dojox.wire.XmlWire({object: object, property: "element", path: "y/@z"}).setValue("Z");
		value = new dojox.wire.XmlWire({object: wire, path: "/x/y/@z"}).getValue();
		t.assertEqual("Z", value);

		// with index
		var document = object.element.ownerDocument;
		var element = document.createElement("y");
		element.appendChild(document.createTextNode("Y2"));
		object.element.appendChild(element);
		value = new dojox.wire.XmlWire({object: object.element, path: "y[2]/text()"}).getValue();
		t.assertEqual("Y2", value);
	}

]);

dojo.provide("dojox.wire.tests.programmatic.Wire");
dojo.require("dojox.wire.Wire");

//Simple connverter class to try to use.
dojo.declare("dojox.wire.tests.programmatic.Wire.Converter", null, {
	convert: function(v){
		return v + 1;
	}
});

//Simple converter function to try to use.
//To get it in the global namespace, gotta assign it to the
//'window' toplevel object.  Otherwise it ends up in the
//dojo NS and can't be found.
if (dojo.isBrowser) {
	window["__wireTestConverterFunction"] = function(v){
		return v + 1;
	};
}else{
	var __wireTestConverterFunction = function(v){
		return v + 1;
	};
}

tests.register("dojox.wire.tests.programmatic.Wire", [

	function test_Wire_property(t){
		var source = {a: "A", b: {c: "B.C"}};
		var target = {a: "a", b: {c: "b.c"}};
		var value = new dojox.wire.Wire({object: source, property: "a"}).getValue();
		new dojox.wire.Wire({object: target, property: "a"}).setValue(value);
		t.assertEqual(source.a, target.a);

		// child property
		value = new dojox.wire.Wire({object: source, property: "b.c"}).getValue();
		new dojox.wire.Wire({object: target, property: "b.c"}).setValue(value);
		t.assertEqual(source.b.c, target.b.c);

		// new property
		target = {};
		value = new dojox.wire.Wire({object: source, property: "a"}).getValue();
		new dojox.wire.Wire({object: target, property: "a"}).setValue(value);
		t.assertEqual(source.a, target.a);

		// new parent and child property
		target.b = {};
		value = new dojox.wire.Wire({object: source, property: "b.c"}).getValue();
		new dojox.wire.Wire({object: target, property: "b.c"}).setValue(value);
		t.assertEqual(source.b.c, target.b.c);

		// new parent and child property
		target = {};
		value = new dojox.wire.Wire({object: source, property: "b.c"}).getValue();
		new dojox.wire.Wire({object: target, property: "b.c"}).setValue(value);
		t.assertEqual(source.b.c, target.b.c);

		// new array property
		source = {a: ["A"]};
		target = {};
		value = new dojox.wire.Wire({object: source, property: "a[0]"}).getValue();
		new dojox.wire.Wire({object: target, property: "a[0]"}).setValue(value);
		t.assertEqual(source.a[0], target.a[0]);

		// by getter/setter
		source = {getA: function() { return this._a; }, _a: "A"};
		target = {setA: function(a) { this._a = a; }};
		value = new dojox.wire.Wire({object: source, property: "a"}).getValue();
		new dojox.wire.Wire({object: target, property: "a"}).setValue(value);
		t.assertEqual(source._a, target._a);

		// by get/setPropertyValue
		source = {getPropertyValue: function(p) { return this["_" + p]; }, _a: "A"};
		target = {setPropertyValue: function(p, v) { this["_" + p] = v; }};
		value = new dojox.wire.Wire({object: source, property: "a"}).getValue();
		new dojox.wire.Wire({object: target, property: "a"}).setValue(value);
		t.assertEqual(source._a, target._a);
	},

	function test_Wire_type(t){
		var source = {a: "1"};
		var string = new dojox.wire.Wire({object: source, property: "a"}).getValue();
		t.assertEqual("11", string + 1);
		var number = new dojox.wire.Wire({object: source, property: "a", type: "number"}).getValue();
		t.assertEqual(2, number + 1);
	},

	function test_Wire_converterObject(t){
		var source = {a: "1"};
		var converter = {convert: function(v) { return v + 1; }};
		var string = new dojox.wire.Wire({object: source, property: "a", converter: converter}).getValue();
		t.assertEqual("11", string);
	},

	function test_Wire_converterFunction(t){
		var source = {a: "1"};
		var converter = {convert: function(v) { return v + 1; }};
		var number = new dojox.wire.Wire({object: source, property: "a", type: "number", converter: converter.convert}).getValue();
		t.assertEqual(2, number);
	},

	function test_Wire_converterObjectByString(t){
		var source = {a: "1"};
		var number = new dojox.wire.Wire({object: source, property: "a", type: "number", converter: "dojox.wire.tests.programmatic.Wire.Converter"}).getValue();
		t.assertEqual(2, number);
	},

	function test_Wire_converterFunctionByString(t){
		var source = {a: "1"};
		var number = new dojox.wire.Wire({object: source, property: "a", type: "number", converter: "__wireTestConverterFunction"}).getValue();
		t.assertEqual(2, number);
	},

	function test_Wire_converterObjectByStringDynamic(t){
		var source = {a: "1"};
		var number = new dojox.wire.Wire({object: source, property: "a", type: "number", converter: "dojox.wire.tests.programmatic.ConverterDynamic"}).getValue();
		t.assertEqual(2, number);
	}

]);

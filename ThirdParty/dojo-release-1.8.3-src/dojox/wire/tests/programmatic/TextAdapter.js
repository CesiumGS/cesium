dojo.provide("dojox.wire.tests.programmatic.TextAdapter");

dojo.require("dojox.wire.TextAdapter");

tests.register("dojox.wire.tests.programmatic.TextAdapter", [

	function test_TextAdapter_segments(t){
		var source = {a: "a", b: "b", c: "c"};
		var segments = [{property: "a"}, {property: "b"}, {property: "c"}];
		var value = new dojox.wire.TextAdapter({object: source, segments: segments}).getValue();
		t.assertEqual("abc", value);
	},

	function test_TextAdapter_delimiter(t){
		var source = {a: "a", b: "b", c: "c"};
		var segments = [{property: "a"}, {property: "b"}, {property: "c"}];
		var value = new dojox.wire.TextAdapter({object: source, segments: segments, delimiter: "/"}).getValue();
		t.assertEqual("a/b/c", value);
	}

]);

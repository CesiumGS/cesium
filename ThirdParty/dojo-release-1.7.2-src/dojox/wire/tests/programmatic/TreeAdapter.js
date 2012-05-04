dojo.provide("dojox.wire.tests.programmatic.TreeAdapter");

dojo.require("dojox.wire.TreeAdapter");

tests.register("dojox.wire.tests.programmatic.TreeAdapter", [

	function test_TreeAdapter_nodes(t){
		var source = [
			{a: "A1", b: "B1", c: "C1"},
			{a: "A2", b: "B2", c: "C2"},
			{a: "A3", b: "B3", c: "C3"}
		];
		var nodes = [
			{title: {property: "a"}, children: [
				{node: {property: "b"}},
				{title: {property: "c"}}
			]}
		];
		var value = new dojox.wire.TreeAdapter({object: source, nodes: nodes}).getValue();
		t.assertEqual(source[0].a, value[0].title);
		t.assertEqual(source[1].b, value[1].children[0].title);
		t.assertEqual(source[2].c, value[2].children[1].title);
	}

]);

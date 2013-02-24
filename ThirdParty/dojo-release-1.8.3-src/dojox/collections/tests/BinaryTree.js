dojo.provide("dojox.collections.tests.BinaryTree");
dojo.require("dojox.collections.BinaryTree");

tests.register("dojox.collections.tests.BinaryTree", [
	function testCtor(t){
		var bt=new dojox.collections.BinaryTree("foo");
		t.assertTrue(bt instanceof dojox.collections.BinaryTree);
	},
	function testAdd(t){
		var bt=new dojox.collections.BinaryTree("foo");
		bt.add("bar");
		bt.add("baz");
		bt.add("buck");
		bt.add("shot");
		bt.add("apple");
		t.assertEqual("apple,bar,baz,buck,foo,shot",bt.toString());
	},
	function testClear(t){
		var bt=new dojox.collections.BinaryTree("foo");
		bt.add("bar");
		bt.add("baz");
		bt.add("buck");
		bt.add("shot");
		bt.add("apple");
		bt.clear();
		t.assertEqual(bt.count, 0);
	},
	function testClone(t){
		var bt=new dojox.collections.BinaryTree("foo");
		bt.add("bar");
		bt.add("baz");
		bt.add("buck");
		bt.add("shot");
		bt.add("apple");
		var bt2=bt.clone();
		t.assertEqual(bt2.count, 6);
		t.assertEqual(bt.toString(), bt2.toString());
	},
	function testContains(t){
		var bt=new dojox.collections.BinaryTree("foo");
		bt.add("bar");
		bt.add("baz");
		bt.add("buck");
		bt.add("shot");
		bt.add("apple");
		t.assertTrue(bt.contains("buck"));
		t.assertFalse(bt.contains("duck"));
	},
	function testDeleteData(t){
		var bt=new dojox.collections.BinaryTree("foo");
		bt.add("bar");
		bt.add("baz");
		bt.add("buck");
		bt.add("shot");
		bt.add("apple");
		bt.deleteData("buck");
		t.assertEqual("apple,bar,baz,foo,shot",bt.toString());
	},
	function testGetIterator(t){
		var bt=new dojox.collections.BinaryTree("foo");
		bt.add("bar");
		bt.add("baz");
		bt.add("buck");
		bt.add("shot");
		bt.add("apple");
		var itr=bt.getIterator();
		while(!itr.atEnd()){ itr.get(); }
		t.assertEqual("shot", itr.element);
	},
	function testSearch(t){
		var bt=new dojox.collections.BinaryTree("foo");
		bt.add("bar");
		bt.add("baz");
		bt.add("buck");
		bt.add("shot");
		bt.add("apple");
		t.assertEqual("buck", bt.search("buck").value);
	}
]);

dojo.provide("dojox.collections.tests.SortedList");
dojo.require("dojox.collections.SortedList");

tests.register("dojox.collections.tests.SortedList", [
	function testCtor(t){
		var sl=new dojox.collections.SortedList();
		t.assertTrue(sl instanceof dojox.collections.SortedList);
	},
	function testAdd(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		t.assertEqual("bar", sl.item("foo").valueOf());
	},
	function testClear(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.clear();
		t.assertEqual(0, sl.count);
	},
	function testClone(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		var sl2=sl.clone();
		t.assertTrue(sl2.contains("baz"));
	},
	function testContains(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		t.assertTrue(sl.contains("baz"));
		t.assertFalse(sl.contains("faz"));
	},
	function testContainsKey(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		t.assertTrue(sl.containsKey("buck"));
		t.assertFalse(sl.containsKey("faz"));
	},
	function testContainsValue(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		t.assertTrue(sl.containsValue("shot"));
		t.assertFalse(sl.containsValue("faz"));
	},
	function testGetKeyList(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		t.assertEqual("foo,baz,buck,apple",sl.getKeyList().join(','));
	},
	function testGetValueList(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		t.assertEqual("bar,fab,shot,orange",sl.getValueList().join(','));
	},
	function testCopyTo(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		var arr=["bek"];
		sl.copyTo(arr,0);
		t.assertEqual("bar,fab,shot,orange,bek", arr.join(','));
	},
	function testGetByIndex(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		t.assertEqual("shot", sl.getByIndex(2));
	},
	function testGetKey(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		t.assertEqual("apple", sl.getKey(0));
	},
	function testIndexOfKey(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		t.assertEqual(0, sl.indexOfKey("apple"));
	},
	function testIndexOfValue(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		t.assertEqual(3, sl.indexOfValue("bar"));
	},
	function testRemove(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		sl.remove("baz");
		t.assertEqual(3, sl.count);
		t.assertEqual(undefined, sl.item("baz"));
	},
	function testRemoveAt(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		sl.removeAt(2);
		t.assertEqual(undefined, sl.item("buck"));
	},
	function testReplace(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		sl.replace("buck","dollar");
		t.assertEqual(sl.item("buck").valueOf(), "dollar");
	},
	function testSetByIndex(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");
		sl.setByIndex(0, "bar");
		t.assertEqual("bar", sl.getByIndex(0));
	},
	function testSorting(t){
		var sl=new dojox.collections.SortedList();
		sl.add("foo","bar");
		sl.add("baz","fab");
		sl.add("buck","shot");
		sl.add("apple","orange");

		var a=[];
		sl.forEach(function(item){
			a.push(item);
		});
		t.assertEqual("orange,fab,shot,bar", a.join());
	}
]);

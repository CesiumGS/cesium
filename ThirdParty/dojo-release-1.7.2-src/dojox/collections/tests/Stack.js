dojo.provide("dojox.collections.tests.Stack");
dojo.require("dojox.collections.Stack");

tests.register("dojox.collections.tests.Stack", [
	function testCtor(t){
		var s=new dojox.collections.Stack(["foo","bar","test","bull"]);
		t.assertEqual(4, s.count);
	},
	function testClear(t){
		var s=new dojox.collections.Stack(["foo","bar","test","bull"]);
		s.clear();
		t.assertEqual(0, s.count);
	},
	function testClone(t){
		var s=new dojox.collections.Stack(["foo","bar","test","bull"]);
		var cloned=s.clone();
		t.assertEqual(s.count, cloned.count);
		t.assertEqual(s.toArray().join(), cloned.toArray().join());
	},
	function testContains(t){
		var s=new dojox.collections.Stack(["foo","bar","test","bull"]);
		t.assertTrue(s.contains("bar"));
		t.assertFalse(s.contains("faz"));
	},
	function testGetIterator(t){
		var s=new dojox.collections.Stack(["foo","bar","test","bull"]);
		var itr=s.getIterator();
		while(!itr.atEnd()){ itr.get(); }
		t.assertEqual("bull", itr.element);
	},
	function testPeek(t){
		var s=new dojox.collections.Stack(["foo","bar","test","bull"]);
		t.assertEqual("bull", s.peek());
	},
	function testPop(t){
		var s=new dojox.collections.Stack(["foo","bar","test","bull"]);
		t.assertEqual("bull", s.pop());
		t.assertEqual("test", s.pop());
	},
	function testPush(t){
		var s=new dojox.collections.Stack(["foo","bar","test","bull"]);
		s.push("bug");
		t.assertEqual("bug", s.peek());
	}
]);

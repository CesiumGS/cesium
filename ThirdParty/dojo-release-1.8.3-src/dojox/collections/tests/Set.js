dojo.provide("dojox.collections.tests.Set");
dojo.require("dojox.collections.Set");

(function(){
	var dxcs=dojox.collections.Set;
	var a = ["apple","bear","candy","donut","epiphite","frank"];
	var b = ["bear","epiphite","google","happy","joy"];
	tests.register("dojox.collections.tests.Set", [
		function testUnion(t){
			var union=dxcs.union(a,b);
			t.assertEqual("apple,bear,candy,donut,epiphite,frank,google,happy,joy", union.toArray().join(','));
		},
		function testIntersection(t){
			var itsn=dxcs.intersection(a,b);
			t.assertEqual("bear,epiphite", itsn.toArray().join(","));
			t.assertEqual("bear", dxcs.intersection(["bear","apple"], ["bear"]));
		},
		function testDifference(t){
			var d=dxcs.difference(a,b);
			t.assertEqual("apple,candy,donut,frank",d.toArray().join(','));
		},
		function testIsSubSet(t){
			t.assertFalse(dxcs.isSubSet(a,["bear","candy"]));
			t.assertTrue(dxcs.isSubSet(["bear","candy"],a));
		},
		function testIsSuperSet(t){
			t.assertTrue(dxcs.isSuperSet(a,["bear","candy"]));
			t.assertFalse(dxcs.isSuperSet(["bear","candy"],a));
		}
	]);
})();

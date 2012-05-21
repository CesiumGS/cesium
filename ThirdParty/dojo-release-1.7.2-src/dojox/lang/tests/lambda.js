dojo.provide("dojox.lang.tests.lambda");

dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.sequence");

(function(){
	var df = dojox.lang.functional;
	tests.register("dojox.lang.tests.lambda", [
		function testLambda1(t){ t.assertEqual(df.repeat(3, "3*", 1), [1, 3, 9]); },
		function testLambda2(t){ t.assertEqual(df.repeat(3, "*3", 1), [1, 3, 9]); },
		function testLambda3(t){ t.assertEqual(df.repeat(3, "_*3", 1), [1, 3, 9]); },
		function testLambda4(t){ t.assertEqual(df.repeat(3, "3*_", 1), [1, 3, 9]); },
		function testLambda5(t){ t.assertEqual(df.repeat(3, "n->n*3", 1), [1, 3, 9]); },
		function testLambda6(t){ t.assertEqual(df.repeat(3, "n*3", 1), [1, 3, 9]); },
		function testLambda7(t){ t.assertEqual(df.repeat(3, "3*m", 1), [1, 3, 9]); },
		function testLambda8(t){ t.assertEqual(df.repeat(3, "->1", 1), [1, 1, 1]); },
		function testLambda9(t){ t.assertEqual(df.repeat(3, function(n){ return n * 3; }, 1), [1, 3, 9]); },
		function testLambda10(t){ t.assertEqual(df.repeat(3, ["_-1", ["*3"]], 1), [1, 2, 5]); }
	]);
})();

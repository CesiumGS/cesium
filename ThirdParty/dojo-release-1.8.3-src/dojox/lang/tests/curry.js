dojo.provide("dojox.lang.tests.curry");

dojo.require("dojox.lang.functional.curry");

(function(){
	var df = dojox.lang.functional, add5 = df.curry("+")(5), sub3 = df.curry("_-3"), fun = df.lambda("100*a + 10*b + c");
	tests.register("dojox.lang.tests.curry", [
		function testCurry1(t){ t.assertEqual(df.curry("+")(1, 2), 3); },
		function testCurry2(t){ t.assertEqual(df.curry("+")(1)(2), 3); },
		function testCurry3(t){ t.assertEqual(df.curry("+")(1, 2, 3), 3); },
		function testCurry4(t){ t.assertEqual(add5(1), 6); },
		function testCurry5(t){ t.assertEqual(add5(3), 8); },
		function testCurry6(t){ t.assertEqual(add5(5), 10); },
		function testCurry7(t){ t.assertEqual(sub3(1), -2); },
		function testCurry8(t){ t.assertEqual(sub3(3), 0); },
		function testCurry9(t){ t.assertEqual(sub3(5), 2); },
		
		function testPartial1(t){ t.assertEqual(df.partial(fun, 1, 2, 3)(), 123); },
		function testPartial2(t){ t.assertEqual(df.partial(fun, 1, 2, df.arg)(3), 123); },
		function testPartial3(t){ t.assertEqual(df.partial(fun, 1, df.arg, 3)(2), 123); },
		function testPartial4(t){ t.assertEqual(df.partial(fun, 1, df.arg, df.arg)(2, 3), 123); },
		function testPartial5(t){ t.assertEqual(df.partial(fun, df.arg, 2, 3)(1), 123); },
		function testPartial6(t){ t.assertEqual(df.partial(fun, df.arg, 2, df.arg)(1, 3), 123); },
		function testPartial7(t){ t.assertEqual(df.partial(fun, df.arg, df.arg, 3)(1, 2), 123); },
		function testPartial8(t){ t.assertEqual(df.partial(fun, df.arg, df.arg, df.arg)(1, 2, 3), 123); }
	]);
})();

dojo.provide("dojox.lang.tests.array");

dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.fold");
dojo.require("dojox.lang.functional.reversed");

(function(){
	var df = dojox.lang.functional, v, isOdd = "%2", x = {a: 1, b: 2, c: 3};
	
	var revArrayIter = function(array){
		this.array    = array;
		this.position = array.length - 1;
	};
	dojo.extend(revArrayIter, {
		hasNext:	df.lambda("this.position >= 0"),
		next:		df.lambda("this.array[this.position--]")
	});
	
	tests.register("dojox.lang.tests.array", [
		function testFilter1(t){ t.assertEqual(df.filter([1, 2, 3], isOdd), [1, 3]); },
		function testFilter2(t){ t.assertEqual(df.filter([1, 2, 3], "%2==0"), [2]); },
		function testFilterIter(t){
			var iter = new revArrayIter([1, 2, 3]);
			t.assertEqual(df.filter(iter, isOdd), [3, 1]);
		},
		function testFilterRev(t){
			var iter = new revArrayIter([1, 2, 3]);
			t.assertEqual(df.filter(iter, isOdd), df.filterRev([1, 2, 3], isOdd));
		},
		
		function testForEach(t){
			t.assertEqual((v = [], df.forEach([1, 2, 3], function(x){ v.push(x); }), v), [1, 2, 3]);
		},
		function testForEachIter(t){
			var iter = new revArrayIter([1, 2, 3]);
			t.assertEqual((v = [], df.forEach(iter, function(x){ v.push(x); }), v), [3, 2, 1]);
		},
		function testForEachRev(t){
			t.assertEqual((v = [], df.forEachRev([1, 2, 3], function(x){ v.push(x); }), v), [3, 2, 1]);
		},
		
		function testMap(t){ t.assertEqual(df.map([1, 2, 3], "+3"), [4, 5, 6]); },
		function testMapIter(t){
			var iter = new revArrayIter([1, 2, 3]);
			t.assertEqual(df.map(iter, "+3"), [6, 5, 4]);
		},
		function testMapRev(t){
			var iter = new revArrayIter([1, 2, 3]);
			t.assertEqual(df.map(iter, "+3"), df.mapRev([1, 2, 3], "+3"));
		},
		
		function testEvery1(t){ t.assertFalse(df.every([1, 2, 3], isOdd)); },
		function testEvery2(t){ t.assertTrue(df.every([1, 3, 5], isOdd)); },
		function testEveryIter(t){
			var iter = new revArrayIter([1, 3, 5]);
			t.assertTrue(df.every(iter, isOdd));
		},
		function testEveryObj(t){ t.assertFalse(df.every(x, "%2")); },
		function testEveryRev1(t){ t.assertFalse(df.everyRev([1, 2, 3], isOdd)); },
		function testEveryRev2(t){ t.assertTrue(df.everyRev([1, 3, 5], isOdd)); },

		function testSome1(t){ t.assertFalse(df.some([2, 4, 6], isOdd)); },
		function testSome2(t){ t.assertTrue(df.some([1, 2, 3], isOdd)); },
		function testSomeIter(t){
			var iter = new revArrayIter([1, 2, 3]);
			t.assertTrue(df.some(iter, isOdd));
		},
		function testSomeObj(t){ t.assertTrue(df.some(x, "%2")); },
		function testSomeRev1(t){ t.assertFalse(df.someRev([2, 4, 6], isOdd)); },
		function testSomeRev2(t){ t.assertTrue(df.someRev([1, 2, 3], isOdd)); },

		function testReduce1(t){ t.assertEqual(df.reduce([4, 2, 1], "x-y"), 1); },
		function testReduce2(t){ t.assertEqual(df.reduce([4, 2, 1], "x-y", 8), 1); },
		function testReduceIter(t){
			var iter = new revArrayIter([1, 2, 4]);
			t.assertEqual(df.reduce(iter, "x-y"), 1);
		},
		
		function testReduceRight1(t){ t.assertEqual(df.reduceRight([4, 2, 1], "x-y"), -5); },
		function testReduceRight2(t){ t.assertEqual(df.reduceRight([4, 2, 1], "x-y", 8), 1); }
	]);
})();

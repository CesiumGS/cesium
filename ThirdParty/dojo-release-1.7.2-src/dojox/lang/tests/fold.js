dojo.provide("dojox.lang.tests.fold");

dojo.require("dojox.lang.functional.fold");
dojo.require("dojox.lang.functional.scan");
dojo.require("dojox.lang.functional.curry");
dojo.require("dojox.lang.functional.sequence");
dojo.require("dojox.lang.functional.listcomp");
dojo.require("dojox.lang.functional.object");

(function(){
	var df = dojox.lang.functional, a = df.arg, x = {a: 1, b: 2, c: 3};

	var revArrayIter = function(array){
		this.array    = array;
		this.position = array.length - 1;
	};
	dojo.extend(revArrayIter, {
		hasNext:	df.lambda("this.position >= 0"),
		next:		df.lambda("this.array[this.position--]")
	});

	tests.register("dojox.lang.tests.fold", [
		function testFoldl1(t){ t.assertEqual(df.foldl([1, 2, 3], "+", 0), 6); },
		function testFoldl2(t){ t.assertEqual(df.foldl1([1, 2, 3], "*"), 6); },
		function testFoldl3(t){ t.assertEqual(df.foldl1([1, 2, 3], "/"), 1/6); },
		function testFoldl4(t){ t.assertEqual(df.foldl1([1, 2, 3], df.partial(Math.max, a, a)), 3); },
		function testFoldl5(t){ t.assertEqual(df.foldl1([1, 2, 3], df.partial(Math.min, a, a)), 1); },
		
		function testFoldlIter(t){
			var iter = new revArrayIter([1, 2, 3]);
			t.assertEqual(df.foldl(iter, "+", 0), 6);
		},
		function testFoldl1Iter(t){
			var iter = new revArrayIter([1, 2, 3]);
			t.assertEqual(df.foldl1(iter, "/"), 3/2);
		},

		function testFoldlObj(t){ t.assertEqual(df.foldl(x, "*", 2), 12); },
		function testFoldl1Obj(t){ t.assertEqual(df.foldl1(x, "+"), 6); },
		
		function testFoldr1(t){ t.assertEqual(df.foldr([1, 2, 3], "+", 0), 6); },
		function testFoldr2(t){ t.assertEqual(df.foldr1([1, 2, 3], "*"), 6); },
		function testFoldr3(t){ t.assertEqual(df.foldr1([1, 2, 3], "/"), 3/2); },
		function testFoldr4(t){ t.assertEqual(df.foldr1([1, 2, 3], df.partial(Math.max, a, a)), 3); },
		function testFoldr5(t){ t.assertEqual(df.foldr1([1, 2, 3], df.partial(Math.min, a, a)), 1); },
		
		function testUnfold1(t){
			// simulate df.repeat()
			t.assertEqual(
				df.repeat(10, "2*", 1),
				df.unfold("x[0] >= 10", "x[1]", "[x[0] + 1, 2 * x[1]]", [0, 1])
			);
		},
		function testUnfold2(t){
			// simulate df.until()
			t.assertEqual(
				df.until(">1024", "2*", 1),
				df.unfold(">1024", "x", "2*", 1)
			);
		},
		
		function testScanl1(t){ t.assertEqual(df.scanl([1, 2, 3], "+", 0), [0, 1, 3, 6]); },
		function testScanl2(t){ t.assertEqual(df.scanl1([1, 2, 3], "*"), [1, 2, 6]); },
		function testScanl3(t){ t.assertEqual(df.scanl1([1, 2, 3], df.partial(Math.max, a, a)), [1, 2, 3]); },
		function testScanl4(t){ t.assertEqual(df.scanl1([1, 2, 3], df.partial(Math.min, a, a)), [1, 1, 1]); },

		function testScanlIter(t){
			var iter = new revArrayIter([1, 2, 3]);
			t.assertEqual(df.scanl(iter, "+", 0), [0, 3, 5, 6]);
		},
		function testScanl1Iter(t){
			var iter = new revArrayIter([1, 2, 3]);
			t.assertEqual(df.scanl1(iter, "*"), [3, 6, 6]);
		},
		
		function testScanlObj(t){ t.assertEqual(df.scanl(x, "+", 0), df.scanl(df.values(x), "+", 0)); },
		function testScanl1Obj(t){ t.assertEqual(df.scanl1(x, "*"), df.scanl1(df.values(x), "*")); },

		function testScanr1(t){ t.assertEqual(df.scanr([1, 2, 3], "+", 0), [6, 5, 3, 0]); },
		function testScanr2(t){ t.assertEqual(df.scanr1([1, 2, 3], "*"), [6, 6, 3]); },
		function testScanr3(t){ t.assertEqual(df.scanr1([1, 2, 3], df.partial(Math.max, a, a)), [3, 3, 3]); },
		function testScanr4(t){ t.assertEqual(df.scanr1([1, 2, 3], df.partial(Math.min, a, a)), [1, 2, 3]); }
	]);
})();

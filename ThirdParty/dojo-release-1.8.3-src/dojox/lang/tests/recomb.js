dojo.provide("dojox.lang.tests.recomb");

dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.listcomp");

dojo.require("dojox.lang.functional.linrec");
dojo.require("dojox.lang.functional.numrec");
dojo.require("dojox.lang.functional.tailrec");
dojo.require("dojox.lang.functional.binrec");
dojo.require("dojox.lang.functional.multirec");

(function(){
	var df = dojox.lang.functional,
		
		// define the standard factorial function to compare with
		fact = function(n){ return n <= 1 ? 1 : n * fact(n - 1); },

		// define the standard fibonacci function to compare with
		fib  = function(n){ return n <= 1 ? 1 : fib(n - 1) + fib(n - 2); },
		
		// prepare the sequence of arguments for comparison
		seq = df.listcomp("i for(i = 0; i < 15; ++i)"),
		
		// build a set of results for our argument list using the standard factorial function
		factTable = df.map(seq, fact),

		// build a set of results for our argument list using the standard fibonacci function
		fibTable  = df.map(seq, fib);
	
	tests.register("dojox.lang.tests.recomb", [
		function testFactLinrec1(t){
			var fact = df.linrec("<= 1", "1", "[n - 1]", "a * b[0]");
			t.assertEqual(df.map(seq, fact), factTable);
		},
		function testFactLinrec2(t){
			var fact = df.linrec(df.lambda("<= 1"), df.lambda("1"), df.lambda("[n - 1]"), df.lambda("a * b[0]"));
			t.assertEqual(df.map(seq, fact), factTable);
		},
		function testFactNumrec1(t){
			var fact = df.numrec(1, "*");
			t.assertEqual(df.map(seq, fact), factTable);
		},
		function testFactNumrec2(t){
			var fact = df.numrec(1, df.lambda("*"));
			t.assertEqual(df.map(seq, fact), factTable);
		},
		function testFactMultirec1(t){
			var fact = df.multirec("<= 1", "1", "[[n - 1]]", "a[0] * b[0]");
			t.assertEqual(df.map(seq, fact), factTable);
		},
		function testFactMultirec2(t){
			var fact = df.multirec(df.lambda("<= 1"), df.lambda("1"), df.lambda("[[n - 1]]"), df.lambda("a[0] * b[0]"));
			t.assertEqual(df.map(seq, fact), factTable);
		},
		function testFactTailrec1(t){
			var fact2 = df.tailrec("<= 1", "n, acc -> acc", "[n - 1, n * acc]"),
				fact  = function(n){ return fact2(n, 1); };
			t.assertEqual(df.map(seq, fact), factTable);
		},
		function testFactTailrec2(t){
			var fact2 = df.tailrec(df.lambda("<= 1"), df.lambda("n, acc -> acc"), df.lambda("[n - 1, n * acc]")),
				fact  = function(n){ return fact2(n, 1); };
			t.assertEqual(df.map(seq, fact), factTable);
		},
		function testFibBinrec1(t){
			var fib = df.binrec("<= 1", "1", "[[n - 1], [n - 2]]", "+");
			t.assertEqual(df.map(seq, fib), fibTable);
		},
		function testFibBinrec2(t){
			var fib = df.binrec(df.lambda("<= 1"), df.lambda("1"), df.lambda("[[n - 1], [n - 2]]"), df.lambda("+"));
			t.assertEqual(df.map(seq, fib), fibTable);
		},
		function testFibTailrec1(t){
			var fib2 = df.tailrec("<= 0", "n, next, result -> result", "[n - 1, next + result, next]"),
				fib  = function(n){ return fib2(n, 1, 1); };
			t.assertEqual(df.map(seq, fib), fibTable);
		},
		function testFibTailrec2(t){
			var fib2 = df.tailrec(df.lambda("<= 0"), df.lambda("n, next, result -> result"), df.lambda("[n - 1, next + result, next]")),
				fib  = function(n){ return fib2(n, 1, 1); };
			t.assertEqual(df.map(seq, fib), fibTable);
		},
		function testFibMultirec1(t){
			var fib = df.multirec("<= 1", "1", "[[n - 1], [n - 2]]", "a[0] + a[1]");
			t.assertEqual(df.map(seq, fib), fibTable);
		},
		function testFibMultirec2(t){
			var fib = df.multirec(df.lambda("<= 1"), df.lambda("1"), df.lambda("[[n - 1], [n - 2]]"), df.lambda("a[0] + a[1]"));
			t.assertEqual(df.map(seq, fib), fibTable);
		}
	]);
})();

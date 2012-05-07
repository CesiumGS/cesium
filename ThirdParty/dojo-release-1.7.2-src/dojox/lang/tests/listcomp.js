dojo.provide("dojox.lang.tests.listcomp");

dojo.require("dojox.lang.functional.listcomp");
dojo.require("dojox.lang.functional.sequence");

(function(){
	var df = dojox.lang.functional;
	tests.register("dojox.lang.tests.listcomp", [
		function testIterator1(t){ t.assertEqual(df.repeat(3, function(n){ return n + 1; }, 0), [0, 1, 2]); },
		function testIterator2(t){ t.assertEqual(df.repeat(3, function(n){ return n * 3; }, 1), [1, 3, 9]); },
		function testIterator3(t){ t.assertEqual(df.until(function(n){ return n > 10; }, function(n){ return n * 3; }, 1), [1, 3, 9]); },
		
		function testListcomp1(t){ t.assertEqual(df.listcomp("i for(var i=0; i<3; ++i)"), [0, 1, 2]); },
		function testListcomp2(t){ t.assertEqual(df.listcomp("i*j for(var i=0; i<3; ++i) for(var j=0; j<3; ++j)"), [0, 0, 0, 0, 1, 2, 0, 2, 4]); },
		function testListcomp3(t){ t.assertEqual(df.listcomp("i*j for(var i=0; i<3; ++i) if(i%2==1) for(var j=0; j<3; ++j)"), [0, 1, 2]); },
		function testListcomp4(t){ t.assertEqual(df.listcomp("i+j for(var i=0; i<3; ++i) for(var j=0; j<3; ++j)"), [0, 1, 2, 1, 2, 3, 2, 3, 4]); },
		function testListcomp5(t){ t.assertEqual(df.listcomp("i+j for(var i=0; i<3; ++i) if(i%2==1) for(var j=0; j<3; ++j)"), [1, 2, 3]); },
		function testListcomp6(t){ t.assertEqual(df.listcomp("i for(i=0; i<3; ++i)"), [0, 1, 2]); },
		function testListcomp7(t){ t.assertEqual(df.listcomp("i*j for(i=0; i<3; ++i) for(j=0; j<3; ++j)"), [0, 0, 0, 0, 1, 2, 0, 2, 4]); },
		function testListcomp8(t){ t.assertEqual(df.listcomp("i*j for(i=0; i<3; ++i) if(i%2==1) for(j=0; j<3; ++j)"), [0, 1, 2]); },
		function testListcomp9(t){ t.assertEqual(df.listcomp("i+j for(i=0; i<3; ++i) for(j=0; j<3; ++j)"), [0, 1, 2, 1, 2, 3, 2, 3, 4]); },
		function testListcomp10(t){ t.assertEqual(df.listcomp("i+j for(i=0; i<3; ++i) if(i%2==1) for(j=0; j<3; ++j)"), [1, 2, 3]); }
	]);
})();

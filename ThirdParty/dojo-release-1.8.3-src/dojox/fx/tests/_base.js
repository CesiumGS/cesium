dojo.provide("dojox.fx.tests._base");

dojo.require("dojox.fx._core");
dojo.require("dojox.fx");

tests.register("dojox.fx.tests._base", [

	function simpleLineTest(t){

		var line = new dojox.fx._Line(
			[0, 100],
			[100, 0]
		);

		var first = line.getValue(0);
		t.assertEqual(first[0], 0);
		t.assertEqual(first[1], 100);
		
		var mid = line.getValue(0.5);
		t.assertEqual(mid[0], 50);
		t.assertEqual(mid[1], 50);
		
		var end = line.getValue(1);
		t.assertEqual(end[0], 100);
		t.assertEqual(end[1], 0);

	},
	
	function singleLineTest(t){
		
		var line = new dojox.fx._Line(0,100);
		t.assertEqual(line.getValue(0), 0);
		t.assertEqual(line.getValue(0.5), 50);
		t.assertEqual(line.getValue(1), 100);
		
	},
	
	function multiDimensionalTest(t){
		
		var startSet = [5, 10, 15, 20, 25, 30, 35];
		var endSet = [35, 30, 25, 20, 15, 10, 5];
				
		var line = new dojox.fx._Line(startSet, endSet);
		
		var start = line.getValue(0);
		var mid = line.getValue(0.5);
		var end = line.getValue(1);
		
		t.assertEqual(start.length, 7);
		t.assertEqual(end.length, 7);
		
		t.assertEqual(startSet[0], start[0]);
		t.assertEqual(startSet[1], start[1]);
		t.assertEqual(startSet[5], start[5]);
		
		var expectedMid = 20;
		dojo.forEach(line.getValue(0.5), function(val, i){
			t.assertEqual(expectedMid, val)
		});
		
	}
	
]);

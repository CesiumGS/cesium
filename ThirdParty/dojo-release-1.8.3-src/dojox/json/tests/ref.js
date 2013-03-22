dojo.provide("dojox.json.tests.ref");
dojo.require("dojox.json.ref");

doh.register("dojox.json.tests.ref", [
	function fromRefJson(t) {
		var testStr = '{a:{$ref:"#"},id:"root",c:{d:"e",f:{$ref:"root.c"}},b:{$ref:"#.c"},"an array":["a string"],"a string":{$ref:"#an array.0"}}';

		var mirrorObj = dojox.json.ref.fromJson(testStr);
		t.assertEqual(mirrorObj, mirrorObj.a);
		t.assertEqual(mirrorObj.c, mirrorObj.c.f);
		t.assertEqual(mirrorObj.c, mirrorObj.b);
		t.assertEqual(mirrorObj["a string"], "a string");
	},
	function toAndFromRefJson(t) {
		var testObj = {a:{},b:{"has space":{}}};
		testObj.a.d= testObj;
		var arrayItem = testObj.array = [{}];
		arrayItem[1] = arrayItem[0];
		testObj.b.g=testObj.a;
		testObj.b["has space"].f = testObj.b;
		testObj.b.h=testObj.a;
		var mirrorObj = dojox.json.ref.fromJson(dojox.json.ref.toJson(testObj));
		t.assertEqual(mirrorObj.a.d, mirrorObj);
		t.assertEqual(mirrorObj.b.g, mirrorObj.a);
		t.assertEqual(mirrorObj.b["has space"].f, mirrorObj.b);
		t.assertEqual(mirrorObj.b.h, mirrorObj.a);
		t.assertEqual(mirrorObj.array[0], mirrorObj.array[1]);
	},
	function usingSchemas(t) {
		var testStr = '{id:"/dog/1",eats:{$ref:"/cat/2"},aTime:"2008-11-07T20:26:17-07:00"}';
		var schemas = {
			"/dog/":{prototype:{barks:true},properties:{aTime:{format:'date-time'}}},
			"/cat/":{prototype:{meows:true}}
		}
		var testObj = dojox.json.ref.fromJson(testStr,{
			schemas:schemas
		});
		t.t(testObj.barks);
		t.t(testObj.aTime instanceof Date);
		t.t(testObj.eats.meows);
	},
	function secondLevelLazy(t) {
		var testStr = '[{$ref:1,foo:"bar"},{$ref:2, me:{$ref:2},first:{$ref:1}}]';
		var mirrorObj = dojox.json.ref.fromJson(testStr);
		t.is(mirrorObj[0].foo,"bar");
		t.is(mirrorObj[1],mirrorObj[1].me);
		t.is(mirrorObj[0],mirrorObj[1].first);
	}
	
	/*,
	function performanceTest(t) {
		var normalishJson= '[{"id":"1",	"created":"2007-10-23T14:40:18Z","address":"somewhere","phoneNumber":"555-5555","comment":"this is great",	"firstName":"Jim",	"lastName":"Jones"},{"id":"20","created":"2008-06-03T19:45:12Z",	"firstName":"Kristopher",	"lastName":"dddddd"	},{"id":"23",	"foo":"ba=sr",	"firstName":"Jennika",	"lastName":"Zyp"	}]';
		var now = new Date().getTime();
		for(var i=0;i<1000;i++){
		}
		console.log("Just Loop",new Date().getTime()-now);
		now = new Date().getTime();
		var result;
		for(i=0;i<1000;i++){
			result = dojo.fromJson(normalishJson);
		}
		console.log("Normal fromJson",new Date().getTime()-now, result, normalishJson.length);
		now = new Date().getTime();
		for(i=0;i<1000;i++){
			result = dojox.json.ref.fromJson(normalishJson);
		}
		console.log("JSON Referencing toJson",new Date().getTime()-now, result);
	}*/
]);

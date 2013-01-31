dojo.provide("dojo.tests._base.json");

tests.register("tests._base.json",
	[
		//Not testing dojo.toJson() on its own since Rhino will output the object properties in a different order.
		//Still valid json, but just in a different order than the source string.

		// take a json-compatible object, convert it to a json string, then put it back into json.
		function toAndFromJson(t){
			var testObj = {a:"a", b:1, c:"c", d:"d", e:{e1:"e1", e2:2}, f:[1,2,3], g:"g",h:{h1:{h2:{h3:"h3"}}},i:[[0,1,2],[3],[4]]};

			var mirrorObj = dojo.fromJson(dojo.toJson(testObj));
			t.assertEqual("a", mirrorObj.a);
			t.assertEqual(1, mirrorObj.b);
			t.assertEqual("c", mirrorObj.c);
			t.assertEqual("d", mirrorObj.d);
			t.assertEqual("e1", mirrorObj.e.e1);
			t.assertEqual(2, mirrorObj.e.e2);
			t.assertEqual(1, mirrorObj.f[0]);
			t.assertEqual(2, mirrorObj.f[1]);
			t.assertEqual(3, mirrorObj.f[2]);
			t.assertEqual("g", mirrorObj.g);
			t.assertEqual("h3", mirrorObj.h.h1.h2.h3);
			var badJson;
			try{
				badJson = dojo.fromJson("bad json"); // this should throw an exception, and not set badJson
			}catch(e){
			}
			t.assertEqual(undefined,badJson);
			t.assertEqual(3, mirrorObj.i[0].length);
			t.assertEqual(1, mirrorObj.i[1].length);
			t.assertEqual(1, mirrorObj.i[2].length);
		},
		// tricky json, using our JSON extensions
		function dojoExtendedJson(t){
			var testObj = {ex1:{b:3, json:function(){return "json" + this.b;}}, ex2: {b:4, __json__:function(){return "__json__" + this.b;}}};
			var testStr = dojo.toJson(testObj);
			t.assertEqual('{"ex1":"json3","ex2":"__json__4"}', testStr);
		},
		// pretty print
		function prettyPrintJson(t){
			if(typeof JSON == "undefined"){ // only test our JSON stringifier
				var testObj = {array:[1,2,{a:4,b:4}]};
				var testStr = dojo.toJson(testObj, true);
				t.assertEqual('{\n\t\"array\": [\n\t\t1,\n\t\t2,\n\t\t{\n\t\t\t\"a\": 4,\n\t\t\t\"b\": 4\n\t\t}\n\t]\n}', testStr);
			}
		},
		// have to verify that we still support any JS expression
		function evalJson(t){
			var testStr = '{func: function(){}, number: Infinity}';
			var testObj = dojo.fromJson(testStr);
			t.is("function", typeof testObj.func);
			t.is("number", typeof testObj.number);
		},
		function toJsonStringObject(t){
			t.is('"hello"', dojo.toJson(new String("hello")));
		}
	]
);


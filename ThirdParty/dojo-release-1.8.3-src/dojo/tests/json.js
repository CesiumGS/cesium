define(["../main", "doh/main", "../json"], function(dojo, doh, JSON){

	var mustThrow = function(json){
		try{
			JSON.parse(json, true);
		}catch(e){
			return;
		}
		throw new Error("Invalid JSON " + json + " should have been rejected");
	};

	doh.register("tests.json", [
		// all tests below are taken from #4.2 of the CSS3 Color Module
		function simpleString(t){ t.is("bar", JSON.parse('{"foo":"bar"}').foo); },
		function simpleTrue(t){ t.is(true, JSON.parse('{"foo":true}').foo); },
		function simpleFalse(t){ t.is(false, JSON.parse('{"foo":false}').foo); },
		function simpleNull(t){ t.is(null, JSON.parse('{"foo":null}').foo); },
		function simpleNumber(t){ t.is(3.3, JSON.parse('{"foo":3.3}', true).foo); },
		function strictString(t){ t.is("bar", JSON.parse('{"foo":"bar"}', true).foo); },
		function strictStringEsc(t){ t.is("b\n\t\"ar()", JSON.parse('{"foo":"b\\n\\t\\"ar()"}', true).foo); },
		function strictTrue(t){ t.is(true, JSON.parse('{"foo":true}', true).foo); },
		function strictFalse(t){ t.is(false, JSON.parse('{"foo":false}', true).foo); },
		function strictNull(t){ t.is(null, JSON.parse('{"foo":null}', true).foo); },
		function strictNumber(t){ t.is(3.3, JSON.parse('{"foo":3.3}', true).foo); },
		function strictNumberNeg(t){ t.is(-3.3, JSON.parse('{"foo":-3.3}', true).foo); },
		function exponentNegative(t){ t.is(3.3e-33, JSON.parse('{"foo":3.3e-33}', true).foo); },
		function exponent(t){ t.is(3.3e33, JSON.parse('{"foo":3.3e33}', true).foo); },
		function array(t){ t.is(3, JSON.parse('{"foo":[3,true,[]]}', true).foo[0]); },
		function badCall(t){ mustThrow('{"foo":alert()}'); },
		function badMath(t){ mustThrow('{"foo":3+4}'); },
		function badIndex(t){ mustThrow('{"foo":"bar"}[3]'); },
		function badKey(t){ mustThrow('{foo:"bar"}'); },
		//function badKey2(t){ mustThrow('{2:"bar"}')},
		function badUnbalanced(t){ mustThrow('['); },
		function badUnbalanced2(t){ mustThrow('}'); },
		function badType(t){ mustThrow('["foo":"bar"]'); },
		function badUnbalanced2(t){ mustThrow('}'); },
		function serializeString(t){ t.is('{"foo":"bar"}', JSON.stringify({"foo":"bar"})); },
		function serializeNull(t){ t.is('{"foo":null}', JSON.stringify({"foo":null})); },
		function serializeFunction(t){ t.is('{}', JSON.stringify({"foo":function(){}})); },
		function serializeNaN(t){ t.is('{"foo":null}', JSON.stringify({"foo":NaN})); },
		function serializeInfinity(t){ t.is('{"foo":null}', JSON.stringify({"foo":Infinity})); },
		// there is differences in how many decimals of accuracies in seconds in how Dates are serialized between browsers
		function serializeDate(t){ t.t(/1970-01-01T00:00:00.*Z/.test(JSON.parse(JSON.stringify({"foo":new Date(1)})).foo)); },
		function serializeCircular(t){
			try{
				var a = {};
				a.a = a;
				console.log("circular: " + JSON.stringify(a));
			}catch(e){
				return;
			}
			throw new Error("stringify must throw for circular references");

		},
		function serializeInherited(t){ 
 			function FooBar() { this.foo = "foo"; }
 			FooBar.prototype.bar = "bar";
 			t.is('{"foo":"foo"}', JSON.stringify(new FooBar())); 
 		},
		/*Apparently Firefox doesn't pass the key to the toJSON method*/
		function serializeToJSON(t){ t.is('{"foo":{"name":"value"}}', JSON.stringify({foo:{toJSON:function(key){return {name:"value"}; }}})); }
	]);

var smallDataSet = {
	prop1: null,
	prop2: true,
	prop3: [],
	prop4: 3.4325222223332266,
	prop5: 10003,
	prop6: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean semper",
	prop7: "sagittis velit. Cras in mi. Duis porta mauris ut ligula. Proin porta rutrum",
	prop8: "lacus. Etiam consequat scelerisque quam. Nulla facilisi. Maecenas luctus",
	prop9: "venenatis nulla. In sit amet dui non mi semper iaculis. Sed molestie",
	prop10: "tortor at ipsum. Morbi dictum rutrum magna. Sed vitae risus." +
		"Aliquam vitae enim. Duis scelerisque metus auctor est venenatis imperdiet." +
		"Fusce dignissim porta augue. Nulla vestibulum. Integer lorem nunc," +
		"ullamcorper a, commodo ac, malesuada sed, dolor. Aenean id mi in massa" +
		"bibendum suscipit. Integer eros. Nullam suscipit mauris. In pellentesque." +
		"Mauris ipsum est, pharetra semper, pharetra in, viverra quis, tellus. Etiam" +
		"purus. Quisque egestas, tortor ac cursus lacinia, felis leo adipiscing" +
		"nisi, et rhoncus elit dolor eget eros. Fusce ut quam. Suspendisse eleifend" +
		"leo vitae ligula. Nulla facilisi."
};
var smallJson = JSON.stringify(smallDataSet);

var i, mediumDataSet = [];
for(i = 0; i < 20; i++){
	mediumDataSet.push({
		prop1: null,
		prop2: true,
		prop3: false,
		prop4: 3.4325222223332266 - i,
		prop5: 10003 + i,
		prop6: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean semper",
		prop7: "sagittis velit. Cras in mi. Duis porta mauris ut ligula. Proin porta rutrum",
		prop8: "lacus. Etiam consequat scelerisque quam. Nulla facilisi. Maecenas luctus",
		prop9: "venenatis nulla. In sit amet dui non mi semper iaculis. Sed molestie",
		prop10: "tortor at ipsum. Morbi dictum rutrum magna. Sed vitae risus." +
			"Aliquam vitae enim."
	});
}
var mediumJson = JSON.stringify(mediumDataSet);

var largeDataSet = [];
for(i = 0; i < 100; i++){
	largeDataSet.push({
		prop1: null,
		prop2: true,
		prop3: false,
		prop4: 3.4325222223332266 - i,
		prop5: ["Mauris ipsum est, pharetra semper, pharetra in, viverra quis, tellus. Etiam" +
			"purus. Quisque egestas, tortor ac cursus lacinia, felis leo adipiscing",
			"nisi, et rhoncus elit dolor eget eros. Fusce ut quam. Suspendisse eleifend" +
			"leo vitae ligula. Nulla facilisi."
		],
		prop6: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean semper",
		prop7: "sagittis velit. Cras in mi. Duis porta mauris ut ligula. Proin porta rutrum",
		prop8: "lacus. Etiam consequat scelerisque quam. Nulla facilisi. Maecenas luctus",
		prop9: "venenatis nulla. In sit amet dui non mi semper iaculis. Sed molestie",
	prop10: "tortor at ipsum. Morbi dictum rutrum magna. Sed vitae risus." +
		"Aliquam vitae enim. Duis scelerisque metus auctor est venenatis imperdiet." +
		"Fusce dignissim porta augue. Nulla vestibulum. Integer lorem nunc," +
		"ullamcorper a, commodo ac, malesuada sed, dolor. Aenean id mi in massa" +
		"bibendum suscipit. Integer eros. Nullam suscipit mauris. In pellentesque."
	});
}
var largeJson = JSON.stringify(largeDataSet);

doh.register("tests.json.performance", [
		// all tests below are taken from #4.2 of the CSS3 Color Module
		function small(){
			var i = 10000;
			while(i-->0){
				var result = JSON.parse(smallJson);
			}
		},
		function strictSmall(){
			var i = 10000;
			while(i-->0){
				var result = JSON.parse(smallJson, true);
			}
		},
		function medium(){
			var i = 1000;
			while(i-->0){
				var result = JSON.parse(mediumJson);
			}
		},
		function strictMedium(){
			var i = 1000;
			while(i-->0){
				var result = JSON.parse(mediumJson, true);
			}
		},
		function large(){
			var i = 100;
			while(i-->0){
				var result = JSON.parse(largeJson);
			}
		},
		function strictLarge(){
			var i = 100;
			while(i-->0){
				var result = JSON.parse(largeJson, true);
			}
		}
	]);

});


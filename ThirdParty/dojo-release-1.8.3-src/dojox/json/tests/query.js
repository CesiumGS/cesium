dojo.provide("dojox.json.tests.query");
dojo.require("dojox.json.query");


dojox.json.tests.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	d.errback(errData);
};

dojox.json.tests.testData= {
	store: {
		"book": [
			{
				"category":"reference",
				"author":"Nigel Rees",
				"title":"Sayings of the Century",
				"price":8.95
			},
			{
				"category":"fiction",
				"author":"Evelyn Waugh",
				"title":"Sword of Honour",
				"price":12.99
			},
			{
				"category":"fiction",
				"author":"Herman Melville",
				"title":"Moby Dick",
				"isbn":"0-553-21311-3",
				"price":8.99
			},
			{
				"category":"fiction",
				"author":"J. R. R. Tolkien",
				"title":"The Lord of the\nRings",
				"isbn":"0-395-19395-8",
				"price":22.99
			}
		],
		"bicycle": {
				"color":"red",
				"price":19.95
		}
	},
	"symbols":{"@.$;":5}
};

doh.register("dojox.json.tests.query",
	[
		{
			name: "$.store.book[=author]",
			runTest: function(t) {
				var result = dojox.json.query(this.name,dojox.json.tests.testData);
				console.log("result",result);
				result = dojo.toJson(result);
				var success =  '["Nigel Rees","Evelyn Waugh","Herman Melville","J. R. R. Tolkien"]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..author",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '["Nigel Rees","Evelyn Waugh","Herman Melville","J. R. R. Tolkien"]';
				doh.assertEqual(success,result);
		
			}
		},
		{
			name: "$.store.*",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success = '[[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Evelyn Waugh","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the\\nRings","isbn":"0-395-19395-8","price":22.99}],{"color":"red","price":19.95}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store..price",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success = '[8.95,12.99,8.99,22.99,19.95]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0]?price=22.99",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the\\nRings","isbn":"0-395-19395-8","price":22.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0]?price>=20",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the\\nRings","isbn":"0-395-19395-8","price":22.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0][-1:]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the\\nRings","isbn":"0-395-19395-8","price":22.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0][0,1]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Evelyn Waugh","title":"Sword of Honour","price":12.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0][:2]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Evelyn Waugh","title":"Sword of Honour","price":12.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store.book[=category][^?true]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '["reference","fiction"]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..[^?author~'herman melville']",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,[dojox.json.tests.testData,dojox.json.tests.testData]));
				var success =  '[{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..[^?author='Herman*']",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,[dojox.json.tests.testData,dojox.json.tests.testData]));
				var success =  '[{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..[^?@['author']='Herman*']",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,[dojox.json.tests.testData,dojox.json.tests.testData]));
				var success =  '[{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0][?(@.isbn)]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the\\nRings","isbn":"0-395-19395-8","price":22.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0][?(@.price<10)]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0]?author=$1&price=$2",
			runTest: function(t) {
				var query = dojox.json.query(this.name);
				var result = dojo.toJson(query(dojox.json.tests.testData,"Nigel Rees",8.95));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0]?author=$1&price=$2",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData,"Herman Melville",8.99));
				var success =  '[{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0][?(@['price']<10)]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..[?price<10]",
			runTest: function(t) {
				var query = dojox.json.query(this.name);
				console.log("recursive object search",query.toString());
				var result = dojo.toJson(query(dojox.json.tests.testData));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store..[?price<10]",
			runTest: function(t) {
				var query = dojox.json.query(this.name);
				console.log("recursive object search",query.toString());
				var result = dojo.toJson(query(dojox.json.tests.testData));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store.book[/category][/price][=price]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[8.95,8.99,12.99,22.99]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store.book[\\category,\\price][=price]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[8.95,22.99,12.99,8.99]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store.book?title='*of the*'",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the\\nRings","isbn":"0-395-19395-8","price":22.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store.book[?'?iction'=category][=price]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[12.99,8.99,22.99]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store.book[?'?ICTion'~category][=price]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[12.99,8.99,22.99]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store.book[\\price][0].price - $.store.book[/price][0].price",
			runTest: function(t) {
				var result = dojox.json.query(this.name,dojox.json.tests.testData);
				var success =  14;
				doh.assertEqual(success,Math.round(result));
			}
		},
		{
			name: "$.symbols[*]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success =  '[5]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.symbols['@.$;']",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query(this.name,dojox.json.tests.testData));
				var success = '5';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store.book[?(@.price<15)][1:3]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query("$.store.book[?(@.price<15)][1:3]",dojox.json.tests.testData));
				var success = '[{"category":"fiction","author":"Evelyn Waugh","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store.book[?(@.price<15)][=author]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query("$.store.book[?(@.price<15)][=author]",dojox.json.tests.testData));
				var success = '["Nigel Rees","Evelyn Waugh","Herman Melville"]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store.book[1].category",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query("$.store.book[1].category",dojox.json.tests.testData));
				var success = '"fiction"';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "test $.store.bicycle",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query("$.store.bicycle",dojox.json.tests.testData));
				var success = '{"color":"red","price":19.95}';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "test $.store.book[=category]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.json.query("$.store.book[=category]",dojox.json.tests.testData));
				var success = '["reference","fiction","fiction","fiction"]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "safeEval: Illegal Eval",
			runTest: function(t) {
				try {
					var result = dojo.toJson(dojox.json.query("$.store.book[?(push(5))]",dojox.json.tests.testData));
					console.log("Illegal eval permitted");
					doh.e("Illegal eval was permitted");
				} catch(e) {
					console.log("Eval properly blocked", e);
				}
			}
		},
		{
			name: "safeEval: Illegal Eval 2",
			runTest: function(t) {
				try {
					var result = dojo.toJson(dojox.json.query("$.store.book[?(new Danger)]",dojox.json.tests.testData ));
					console.log("Illegal eval permitted");
					doh.e("Illegal eval was permitted");
				} catch(e) {
					console.log("Eval properly blocked", e);
				}
			}
		},
		{
			name: "safeEval: Illegal Eval 3",
			runTest: function(t) {
				try {
					var result = dojo.toJson(dojox.json.query("$.store.book[?(@+=2)]",dojox.json.tests.testData));
					console.log("Illegal eval permitted");
					doh.e("Illegal eval was permitted");
				} catch(e) {
					console.log("Eval properly blocked", e);
				}
			}
		}

	]
);
function performanceTest(){
	dojo.require("dojox.jsonPath");
	var data = [];
	for(var i = 0; i < 20000;i++){
		data.push({foo:Math.random()});
	}
	var now = new Date().getTime();
	var results = dojox.jsonPath.query(data,"$[?(@.foo<0.01)]");
	alert("JSONPath" + (new Date().getTime()-now) + " " + results.length);
	now = new Date().getTime();
	results = dojox.json.query("$[?(@.foo<0.01)]",data);
	alert("JSONQuery" + (new Date().getTime()-now) + " " + results.length);
}


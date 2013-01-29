dojo.provide("dojox.jsonPath.tests.jsonPath");
dojo.require("dojox.jsonPath");


dojox.jsonPath.tests.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	d.errback(errData);
};

dojox.jsonPath.tests.testData= {
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
				"title":"The Lord of the Rings",
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
}

doh.register("dojox.jsonPath.tests.jsonPath",
	[
		{
			name: "$.store.book[*].author",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '["Nigel Rees","Evelyn Waugh","Herman Melville","J. R. R. Tolkien"]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..author",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '["Nigel Rees","Evelyn Waugh","Herman Melville","J. R. R. Tolkien"]';
				doh.assertEqual(success,result);
		
			}
		},
		{
			name: "$.store.*",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success = '[[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Evelyn Waugh","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}],{"color":"red","price":19.95}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.store..price",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success = '[8.95,12.99,8.99,22.99,19.95]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[(@.length-1)]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '[{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[-1:]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '[{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[0,1]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Evelyn Waugh","title":"Sword of Honour","price":12.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[:2]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Evelyn Waugh","title":"Sword of Honour","price":12.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[?(@.isbn)]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '[{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$..book[?(@.price<10)]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '[{"category":"reference","author":"Nigel Rees","title":"Sayings of the Century","price":8.95},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.symbols[*]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '[5]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.symbols['@.$;']",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '[5]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "$.symbols[(@[('@.$;')]?'@.$;':'@.$;')]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, this.name));
				var success =  '[5]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "resultType: 'BOTH' test",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, "$..book[*]",{resultType:"BOTH"}));
				var success =  dojo.toJson([{"path": "$['store']['book'][0]", "value": {"category": "reference", "author": "Nigel Rees", "title": "Sayings of the Century", "price": 8.95}}, {"path": "$['store']['book'][1]", "value": {"category": "fiction", "author": "Evelyn Waugh", "title": "Sword of Honour", "price": 12.99}}, {"path": "$['store']['book'][2]", "value": {"category": "fiction", "author": "Herman Melville", "title": "Moby Dick", "isbn": "0-553-21311-3", "price": 8.99}}, {"path": "$['store']['book'][3]", "value": {"category": "fiction", "author": "J. R. R. Tolkien", "title": "The Lord of the Rings", "isbn": "0-395-19395-8", "price": 22.99}}]);
				doh.assertEqual(success,result);
			}
		},
		{
			name: "evalType: 'RESULT' test $.store.book[?(@.price<15)][1:3]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, "$.store.book[?(@.price<15)][1:3]",{evalType:"RESULT"}));
				var success = '[{"category":"fiction","author":"Evelyn Waugh","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99}]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "evalType: 'RESULT' test $.store.book[1].category",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, "$.store.book[1].category",{evalType:"RESULT"}));
				var success = '"fiction"';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "evalType: 'RESULT' test $.store.bicycle",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, "$.store.bicycle",{evalType:"RESULT"}));
				var success = '{"color":"red","price":19.95}';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "evalType: 'RESULT' test $.store.book[*]",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, "$.store.book[*]",{evalType:"RESULT"}));
				var success = '["reference","Nigel Rees","Sayings of the Century",8.95,"fiction","Evelyn Waugh","Sword of Honour",12.99,"fiction","Herman Melville","Moby Dick","0-553-21311-3",8.99,"fiction","J. R. R. Tolkien","The Lord of the Rings","0-395-19395-8",22.99]';
				doh.assertEqual(success,result);
			}
		},
		{
			name: "evalType: 'RESULT' test $.store.book.category",
			runTest: function(t) {
				var result = dojo.toJson(dojox.jsonPath.query(dojox.jsonPath.tests.testData, "$.store.book.category",{evalType:"RESULT"}));
				var success = '["reference","fiction","fiction","fiction"]';
				doh.assertEqual(success,result);
			}
		}
	]
);


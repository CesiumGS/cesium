dojo.provide("dojox.secure.tests.fromJson");

dojo.require("dojox.secure.fromJson");

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
var smallJson = dojo.toJson(smallDataSet);

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
var mediumJson = dojo.toJson(mediumDataSet);

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
var largeJson = dojo.toJson(largeDataSet);


doh.register("dojox.secure.tests.fromJson",
	[
		function small(){
			for(var i = 0;i < 1000;i++){
				dojox.secure.fromJson(smallJson);
			}
		},
		function medium(){
			for(var i = 0;i < 100;i++){
				dojox.secure.fromJson(mediumJson);
			}
		},
		function large(){
			for(var i = 0;i < 100;i++){
				dojox.secure.fromJson(largeJson);
			}
		},
		function smallUnsecure(){
			for(var i = 0;i < 1000;i++){
				dojo.fromJson(smallJson);
			}
		},
		function mediumUnsecure(){
			for(var i = 0;i < 100;i++){
				dojo.fromJson(mediumJson);
			}
		},
		function largeUnsecure(){
			for(var i = 0;i < 100;i++){
				dojo.fromJson(largeJson);
			}
		},
		function smallNative(){
			for(var i = 0;i < 1000;i++){
				JSON.parse(smallJson);
			}
		},
		function mediumNative(){
			for(var i = 0;i < 100;i++){
				JSON.parse(mediumJson);
			}
		},
		function largeNative(){
			for(var i = 0;i < 100;i++){
				JSON.parse(largeJson);
			}
		},
		function smallJson2(){
			for(var i = 0;i < 1000;i++){
				json2.parse(smallJson);
			}
		},
		function mediumJson2(){
			for(var i = 0;i < 100;i++){
				json2.parse(mediumJson);
			}
		},
		function largeJson2(){
			for(var i = 0;i < 100;i++){
				json2.parse(largeJson);
			}
		},
		function smallJsonParse(){
			for(var i = 0;i < 100;i++){
				json_parse(smallJson);
			}
		},
		function mediumJsonParse(){
			for(var i = 0;i < 10;i++){
				json_parse(mediumJson);
			}
		},
		function largeJsonParse(){
			for(var i = 0;i < 10;i++){
				json_parse(largeJson);
			}
		}
	]
);


define(["dojo", "doh", "require", "dojo/store/JsonRest"], function(dojo, doh, require){
	var store = new dojo.store.JsonRest({target: require.toUrl("dojo/tests/store/x.y").match(/(.+)x\.y$/)[1]});
	doh.register("tests.store.JsonRest",
		[
			function testGet(t){
				var d = new doh.Deferred();
				store.get("node1.1").then(function(object){
					t.is(object.name, "node1.1");
					t.is(object.someProperty, "somePropertyA1");
					d.callback(true);
				});
				return d;
			},
			function testQuery(t){
				var d = new doh.Deferred();
				store.query("treeTestRoot").then(function(results){
					var object = results[0];
					t.is(object.name, "node1");
					t.is(object.someProperty, "somePropertyA");
					d.callback(true);
				});
				return d;
			},
			function testQueryIterative(t){
				var d = new doh.Deferred();
				var i = 0;
				store.query("treeTestRoot").forEach(function(object){
					i++;
					console.log(i);
					t.is(object.name, "node" + i);
				}).then(function(){
					d.callback(true);
				});
				return d;
			}
		]
	);
});

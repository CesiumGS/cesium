define(["doh/main", "require", "dojo/_base/lang", "dojo/store/JsonRest"], function(doh, require, lang, JsonRest){
	var globalHeaders = {
			"test-global-header-a": true,
			"test-global-header-b": "yes"
		},
		requestHeaders = {
			"test-local-header-a": true,
			"test-local-header-b": "yes",
			"test-override": "overridden"
		},
		store = new JsonRest({
			target: require.toUrl("dojo/tests/store/x.y").match(/(.+)x\.y$/)[1],
			headers: lang.mixin({ "test-override": false }, globalHeaders)
		});

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
			},
			function testHeaders(t){
				var d = new doh.Deferred(),
					error,
					expected = 0,
					received = 0;

				// NOTE: Because HTTP headers are case-insensitive they should always be provided as all-lowercase
				// strings to simplify testing.
				function runTest(method, args){
					expected++;

					store[method].apply(store, args).then(function(result){
						received++;

						if(error){
							return;
						}

						var k;

						for(k in requestHeaders){
							if(!result.headers.hasOwnProperty(k) || "" + result.headers[k] !== "" + requestHeaders[k]){
								error = true;
								d.errback(new Error("Header mismatch in " + method + ": " + k));
								return;
							}
						}

						for(k in globalHeaders){
							if(!result.headers.hasOwnProperty(k) || "" + result.headers[k] !== "" + globalHeaders[k]){
								error = true;
								d.errback(new Error("Global header mismatch in " + method + ": " + k));
								return;
							}
						}

						if(expected === received){
							d.callback(true);
						}
					});
				}

				runTest("get", [ "index.php", requestHeaders ]);
				runTest("get", [ "index.php", { headers: requestHeaders } ]);
				runTest("remove", [ "index.php", { headers: requestHeaders } ]);
				runTest("query", [ {}, { headers: requestHeaders, start: 20, count: 42 } ]);
				runTest("put", [ {}, { headers: requestHeaders } ]);
				runTest("add", [ {}, { headers: requestHeaders } ]);

				return d;
			}
		]
	);
});

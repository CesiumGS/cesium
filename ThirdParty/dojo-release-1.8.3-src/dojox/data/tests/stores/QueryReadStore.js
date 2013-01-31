dojo.provide("dojox.data.tests.stores.QueryReadStore");
dojo.require("dojox.data.QueryReadStore");
dojo.require("dojo.data.api.Read");

//dojo.require("dojox.testing.DocTest");

dojox.data.tests.stores.QueryReadStore.getStore = function(){
	return new dojox.data.QueryReadStore({
			url: require.toUrl("dojox/data/tests/stores/QueryReadStore.php").toString()
		});
};


tests.register("dojox.data.tests.stores.QueryReadStore",
	[
		/*
		function testDocTests(t) {
			// summary:
			//		Run all the doc comments.
			var doctest = new dojox.testing.DocTest();
			doctest.run("dojox.data.QueryReadStore");
			t.assertTrue(doctest.errors.length==0);
		},
		*/
		
		function testReadApi_getValue(t){
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				var item = items[0];
				// The good cases.
				t.assertEqual("Alabama", store.getValue(item, "name"));
				t.assertEqual("<img src='images/Alabama.jpg'/>Alabama", store.getValue(item, "label"));
				t.assertEqual("AL", store.getValue(item, "abbreviation"));
				// Test the defaultValue cases (the third paramter).
				t.assertEqual("default value", store.getValue(item, "NAME", "default value"));
				// TODO Test for null somehow ...
				// Read api says: Returns null if and only if null was explicitly set as the attribute value.
				
				// According to Read-API getValue() an exception is thrown when
				// the item is not an item or when the attribute is not a string.
				t.assertError(Error, store, "getValue", ["not an item", "NOT THERE"]);
				t.assertError(Error, store, "getValue", [item, {}]);
			}
			store.fetch({
				query:{q:"Alabama"},
				onComplete: d.getTestCallback(onComplete)
			});
			return d; //Object
		},

		function testReadApi_getValues(t){
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				var item = items[0];
				// The good cases.
				t.assertEqual(["Alabama"], store.getValues(item, "name"));
				t.assertEqual(["<img src='images/Alabama.jpg'/>Alabama"], store.getValues(item, "label"));
				t.assertEqual(["AL"], store.getValues(item, "abbreviation"));
				// TODO Test for null somehow ...
				// Read api says: Returns null if and only if null was explicitly set as the attribute value.

				// Test for not-existing attributes without defaultValues and invalid items.
				// TODO
				t.assertEqual([], store.getValues(item, "NOT THERE"));
				var errThrown = false;
				try{
					//Should throw an exception.
					var values = store.getValues("not an item", "NOT THERE");
				}catch (e){
					errThrown = true;
				}
				t.assertTrue(errThrown);
			}
			store.fetch({
				query:{q:"Alabama"},
				onComplete: d.getTestCallback(onComplete)
			});
			return d; //Object
		},
		
		function testReadApi_getAttributes(t){
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				var item = items[0];
				// The good case(s).
				t.assertEqual(['id', 'name', 'label', 'abbreviation', 'capital'], store.getAttributes(item));
				t.assertError(Error, store, "getAttributes", [{}]);
			}
			store.fetch({
				query:{q:"Alabama"},
				onComplete: d.getTestCallback(onComplete)
			});
			return d; //Object
		},

		function testReadApi_getLabel(t){
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			var d = new doh.Deferred();
			function onComplete(items, request){
				var item = items[0];
				// The good cases.
				t.assertEqual(["<img src='images/Alabama.jpg'/>Alabama"], store.getLabel(item));
			}
			store.fetch({
				query:{q:"Alabama"},
				onComplete: d.getTestCallback(onComplete)
			});
			return d; //Object
		},

		function testReadApi_hasAttribute(t){
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				var item = items[0];
				// The positive cases.
				t.assertEqual(true, store.hasAttribute(item, "name"));
				t.assertEqual(true, store.hasAttribute(item, "label"));
				t.assertEqual(true, store.hasAttribute(item, "abbreviation"));
				// Make sure attribute case doesnt matter.
				t.assertEqual(false, store.hasAttribute(item, "NAME"));
				t.assertEqual(false, store.hasAttribute(item, "Name"));
				t.assertEqual(false, store.hasAttribute(item, "Label"));
				// Pass in an invalid item.
				t.assertEqual(false, store.hasAttribute({}, "abbreviation"));
				// pass in something that looks like the item with the attribute.
				t.assertEqual(false, store.hasAttribute({name:"yo"}, "name"));
			}
			store.fetch({
				query:{q:"Alaska"},
				onComplete: d.getTestCallback(onComplete)
			});
			return d; //Object
		},

		function testReadApi_containsValue(t){
			var store = dojox.data.tests.stores.QueryReadStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				var item = items[0];
				t.assertTrue(store.containsValue(item, "name", "Alaska"));
			}
			store.fetch({
				query:{q:"Alaska"},
				onComplete: d.getTestCallback(onComplete)
			});
			return d; //Object
		},

		function testReadApi_isItem(t){
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				// The good case.
				t.assertEqual(true, store.isItem(items[0]));
				// Try a pure object.
				t.assertEqual(false, store.isItem({}));
				// Try to look like an item.
				t.assertEqual(false, store.isItem({name:"Alaska", label:"Alaska", abbreviation:"AK"}));
			}
			store.fetch({
				query:{q:"Alaska"},
				onComplete: d.getTestCallback(onComplete)
			});
			return d; //Object
		},

		function testReadApi_isItemLoaded(t){
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				var item = items[0];
				// The good case(s).
				t.assertTrue(store.isItemLoaded(item));
			}
			store.fetch({
				query:{q:"Alabama"},
				onComplete: d.getTestCallback(onComplete)
			});
			return d; //Object
		},

		//function testReadApi_loadItem(t){
		//	// summary:
		//	// description:
		//	t.assertTrue(false);
		//},

		function testReadApi_fetch_all(t){
			// summary:
			//		Simple test of fetching all items.
			var store = dojox.data.tests.stores.QueryReadStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(9, items.length);
			}
			function onError(error, request) {
				throw new Error(error);
			}
			store.fetch({
				query:{q:"m*"},
				onComplete: d.getTestCallback(onComplete),
				onError: d.getTestErrback(onError)
			});
			return d; //Object
		},
		
		function testReadApi_fetch_onBegin(t){
			// summary:
			//		Simple test of fetching items, checking that onBegin size is all items matched, and page is just the items asked for.
			var store = dojox.data.tests.stores.QueryReadStore.getStore();

			var d = new doh.Deferred();
			function onBegin(size, request){
				t.assertEqual(9, size);
			}
			function onComplete(items, request) {
				t.assertEqual(5, items.length);
			}
			function onError(error, request) {
				throw new Error(error);
			}
			store.fetch({
				query:{q:"m*"},
				start: 0,
				count: 5,
				onBegin: d.getTestErrback(onBegin),
				onComplete: d.getTestCallback(onComplete),
				onError: d.getTestErrback(onError)
			});
			return d; //Object
		},

		function testReadApi_fetch_onBegin_ServersidePaging(t){
			// summary:
			//		Simple test of fetching items, checking that onBegin size is all items matched, and page is just the items asked for.
			var store = dojox.data.tests.stores.QueryReadStore.getStore();

			var d = new doh.Deferred();
			var began = false;
			function onBegin(size, request){
				t.assertEqual(9, size);
				began = true;
			}
			function onComplete(items, request) {
				t.t(began, "onBegin was called");
				t.assertEqual(4, items.length);	// 9 total, starting at 5, 4 left.
			}
			function onError(error, request) {
				throw new Error(error);
			}

			store.fetch({
				query:{q:"m*"},
				start: 5,
				count: 5,
				onBegin: d.getTestErrback(onBegin),
				onComplete: d.getTestCallback(onComplete),
				onError: d.getTestErrback(onError)
			});
			return d; //Object
		},

		function testReadApi_fetch_onBegin_ClientsidePaging(t){
			// summary:
			//		Simple test of fetching items, checking that onBegin size is all items matched, and page is just the items asked for.
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			store.doClientPaging = true;

			var d = new doh.Deferred();
			function onBegin(size, request){
				t.assertEqual(9, size);
			}
			function onComplete(items, request) {
				t.assertEqual(5, items.length);
			}
			function onError(error, request) {
				throw new Error(error);
			}
			store.fetch({
				query:{q:"m*"},
				start: 0,
				count: 5,
				onBegin: d.getTestErrback(onBegin),
				onComplete: d.getTestCallback(onComplete),
				onError: d.getTestErrback(onError)
			});
			return d; //Object
		},

		function testReadApi_fetch_one(t){
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
			}
			function onError(error, request) {
				throw new Error(error);
			}
			store.fetch({
				query:{q:"Alaska"},
				onComplete: d.getTestCallback(onComplete),
				onError: d.getTestErrback(onError)
			});
			return d; //Object
		},

		function testReadApi_fetch_client_paging(t){
			// summary:
			//		Let's test that paging on the same request does not trigger
			//		server requests.
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			store.doClientPaging = true;

			var lastRequestHash = null;
			var firstItems = [];
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(5, items.length, "length of first fetch");
				lastRequestHash = store.lastRequestHash;
				firstItems = items;
				
				// Do the next request AFTER the previous one, so we are sure its sequential.
				// We need to be sure so we can compare to the data from the first request.
				function onComplete1(items, request) {
					t.assertEqual(5, items.length, "length of second fetch");
					t.assertEqual(lastRequestHash, store.lastRequestHash, "lastRequestHash");
					t.assertEqual(firstItems[1], items[0], "items[0]");
				}
				req.start = 1;
				req.onComplete = d.getTestCallback(onComplete1);
				store.fetch(req);
			}
			function onError(error, request) {
				throw new Error(error);
			}
			var req = {
				query:{q:"m*"},
				start:0,
				count:5,
				onComplete: d.getTestErrback(onComplete),
				onError: d.getTestErrback(onError)
			};

			store.fetch(req);
			return d; //Object
		},
		
		function testReadApi_fetch_server_paging(t) {
			// Verify that the paging on the server side does work.
			// This is the test for http://trac.dojotoolkit.org/ticket/4761
			//
			// How? We request 10 items from the server, start=0, count=10.
			// The second request requests 5 items: start=5, count=5 and those
			// 5 items should have the same values as the last 5 of the first
			// request.
			// This tests if the server side paging does work.
			var store = dojox.data.tests.stores.QueryReadStore.getStore();

			var lastRequestHash = null;
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(10, items.length);
				lastRequestHash = store.lastRequestHash;
				firstItems = items;
				
				// Do the next request AFTER the previous one, so we are sure its sequential.
				// We need to be sure so we can compare to the data from the first request.
				function onComplete1(items, request) {
					t.assertEqual(5, items.length);
					// Compare the hash of the last request, they must be different,
					// since another server request was issued.
					t.assertTrue(lastRequestHash!=store.lastRequestHash);
					t.assertEqual(store.getValue(firstItems[5], "name"), store.getValue(items[0], "name"));
					t.assertEqual(store.getValue(firstItems[6], "name"), store.getValue(items[1], "name"));
					t.assertEqual(store.getValue(firstItems[7], "name"), store.getValue(items[2], "name"));
					t.assertEqual(store.getValue(firstItems[8], "name"), store.getValue(items[3], "name"));
					t.assertEqual(store.getValue(firstItems[9], "name"), store.getValue(items[4], "name"));
				}
				// Init a new store, or it will use the old data, since the query has not changed.
				store.doClientPaging = false;
				store.fetch({start:5, count:5, onComplete: onComplete1, onError: onError});
			}
			function onError(error, request) {
				throw new Error(error);
			}
			store.fetch({
				query:{},
				start:0,
				count:10,
				onComplete: d.getTestCallback(onComplete),
				onError: d.getTestErrback(onError)
			});
			return d; //Object
		},
		
		function testReadApi_getFeatures(t) {
			var store = dojox.data.tests.stores.QueryReadStore.getStore();
			var features = store.getFeatures();
			t.assertTrue(features["dojo.data.api.Read"]);
			t.assertTrue(features["dojo.data.api.Identity"]);
			var count = 0;
			for (i in features){
				count++;
			}
			t.assertEqual(2, count);
		},
		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = dojox.data.tests.stores.QueryReadStore.getStore();
			var readApi = new dojo.data.api.Read();
			var passed = true;

			for(i in readApi){
				var member = readApi[i];
				//Check that all the 'Read' defined functions exist on the test store.
				if(typeof member === "function"){
					var testStoreMember = testStore[i];
					if(!(typeof testStoreMember === "function")){
						console.log("Problem with function: [" + i + "]");
						passed = false;
						break;
					}
				}
			}
			t.assertTrue(passed);
		}
	]
);

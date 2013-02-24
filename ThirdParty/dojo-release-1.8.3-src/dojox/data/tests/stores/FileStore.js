dojo.provide("dojox.data.tests.stores.FileStore");
dojo.require("dojox.data.FileStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojo.data.api.Identity");


dojox.data.tests.stores.FileStore.getGeoStore = function(){
	return new dojox.data.FileStore({url: require.toUrl("dojox/data/tests/stores/filestore_dojoxdatageo.php").toString(), pathAsQueryParam: true});
};


doh.register("dojox.data.tests.stores.FileStore",
	[
/***************************************
	 dojo.data.api.Read API
***************************************/
		{
			name: "testReadAPI_fetch_all",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of fetching all xml items through an XML element called isbn
				// description:
				//		Simple test of fetching all xml items through an XML element called isbn
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(49, items.length);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"*"}, queryOptions: {deep: true}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_fetch_one",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of fetching one xml items through an XML element called isbn
				// description:
				//		Simple test of fetching one xml items through an XML element called isbn
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"Commonwealth of Australia"}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_fetch_paging",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of fetching a series of pages
				// description:
				//		Simple test of fetching a series of pages
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();

				function dumpSixthFetch(items, request){
					t.assertEqual(20, items.length);
					d.callback(true);
				}

				function dumpFifthFetch(items, request){
					t.assertEqual(40, items.length);
					request.start = 2;
					request.count = 20;
					request.onComplete = dumpSixthFetch;
					store.fetch(request);
				}

				function dumpFourthFetch(items, request){
					t.assertEqual(20, items.length);
					request.start = 9;
					request.count = 100;
					request.onComplete = dumpFifthFetch;
					store.fetch(request);
				}

				function dumpThirdFetch(items, request){
					t.assertEqual(5, items.length);
					request.start = 2;
					request.count = 20;
					request.onComplete = dumpFourthFetch;
					store.fetch(request);
				}

				function dumpSecondFetch(items, request){
					t.assertEqual(1, items.length);
					request.start = 0;
					request.count = 5;
					request.onComplete = dumpThirdFetch;
					store.fetch(request);
				}

				function dumpFirstFetch(items, request){
					t.assertEqual(5, items.length);
					request.start = 3;
					request.count = 1;
					request.onComplete = dumpSecondFetch;
					store.fetch(request);
				}

				function completed(items, request){
					t.assertEqual(49, items.length);
					request.start = 1;
					request.count = 5;
					request.onComplete = dumpFirstFetch;
					store.fetch(request);
				}

				function error(errData, request){
					d.errback(errData);
				}

				store.fetch({queryOptions: {deep:true}, onComplete: completed, onError: error});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_fetch_pattern0",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of fetching a few files based on wildcarded name
				// description:
				//		Simple test of fetching a few files based on wildcarded name
				var store = dojox.data.tests.stores.FileStore.getGeoStore();
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(3, items.length);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"C*"}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_fetch_pattern1",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of fetching a one files based on wildcarded name
				// description:
				//		Simple test of fetching a one file based on wildcarded name
				var store = dojox.data.tests.stores.FileStore.getGeoStore();
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"?ussia"}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_fetch_pattern_caseInsensitive",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of fetching one file item case insensitively
				// description:
				//		Simple test of fetching one file item case insensitively
				var store = dojox.data.tests.stores.FileStore.getGeoStore();
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"germany"}, queryOptions: {ignoreCase: true}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_fetch_pattern_caseSensitive",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of fetching one file item case sensitively
				// description:
				//		Simple test of fetching one file item case sensitively
				var store = dojox.data.tests.stores.FileStore.getGeoStore();
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"Germany"}, queryOptions: {ignoreCase: false}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_getLabel",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the getLabel function against a store
				// description:
				//		Simple test of the getLabel function against a store

				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 1);
					var label = store.getLabel(items[0]);
					t.assertTrue(label !== null);
					t.assertEqual("China", label);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"China"}, onComplete: onComplete, onError: onError});
				return d;
			}
		},
		{
			name: "testReadAPI_getLabelAttributes",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the getLabelAttributes function against a store set that has a label defined.
				// description:
				//		Simple test of the getLabelAttributes function against a store set that has a label defined.

				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 1);
					var labelList = store.getLabelAttributes(items[0]);
					t.assertTrue(labelList !== null);
					t.assertEqual("name", labelList[0]);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"China"}, onComplete: onComplete, onError: onError});
				return d;
			}
		},
		{
			name: "testReadAPI_getValue",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the getValue API
				// description:
				//		Simple test of the getValue API
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					var item = items[0];
					t.assertTrue(store.hasAttribute(item,"name"));
					t.assertEqual(store.getValue(item,"name"), "Guadalajara");
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"Guadalajara"}, queryOptions: {deep: true}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_getValues",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the getValues API
				// description:
				//		Simple test of the getValues API
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					var item = items[0];
					t.assertTrue(store.hasAttribute(item,"name"));
					var values = store.getValues(item,"name");
					t.assertEqual(1,values.length);
					t.assertEqual("Guadalajara", values[0]);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"Guadalajara"}, queryOptions: {deep: true}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_isItem",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the isItem API
				// description:
				//		Simple test of the isItem API
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
				   t.assertEqual(1, items.length);
				   var item = items[0];
				   t.assertTrue(store.isItem(item));
				   t.assertTrue(!store.isItem({}));
				   t.assertTrue(!store.isItem("Foo"));
				   t.assertTrue(!store.isItem(1));
				   d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"Guadalajara"}, queryOptions: {deep: true}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_isItem_multistore",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the isItem API across multiple store instances.
				// description:
				//		Simple test of the isItem API across multiple store instances.
				var store1 = dojox.data.tests.stores.FileStore.getGeoStore();
				var store2 = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();

				function onError(error, request) {
					d.errback(error);
				}

				function onComplete1(items, request) {
					t.assertEqual(1, items.length);
					var item1 = items[0];
					t.assertTrue(store1.isItem(item1));

					function onComplete2(items, request) {
						t.assertEqual(1, items.length);
						var item2 = items[0];
						t.assertTrue(store2.isItem(item2));
						t.assertTrue(!store1.isItem(item2));
						t.assertTrue(!store2.isItem(item1));
						d.callback(true);
					}
					store2.fetch({query:{name:"Guadalajara"}, queryOptions: {deep: true}, onComplete: onComplete2, onError: onError});
				}
				store1.fetch({query:{name:"China"}, onComplete: onComplete1, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_hasAttribute",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the hasAttribute API
				// description:
				//		Simple test of the hasAttribute API
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					var item = items[0];
					t.assertTrue(store.hasAttribute(item,"name"));
					t.assertTrue(!store.hasAttribute(item,"bob"));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"China"}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_containsValue",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the containsValue API
				// description:
				//		Simple test of the containsValue API
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					var item = items[0];
					t.assertTrue(store.containsValue(item,"name", "China"));
					t.assertTrue(!store.containsValue(item,"name", "bob"));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"China"}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_sortDescending",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the sorting API in descending order.
				// description:
				//		Simple test of the sorting API in descending order.
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				//Comparison is done as a string type (toString comparison), so the order won't be numeric
				//So have to compare in 'alphabetic' order.
				var order = ["root.json","United States of America","Sudan","Spain","Russia","Mongolia","Mexico","Kenya","Italy","India","Germany","France","Egypt","Commonwealth of Australia","China","Canada","Brazil","Argentina"];

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(18, items.length);
					for(var i = 0; i < items.length; i++){
						t.assertEqual(order[i], store.getValue(items[i],"name").toString());
					}
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}

				var sortAttributes = [{attribute: "name", descending: true}];
				store.fetch({query:{name:"*"}, sort: sortAttributes, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_sortAscending",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the sorting API in ascending order.
				// description:
				//		Simple test of the sorting API in ascending order.
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				//Comparison is done as a string type (toString comparison), so the order won't be numeric
				//So have to compare in 'alphabetic' order.

				var order = ["root.json","United States of America","Sudan","Spain","Russia","Mongolia","Mexico","Kenya","Italy","India","Germany","France","Egypt","Commonwealth of Australia","China","Canada","Brazil","Argentina"].reverse();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(18, items.length);
					for(var i = 0; i < items.length; i++){
						t.assertEqual(order[i], store.getValue(items[i],"name").toString());
					}
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}

				var sortAttributes = [{attribute: "name"}];
				store.fetch({query:{name:"*"}, sort: sortAttributes, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testReadAPI_isItemLoaded",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the isItemLoaded API
				// description:
				//		Simple test of the isItemLoaded API
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					var item = items[0];
					t.assertTrue(store.isItemLoaded(item));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"China"}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		function testReadAPI_getFeatures(t){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store

			var store = dojox.data.tests.stores.FileStore.getGeoStore();
			var features = store.getFeatures();
			var count = 0;
			var i;
			for(i in features){
				t.assertTrue((i === "dojo.data.api.Read" || i === "dojo.data.api.Identity"));
				count++;
			}
			t.assertEqual(2, count);
		},
		{
			name: "testReadAPI_getAttributes",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the getAttributes API
				// description:
				//		Simple test of the getAttributes API
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					var item = items[0];
					var attributes = store.getAttributes(item);
					t.assertEqual(7,attributes.length);
					for(var i=0; i<attributes.length; i++){
						t.assertTrue((attributes[i] === "children" || attributes[i] === "directory" || attributes[i] === "name" || attributes[i] === "path" || attributes[i] === "modified" || attributes[i] === "size" || attributes[i] === "parentDir"));
					}
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"China"}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = dojox.data.tests.stores.FileStore.getGeoStore();
			var readApi = new dojo.data.api.Read();
			var passed = true;

			var i;
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
		},

/***************************************
 dojo.data.api.Identity API
***************************************/
		{
			name: "testIdentityAPI_getIdentity",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the getAttributes API
				// description:
				//		Simple test of the getAttributes API
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					var item = items[0];
					t.assertEqual("./Argentina",store.getIdentity(item));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"Argentina"}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testIdentityAPI_getIdentityAttributes",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the getAttributes API
				// description:
				//		Simple test of the getAttributes API
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(1, items.length);
					var item = items[0];
					//Should have none, as it's not a public attribute.
					var attributes = store.getIdentityAttributes(item);
					t.assertEqual(1, attributes.length);
					t.assertEqual("path", attributes[0]);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({query:{name:"Argentina"}, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: "testIdentityAPI_fetchItemByIdentity",
			timeout:	10000, //10 seconds.  Lots of server calls, expect network delay
			runTest: function(t) {
				// summary:
				//		Simple test of the fetchItemByIdentity API
				// description:
				//		Simple test of the fetchItemByIdentity API
				var store = dojox.data.tests.stores.FileStore.getGeoStore();

				var d = new doh.Deferred();
				function onItem(item, request) {
					t.assertTrue(item !== null);
					t.assertTrue(store.isItem(item));
					t.assertEqual("Argentina", store.getValue(item, "name"));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetchItemByIdentity({identity: "./Argentina", onItem: onItem, onError: onError});
				return d; //Object
			}
		},
		function testIdentityAPI_functionConformance(t){
			// summary:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = dojox.data.tests.stores.FileStore.getGeoStore();
			var identityApi = new dojo.data.api.Identity();
			var passed = true;

			var i;
			for(i in identityApi){
				var member = identityApi[i];
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


dojo.provide("dojox.data.tests.stores.HtmlTableStore");
dojo.require("dojox.data.HtmlTableStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojo.data.api.Identity");


dojox.data.tests.stores.HtmlTableStore.getBooks2Store = function(){
	return new dojox.data.HtmlTableStore({url: require.toUrl("dojox/data/tests/stores/books2.html").toString(), tableId: "books2"});
};

dojox.data.tests.stores.HtmlTableStore.getBooksStore = function(){
	return new dojox.data.HtmlTableStore({url: require.toUrl("dojox/data/tests/stores/books.html").toString(), tableId: "books"});
};

doh.register("dojox.data.tests.stores.HtmlTableStore",
	[
/***************************************
     dojo.data.api.Read API
***************************************/
		function testReadAPI_fetch_all(t){
			// summary:
			//		Simple test of fetching all xml items through an XML element called isbn
			// description:
			//		Simple test of fetching all xml items through an XML element called isbn
			var store = dojox.data.tests.stores.HtmlTableStore.getBooksStore();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(20, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"*"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_one(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_paging(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn
			var store = dojox.data.tests.stores.HtmlTableStore.getBooksStore();
			
			var d = new doh.Deferred();
			function dumpFirstFetch(items, request){
				t.assertEqual(5, items.length);
				request.start = 3;
				request.count = 1;
				request.onComplete = dumpSecondFetch;
				store.fetch(request);
			}

			function dumpSecondFetch(items, request){
				t.assertEqual(1, items.length);
				request.start = 0;
				request.count = 5;
				request.onComplete = dumpThirdFetch;
				store.fetch(request);
			}

			function dumpThirdFetch(items, request){
				t.assertEqual(5, items.length);
				request.start = 2;
				request.count = 20;
				request.onComplete = dumpFourthFetch;
				store.fetch(request);
			}

			function dumpFourthFetch(items, request){
				t.assertEqual(18, items.length);
				request.start = 9;
				request.count = 100;
				request.onComplete = dumpFifthFetch;
				store.fetch(request);
			}

			function dumpFifthFetch(items, request){
				t.assertEqual(11, items.length);
				request.start = 2;
				request.count = 20;
				request.onComplete = dumpSixthFetch;
				store.fetch(request);
			}

			function dumpSixthFetch(items, request){
				t.assertEqual(18, items.length);
				d.callback(true);
			}

			function completed(items, request){
				t.assertEqual(20, items.length);
				request.start = 1;
				request.count = 5;
				request.onComplete = dumpFirstFetch;
				store.fetch(request);
			}

			function error(errData, request){
				d.errback(errData);
			}

			store.fetch({onComplete: completed, onError: error});
			return d; //Object
		},
		function testReadAPI_fetch_pattern0(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"?9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_pattern1(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(4, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B57?"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_pattern2(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with * pattern match
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with * pattern match
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(5, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9*"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_pattern_caseInsensitive(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match and in case insensitive mode.
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match and in case insensitive mode.
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"?9b574"}, queryOptions: {ignoreCase: true}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_pattern_caseSensitive(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match and in case sensitive mode.
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match and in case sensitive mode.
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"?9B574"}, queryOptions: {ignoreCase: false}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_getLabel(t){
			// summary:
			//		Simple test of the getLabel function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabel function against a store set that has a label defined.

			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var label = store.getLabel(items[0]);
				t.assertTrue(label !== null);
				t.assertEqual("Table Row #3", label);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d;
		},
		function testReadAPI_getLabelAttributes(t){
			// summary:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.

			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var labelList = store.getLabelAttributes(items[0]);
				t.assertTrue(labelList === null);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d;
		},

		function testReadAPI_getValue(t){
			 // summary:
			 //		Simple test of the getValue API
			 // description:
			 //		Simple test of the getValue API
			 var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

			 var d = new doh.Deferred();
			 function onComplete(items, request) {
				 t.assertEqual(1, items.length);
				 var item = items[0];
				 t.assertTrue(store.hasAttribute(item,"isbn"));
				 t.assertEqual(store.getValue(item,"isbn"), "A9B574");
				 d.callback(true);
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			 return d; //Object
		},
		function testReadAPI_getValues(t){
			 // summary:
			 //		Simple test of the getValues API
			 // description:
			 //		Simple test of the getValues API
			 var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

			 var d = new doh.Deferred();
			 function onComplete(items, request) {
				 t.assertEqual(1, items.length);
				 var item = items[0];
				 t.assertTrue(store.hasAttribute(item,"isbn"));
				 var values = store.getValues(item,"isbn");
				 t.assertEqual(1,values.length);
				 t.assertEqual("A9B574", values[0]);
				 d.callback(true);
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			 return d; //Object
		},
		function testReadAPI_isItem(t){
			 // summary:
			 //		Simple test of the isItem API
			 // description:
			 //		Simple test of the isItem API
			 var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

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
			 store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			 return d; //Object
		},
		function testReadAPI_isItem_multistore(t){
			// summary:
			//		Simple test of the isItem API across multiple store instances.
			// description:
			//		Simple test of the isItem API across multiple store instances.
			var store1 = dojox.data.tests.stores.HtmlTableStore.getBooksStore();
			var store2 = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

			var d = new doh.Deferred();
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
				store2.fetch({query:{isbn:"A9B574"}, onComplete: onComplete2, onError: onError});
			}
			function onError(error, request) {
				d.errback(error);
			}
			store1.fetch({query:{isbn:"1"}, onComplete: onComplete1, onError: onError});
			return d; //Object
		},
		function testReadAPI_hasAttribute(t){
			// summary:
			//		Simple test of the hasAttribute API
			// description:
			//		Simple test of the hasAttribute API
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.hasAttribute(item,"isbn"));
				t.assertTrue(!store.hasAttribute(item,"bob"));
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_containsValue(t){
			// summary:
			//		Simple test of the containsValue API
			// description:
			//		Simple test of the containsValue API
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"isbn", "A9B574"));
				t.assertTrue(!store.containsValue(item,"isbn", "bob"));
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_sortDescending(t){
			// summary:
			//		Simple test of the sorting API in descending order.
			// description:
			//		Simple test of the sorting API in descending order.
			var store = dojox.data.tests.stores.HtmlTableStore.getBooksStore();

			//Comparison is done as a string type (toString comparison), so the order won't be numeric
			//So have to compare in 'alphabetic' order.
			var order = [9,8,7,6,5,4,3,20,2,19,18,17,16,15,14,13,12,11,10,1];
			
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(20, items.length);

				for(var i = 0; i < items.length; i++){
					t.assertEqual(order[i], store.getValue(items[i],"isbn").toString());
				}
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}

			var sortAttributes = [{attribute: "isbn", descending: true}];
			store.fetch({query:{isbn:"*"}, sort: sortAttributes, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_sortAscending(t){
			// summary:
			//		Simple test of the sorting API in ascending order.
			// description:
			//		Simple test of the sorting API in ascending order.
			var store = dojox.data.tests.stores.HtmlTableStore.getBooksStore();

			//Comparison is done as a string type (toString comparison), so the order won't be numeric
			//So have to compare in 'alphabetic' order.
			var order = [1,10,11,12,13,14,15,16,17,18,19,2,20,3,4,5,6,7,8,9];
						
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(20, items.length);
				var itemId = 1;
				for(var i = 0; i < items.length; i++){
					t.assertEqual(order[i], store.getValue(items[i],"isbn").toString());
				}
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}

			var sortAttributes = [{attribute: "isbn"}];
			store.fetch({query:{isbn:"*"}, sort: sortAttributes, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_sortDescendingNumeric(t){
			// summary:
			//		Simple test of the sorting API in descending order using a numeric comparator.
			// description:
			//		Simple test of the sorting API in descending order using a numeric comparator.
			var store = dojox.data.tests.stores.HtmlTableStore.getBooksStore();

			//isbn should be treated as a numeric, not as a string comparison
			store.comparatorMap = {};
			store.comparatorMap["isbn"] = function(a, b){
				var ret = 0;
				if(parseInt(a.toString()) > parseInt(b.toString())){
					ret = 1;
				}else if(parseInt(a.toString()) < parseInt(b.toString())){
					ret = -1;
				}
				return ret; //int, {-1,0,1}
			};

			var d = new doh.Deferred();
			function onComplete(items, request) {
                		t.assertEqual(20, items.length);
                		var itemId = 20;
				for(var i = 0; i < items.length; i++){
					t.assertEqual(itemId, store.getValue(items[i],"isbn").toString());
					itemId--;
				}
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}

			var sortAttributes = [{attribute: "isbn", descending: true}];
			store.fetch({query:{isbn:"*"}, sort: sortAttributes, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_sortAscendingNumeric(t){
			// summary:
			//		Simple test of the sorting API in ascending order using a numeric comparator.
			// description:
			//		Simple test of the sorting API in ascending order using a numeric comparator.
			var store = dojox.data.tests.stores.HtmlTableStore.getBooksStore();

			//isbn should be treated as a numeric, not as a string comparison
			store.comparatorMap = {};
			store.comparatorMap["isbn"] = function(a, b){
				var ret = 0;
				if(parseInt(a.toString()) > parseInt(b.toString())){
					ret = 1;
				}else if(parseInt(a.toString()) < parseInt(b.toString())){
					ret = -1;
				}
				return ret; //int, {-1,0,1}
			};

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(20, items.length);
				var itemId = 1;
				for(var i = 0; i < items.length; i++){
					t.assertEqual(itemId, store.getValue(items[i],"isbn").toString());
					itemId++;
				}
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}

			var sortAttributes = [{attribute: "isbn"}];
			store.fetch({query:{isbn:"*"}, sort: sortAttributes, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_isItemLoaded(t){
			// summary:
			//		Simple test of the isItemLoaded API
			// description:
			//		Simple test of the isItemLoaded API
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

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
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_getFeatures(t){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store

			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();
			var features = store.getFeatures();
			var count = 0;
			for(i in features){
				t.assertTrue((i === "dojo.data.api.Read" || i === "dojo.data.api.Identity"));
				count++;
			}
			t.assertEqual(2, count);
		},
		function testReadAPI_getAttributes(t){
			// summary:
			//		Simple test of the getAttributes API
			// description:
			//		Simple test of the getAttributes API
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				var attributes = store.getAttributes(item);
				t.assertEqual(3,attributes.length);
				for(var i=0; i<attributes.length; i++){
					t.assertTrue((attributes[i] === "isbn" || attributes[i] === "title" || attributes[i] === "author"));
				}
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = dojox.data.tests.stores.HtmlTableStore.getBooksStore();
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
		},
/***************************************
     dojo.data.api.Identity API
***************************************/
		function testIdentityAPI_getIdentity(t){
			// summary:
			//		Simple test of the getAttributes API
			// description:
			//		Simple test of the getAttributes API
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertEqual(3,store.getIdentity(item));
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testIdentityAPI_getIdentityAttributes(t){
			// summary:
			//		Simple test of the getAttributes API
			// description:
			//		Simple test of the getAttributes API
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				//Should have none, as it's not a public attribute.
				var attributes = store.getIdentityAttributes(item);
				t.assertEqual(null, attributes);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testIdentityAPI_fetchItemByIdentity(t){
			// summary:
			//		Simple test of the fetchItemByIdentity API
			// description:
			//		Simple test of the fetchItemByIdentity API
			var store = dojox.data.tests.stores.HtmlTableStore.getBooks2Store();

			var d = new doh.Deferred();
			function onItem(item, request) {
				t.assertTrue(item !== null);
				t.assertTrue(store.isItem(item));
				t.assertEqual("A9B574", store.getValue(item, "isbn"));
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetchItemByIdentity({identity: 3, onItem: onItem, onError: onError});
			return d; //Object
		},
		function testIdentityAPI_functionConformance(t){
			// summary:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = dojox.data.tests.stores.HtmlTableStore.getBooksStore();
			var identityApi = new dojo.data.api.Identity();
			var passed = true;

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

//Register the remote tests ... when they work.
//doh.registerUrl("dojox.data.tests.stores.HtmlTableStore.remote", dojo.moduleUrl("dojox.data.tests", "ml/test_HtmlTableStore_declaratively.html"));
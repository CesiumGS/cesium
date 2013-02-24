dojo.provide("dojox.data.tests.stores.XmlStore");
dojo.require("dojox.data.XmlStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojo.data.api.Write");
dojo.require("dojo.data.api.Identity");


dojox.data.tests.stores.XmlStore.getBooks3Store = function(){
	return new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/books2.xml").toString(), label: "title", keyAttribute: "isbn"});
};

dojox.data.tests.stores.XmlStore.getBooks2Store = function(){
	return new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/books2.xml").toString(), label: "title"});
};

dojox.data.tests.stores.XmlStore.getBooks2StorePC = function(){
	return new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/books2.xml").toString(), label: "title", urlPreventCache: false});
};

dojox.data.tests.stores.XmlStore.getBooksStore = function(){
	return new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/books.xml").toString(), label: "title"});
};

dojox.data.tests.stores.XmlStore.getCDataTestStore = function(){
	return new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/cdata_test.xml").toString(), label: "title"});
};

dojox.data.tests.stores.XmlStore.getGeographyStore = function(){
	return new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/geography2.xml").toString(), label: "text", keyAttribute: "text", attributeMap: {text: '@text'}, rootItem: "geography"});
};

doh.register("dojox.data.tests.stores.XmlStore",
	[
		function testReadAPI_fetch_all(t){
			// summary:
			//		Simple test of fetching all xml items through an XML element called isbn
			// description:
			//		Simple test of fetching all xml items through an XML element called isbn
			var store = dojox.data.tests.stores.XmlStore.getBooksStore();

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
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

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
		{
			name: "testReadAPI_fetch_paging",
			timeout: 10000,
			runTest: function(t){
				// summary:
				//		Simple test of fetching one xml items through an XML element called isbn
				// description:
				//		Simple test of fetching one xml items through an XML element called isbn
				var store = dojox.data.tests.stores.XmlStore.getBooksStore();
				var d = new doh.Deferred();
	
				var dumpSixthFetch = function(items, request){
					t.assertEqual(18, items.length);
					d.callback(true);
				};

				var dumpFifthFetch = function(items, request){
					t.assertEqual(11, items.length);
					request.start = 2;
					request.count = 20;
					request.onComplete = dumpSixthFetch;
					store.fetch(request);
				};

				var dumpFourthFetch = function(items, request){
					t.assertEqual(18, items.length);
					request.start = 9;
					request.count = 100;
					request.onComplete = dumpFifthFetch;
					store.fetch(request);
				};

				var dumpThirdFetch = function (items, request){
					t.assertEqual(5, items.length);
					request.start = 2;
					request.count = 20;
					request.onComplete = dumpFourthFetch;
					store.fetch(request);
				};

				var dumpSecondFetch = function(items, request){
					t.assertEqual(1, items.length);
					request.start = 0;
					request.count = 5;
					request.onComplete = dumpThirdFetch;
					store.fetch(request);
				};

				var dumpFirstFetch = function(items, request){
					t.assertEqual(5, items.length);
					request.start = 3;
					request.count = 1;
					request.onComplete = dumpSecondFetch;
					store.fetch(request);
				};

				var completed = function(items, request){
					t.assertEqual(20, items.length);
					request.start = 1;
					request.count = 5;
					request.onComplete = dumpFirstFetch;
					store.fetch(request);
				};
	

				function error(errData, request){
					 d.errback(errData);
				}

				store.fetch({onComplete: completed, onError: error});
				return d; //Object
			}
		},
		function testReadAPI_fetch_pattern0(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
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
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
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
		function testReadAPI_fetch_pattern1_preventCacheOff(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			//		with preventCache off to test that it doesn't pass it when told not to.
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			//		with preventCache off to test that it doesn't pass it when told not to.
			var store = dojox.data.tests.stores.XmlStore.getBooks2StorePC();
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
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
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
		function testReadAPI_fetch_pattern_multi(t){
			// summary:
			//		Simple test of fetching one xml items with a pattern of multiple attrs.
			// description:
			//		Simple test of fetching one xml items with a pattern of multiple attrs.
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B57?", title: "?itle of 3"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_pattern_multiValuedValue(t){
			// summary:
			//		Simple test of fetching one xml items with a pattern of multiple attrs.
			// description:
			//		Simple test of fetching one xml items with a pattern of multiple attrs.
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{author:"Third Author of 5"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_pattern_caseInsensitive(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match and in case insensitive mode.
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match and in case insensitive mode.
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
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
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
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
		function testReadAPI_fetch_regexp(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn: new RegExp("^.9B574$")}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_all_rootItem(t){
			// summary:
			//		Simple test of fetching all xml items through an XML element called isbn
			// description:
			//		Simple test of fetching all xml items through an XML element called isbn
			var store = new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/books3.xml").toString(),
				rootItem:"book"});

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(5, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"*"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_withAttrMap_all(t){
			var store = new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/books_isbnAttr.xml").toString(),
				attributeMap: {"book.isbn": "@isbn"}});

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(5, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				console.debug(error);
				d.errback(error);
			}
			store.fetch({query:{isbn:"*"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_withAttrMap_one(t){
			var store = new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/books_isbnAttr.xml").toString(),
				attributeMap: {"book.isbn": "@isbn"}});

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				console.debug(error);
				d.errback(error);
			}
			store.fetch({query:{isbn:"2"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_withAttrMap_pattern0(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			var store = new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/books_isbnAttr2.xml").toString(),
				attributeMap: {"book.isbn": "@isbn"}});
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(3, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"ABC?"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_withAttrMap_pattern1(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			var store = new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/books_isbnAttr2.xml").toString(),
				attributeMap: {"book.isbn": "@isbn"}});
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(5, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A*"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_withAttrMap_pattern2(t){
			// summary:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			// description:
			//		Simple test of fetching one xml items through an XML element called isbn with ? pattern match
			var store = new dojox.data.XmlStore({url: require.toUrl("dojox/data/tests/stores/books_isbnAttr2.xml").toString(),
				attributeMap: {"book.isbn": "@isbn"}});
			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(2, items.length);
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"?C*"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},

		function testReadAPI_getLabel(t){
			// summary:
			//		Simple test of the getLabel function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabel function against a store set that has a label defined.

			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var label = store.getLabel(items[0]);
				t.assertTrue(label !== null);
				t.assertEqual("Title of 4", label);
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

			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var labelList = store.getLabelAttributes(items[0]);
				t.assertTrue(dojo.isArray(labelList));
				t.assertEqual("title", labelList[0]);
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
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

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
		function testReadAPI_getValue_cdata(t) {
			// summary:
			//		Simple test of the getValue text() special attribute.
			// description:
			//		Simple test of the getValue text() special attribute.
			var store = dojox.data.tests.stores.XmlStore.getCDataTestStore();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				try{
					t.assertTrue(store.hasAttribute(item,"ids"));
					t.assertEqual(store.getValue(item,"ids"), "{68d3c190-4b83-11dd-c204-000000000001}17");
					var title = store.getValue(item, "title");
					t.assertTrue(store.isItem(title));
					var titleValue = store.getValue(title, "text()");
					t.assertEqual("<b>First</b> 3", dojo.trim(titleValue));
					d.callback(true);
				} catch (e) {
					d.errback(e);
				}
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{ids:"{68d3c190-4b83-11dd-c204-000000000001}17"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},

		function testReadAPI_getValues_cdata(t) {
			// summary:
			//		Simple test of the getValues text() special attribute.
			// description:
			//		Simple test of the getValues text() special attribute.
			var store = dojox.data.tests.stores.XmlStore.getCDataTestStore();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				try{
					t.assertTrue(store.hasAttribute(item,"ids"));
					t.assertEqual(store.getValue(item,"ids"), "{68d3c190-4b83-11dd-c204-000000000001}17");
					var title = store.getValue(item, "title");
					t.assertTrue(store.isItem(title));
					var titleValue = store.getValues(title, "text()");
					t.assertEqual("<b>First</b> 3", dojo.trim(titleValue[0]));
					d.callback(true);
				} catch (e) {
					d.errback(e);
				}
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{ids:"{68d3c190-4b83-11dd-c204-000000000001}17"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_getValue_cdata_toString(t) {
			// summary:
			//		Simple test of the getValue and toString of the resulting 'XmlItem' API
			// description:
			//		Simple test of the getValue and toString of the resulting 'XmlItem' API
			var store = dojox.data.tests.stores.XmlStore.getCDataTestStore();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				try{
					t.assertTrue(store.hasAttribute(item,"ids"));
					t.assertEqual(store.getValue(item,"ids"), "{68d3c190-4b83-11dd-c204-000000000001}17");
					var title = store.getValue(item, "title");
					t.assertTrue(store.isItem(title));
					var firstText = title.toString();
					t.assertEqual("<b>First</b> 3", dojo.trim(firstText));
					d.callback(true);
				} catch (e) {
					d.errback(e);
				}
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{ids:"{68d3c190-4b83-11dd-c204-000000000001}17"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},

		function testReadAPI_getValues(t){
			 // summary:
			 //		Simple test of the getValues API
			 // description:
			 //		Simple test of the getValues API
			 var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

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
			 var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

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
			var store1 = dojox.data.tests.stores.XmlStore.getBooks2Store();
			var store2 = dojox.data.tests.stores.XmlStore.getBooks2Store();
			var d = new doh.Deferred();

			var onError = function(error, request) {
				d.errback(error);
			};

			var onComplete1 = function(items, request) {
				t.assertEqual(1, items.length);
				var item1 = items[0];
				t.assertTrue(store1.isItem(item1));

				var onComplete2 = function(items, request) {
					t.assertEqual(1, items.length);
					var item2 = items[0];
					t.assertTrue(store2.isItem(item2));
					t.assertTrue(!store1.isItem(item2));
					t.assertTrue(!store2.isItem(item1));
					d.callback(true);
				};
				store2.fetch({query:{isbn:"A9B574"}, onComplete: onComplete2, onError: onError});
			};
			store1.fetch({query:{isbn:"A9B574"}, onComplete: onComplete1, onError: onError});
			return d; //Object
		},
		function testReadAPI_hasAttribute(t){
			// summary:
			//		Simple test of the hasAttribute API
			// description:
			//		Simple test of the hasAttribute API
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.hasAttribute(item,"isbn"));
				t.assertTrue(!store.hasAttribute(item,"bob"));
				//Verify that XML attributes return false in this case.
				t.assertTrue(store.hasAttribute(item,"@xmlAttribute"));
				t.assertFalse(store.hasAttribute(item,"@bogus"));
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
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

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
			var store = dojox.data.tests.stores.XmlStore.getBooksStore();

			//Comparison is done as a string type (toString comparison), so the order won't be numeric
			//So have to compare in 'alphabetic' order.
			var order = [9,8,7,6,5,4,3,20,2,19,18,17,16,15,14,13,12,11,10,1];
			
			var d = new doh.Deferred();
			function onComplete(items, request) {
				console.log("Number of items: " + items.length);
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
			var store = dojox.data.tests.stores.XmlStore.getBooksStore();

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
			var store = dojox.data.tests.stores.XmlStore.getBooksStore();

			//isbn should be treated as a numeric, not as a string comparison
			store.comparatorMap = {};
			store.comparatorMap["isbn"] = function(a, b){
				var ret = 0;
				if(parseInt(a.toString(), 10) > parseInt(b.toString(), 10)){
					ret = 1;
				}else if(parseInt(a.toString(), 10) < parseInt(b.toString(), 10)){
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
			var store = dojox.data.tests.stores.XmlStore.getBooksStore();

			//isbn should be treated as a numeric, not as a string comparison
			store.comparatorMap = {};
			store.comparatorMap["isbn"] = function(a, b){
				var ret = 0;
				if(parseInt(a.toString(), 10) > parseInt(b.toString(), 10)){
					ret = 1;
				}else if(parseInt(a.toString(), 10) < parseInt(b.toString(), 10)){
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
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

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

			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();
			var features = store.getFeatures();
			var count = 0;
			var i;
			for(i in features){
				t.assertTrue((i === "dojo.data.api.Read" || i === "dojo.data.api.Write" || "dojo.data.api.Identity"));
				count++;
			}
			t.assertEqual(3, count);
		},
		function testReadAPI_getAttributes(t){
			// summary:
			//		Simple test of the getAttributes API
			// description:
			//		Simple test of the getAttributes API
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				var attributes = store.getAttributes(item);

				//Should be six, as all items should have tagName, childNodes, and text() special attributes
				//in addition to any doc defined ones, which in this case are author, title, and isbn
				//FIXME:  Figure out why IE returns 5!  Need to get firebug lite working in IE for that.
				//Suspect it's childNodes, may not be defined if there are no child nodes.
				for(var i = 0; i < attributes.length; i++){
					console.log("attribute found: " + attributes[i]);
				}
				if(dojo.isIE){
					t.assertEqual(5,attributes.length);
				}else{
					t.assertEqual(6,attributes.length);
				}
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B577"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_setValue(t){
			// summary:
			//		Simple test of the setValue API
			// description:
			//		Simple test of the setValue API
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"isbn", "A9B574"));
				store.setValue(item, "isbn", "A9B574-new");
				t.assertEqual(store.getValue(item,"isbn").toString(), "A9B574-new");
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_setValues(t){
			// summary:
			//		Simple test of the setValues API
			// description:
			//		Simple test of the setValues API
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"isbn", "A9B574"));
				store.setValues(item, "isbn", ["A9B574-new1", "A9B574-new2"]);
				var values = store.getValues(item,"isbn");
				t.assertEqual(values[0].toString(), "A9B574-new1");
				t.assertEqual(values[1].toString(), "A9B574-new2");
				store.setValues(values[0], "text()", ["A9B574", "-new3"]);
				t.assertEqual(store.getValue(values[0],"text()").toString(), "A9B574-new3");
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_unsetAttribute(t){
			// summary:
			//		Simple test of the unsetAttribute API
			// description:
			//		Simple test of the unsetAttribute API
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"isbn", "A9B574"));
				store.unsetAttribute(item,"isbn");
				t.assertTrue(!store.hasAttribute(item,"isbn"));
				t.assertTrue(store.isDirty(item));
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_isDirty(t){
			// summary:
			//		Simple test of the isDirty API
			// description:
			//		Simple test of the isDirty API
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			var d = new doh.Deferred();
			function onComplete(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"isbn", "A9B574"));
				store.setValue(item, "isbn", "A9B574-new");
				t.assertEqual(store.getValue(item,"isbn").toString(), "A9B574-new");
				t.assertTrue(store.isDirty(item));
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_revert(t){
			// summary:
			//		Simple test of the write revert API
			// description:
			//		Simple test of the write revert API
			var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			var d = new doh.Deferred();
			var onError = function(error, request) {
				d.errback(error);
			};
			var onComplete = function(items, request) {
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"isbn", "A9B574"));
				t.assertTrue(!store.isDirty(item));
				store.setValue(item, "isbn", "A9B574-new");
				t.assertEqual(store.getValue(item,"isbn").toString(), "A9B574-new");
				t.assertTrue(store.isDirty(item));
				store.revert();
				
				//Fetch again to see if it reset the state.
				var onComplete1 = function(items, request) {
					t.assertEqual(1, items.length);
					var item = items[0];
					t.assertTrue(store.containsValue(item,"isbn", "A9B574"));
					d.callback(true);
				};
				store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete1, onError: onError});
			};
			store.fetch({query:{isbn:"A9B574"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},

		function testIdentityAPI_getIdentity(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API
			 // description:
			 //		Simple test of the Identity getIdentity API
			 var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			 var d = new doh.Deferred();
			 function onComplete(items, request) {
				 t.assertEqual(1, items.length);
				 var item = items[0];
				 try {
					 t.assertTrue(store.containsValue(item,"isbn", "A9B5CC"));
					 t.assertTrue(store.getIdentity(item) !== null);
					 d.callback(true);
				 } catch (e) {
					 d.errback(e);
				 }
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetch({query:{isbn:"A9B5CC"}, onComplete: onComplete, onError: onError});
			 return d; //Object
		},

		function testIdentityAPI_getIdentityAttributes(t) {
			 // summary:
			 //		Simple test of the Identity getIdentityAttributes API where it defaults to internal xpath (no keyAttribute)
			 // description:
			 //		Simple test of the Identity getIdentityAttributes API where it defaults to internal xpath (no keyAttribute)
			 var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				try{
					t.assertTrue(item !== null);
					var idAttrs = store.getIdentityAttributes(item);
					t.assertTrue(idAttrs === null);
					t.assertEqual("/books[0]/book[4]", store.getIdentity(item));
					d.callback(true);
				}catch(e){
					d.errback(e);
				}
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetchItemByIdentity({identity: "/books[0]/book[4]", onItem: onItem, onError: onError});
			 return d; //Object
		},

		function testIdentityAPI_getIdentityAttributes_usingKeyAttributeIdentity(t) {
			 // summary:
			 //		Simple test of the Identity getIdentityAttributes API where identity is specified by the keyAttribute param
			 // description:
			 //		Simple test of the Identity getIdentityAttributes API where identity is specified by the keyAttribute param
			 var store = dojox.data.tests.stores.XmlStore.getBooks3Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				try{
					t.assertTrue(item !== null);
					var idAttrs = store.getIdentityAttributes(item);
					t.assertTrue(idAttrs !== null);
					t.assertTrue(idAttrs.length === 1);
					t.assertTrue(idAttrs[0] === "isbn");
					d.callback(true);
				}catch(e){
					d.errback(e);
				}
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetchItemByIdentity({identity: "A9B574", onItem: onItem, onError: onError});
			 return d; //Object
		},

		function testIdentityAPI_fetchItemByIdentity(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API where the store defaults the identity to a xpathlike lookup.
			 // description:
			 //		Simple test of the Identity getIdentity API where the store defaults the identity to a xpathlike lookup.
			 var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				try{
					t.assertTrue(item !== null);
					t.assertEqual("/books[0]/book[4]", store.getIdentity(item));
					d.callback(true);
				}catch(e){
					d.errback(e);
				}
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetchItemByIdentity({identity: "/books[0]/book[4]", onItem: onItem, onError: onError});
			 return d; //Object
		
		},

		function testIdentityAPI_fetchItemByIdentity2(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API where the store defaults the identity to a xpathlike lookup.
			 // description:
			 //		Simple test of the Identity getIdentity API where the store defaults the identity to a xpathlike lookup.
			 var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				try{
					t.assertTrue(item !== null);
					t.assertEqual("/books[0]/book[0]", store.getIdentity(item));
					d.callback(true);
				}catch(e){
					d.errback(e);
				}
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetchItemByIdentity({identity: "/books[0]/book[0]", onItem: onItem, onError: onError});
			 return d; //Object
		
		},

		function testIdentityAPI_fetchItemByIdentity3(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API where the store defaults the identity to a xpathlike lookup.
			 // description:
			 //		Simple test of the Identity getIdentity API where the store defaults the identity to a xpathlike lookup.
			 var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				try{
					t.assertTrue(item !== null);
					t.assertEqual("/books[0]/book[2]", store.getIdentity(item));
					d.callback(true);
				}catch(e){
					d.errback(e);
				}
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetchItemByIdentity({identity: "/books[0]/book[2]", onItem: onItem, onError: onError});
			 return d; //Object
		
		},

		function testIdentityAPI_fetchItemByIdentity_usingKeyAttributeIdentity(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API where identity is specified by the keyAttribute param
			 // description:
			 //		Simple test of the Identity getIdentity API where identity is specified by the keyAttribute param
			 var store = dojox.data.tests.stores.XmlStore.getBooks3Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				try{
					t.assertTrue(item !== null);
					t.assertEqual("A9B574", store.getIdentity(item));
					d.callback(true);
				}catch(e){
					d.errback(e);
				}
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetchItemByIdentity({identity: "A9B574", onItem: onItem, onError: onError});
			 return d; //Object
		},

		function testIdentityAPI_fetchItemByIdentity_usingKeyAttributeIdentity2(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API where identity is specified by the keyAttribute param
			 // description:
			 //		Simple test of the Identity getIdentity API where identity is specified by the keyAttribute param
			 var store = dojox.data.tests.stores.XmlStore.getBooks3Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				try{
					t.assertTrue(item !== null);
					t.assertEqual("A9B57C", store.getIdentity(item));
					d.callback(true);
				}catch(e){
					d.errback(e);
				}
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetchItemByIdentity({identity: "A9B57C", onItem: onItem, onError: onError});
			 return d; //Object
		},

		function testIdentityAPI_fetchItemByIdentity_usingKeyAttributeIdentity3(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API where identity is specified by the keyAttribute param
			 // description:
			 //		Simple test of the Identity getIdentity API where identity is specified by the keyAttribute param
			 var store = dojox.data.tests.stores.XmlStore.getBooks3Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				try{
					t.assertTrue(item !== null);
					t.assertEqual("A9B5CC", store.getIdentity(item));
					d.callback(true);
				}catch(e){
					d.errback(e);
				}
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetchItemByIdentity({identity: "A9B5CC", onItem: onItem, onError: onError});
			 return d; //Object
		},

		function testIdentityAPI_fetchItemByIdentity_usingKeyAttributeIdentity4(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API where identity is specified by the keyAttribute param
			 // description:
			 //		Simple test of the Identity getIdentity API where identity is specified by the keyAttribute param
			 var store = dojox.data.tests.stores.XmlStore.getGeographyStore();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				try{
					t.assertTrue(item !== null);
					t.assertEqual("Mexico City", store.getIdentity(item));
					d.callback(true);
				}catch(e){
					d.errback(e);
				}
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetchItemByIdentity({identity: "Mexico City", onItem: onItem, onError: onError});
			 return d; //Object
		},


		function testIdentityAPI_fetchItemByIdentity_fails(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API
			 // description:
			 //		Simple test of the Identity getIdentity API
			 var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				 t.assertTrue(item === null);
				 d.callback(true);
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 //In memory stores use dojo query syntax for the identifier.
			 store.fetchItemByIdentity({identity: "/books[0]/book[200]", onItem: onItem, onError: onError});
			 return d; //Object
		},

		function testIdentityAPI_fetchItemByIdentity_fails2(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API
			 // description:
			 //		Simple test of the Identity getIdentity API
			 var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				 t.assertTrue(item === null);
				 d.callback(true);
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 //In memory stores use dojo query syntax for the identifier.
			 store.fetchItemByIdentity({identity: "/books[1]/book[4]", onItem: onItem, onError: onError});
			 return d; //Object
		},

		function testIdentityAPI_fetchItemByIdentity_fails3(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API
			 // description:
			 //		Simple test of the Identity getIdentity API
			 var store = dojox.data.tests.stores.XmlStore.getBooks2Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				 t.assertTrue(item === null);
				 d.callback(true);
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 //In memory stores use dojo query syntax for the identifier.
			 store.fetchItemByIdentity({identity: "/books[1]/book[200]", onItem: onItem, onError: onError});
			 return d; //Object
		},

		function testIdentityAPI_fetchItemByIdentity_usingKeyAttributeIdentity_fails(t) {
			 // summary:
			 //		Simple test of the Identity getIdentity API where identity is specified by the keyAttribute param
			 // description:
			 //		Simple test of the Identity getIdentity API where identity is specified by the keyAttribute param
			 var store = dojox.data.tests.stores.XmlStore.getBooks3Store();

			 var d = new doh.Deferred();
			 function onItem(item, request) {
				try{
					t.assertTrue(item === null);
					d.callback(true);
				}catch(e){
					d.errback(e);
				}
			 }
			 function onError(error, request) {
				 d.errback(error);
			 }
			 store.fetchItemByIdentity({identity: "A9B574_NONEXISTANT", onItem: onItem, onError: onError});
			 return d; //Object
		},

		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = dojox.data.tests.stores.XmlStore.getBooksStore();
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
		function testWriteAPI_functionConformance(t){
			// summary:
			//		Simple test write API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test write API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = dojox.data.tests.stores.XmlStore.getBooksStore();
			var writeApi = new dojo.data.api.Write();
			var passed = true;
			var i;
			for(i in writeApi){
				var member = writeApi[i];
				//Check that all the 'Write' defined functions exist on the test store.
				if(typeof member === "function"){
					var testStoreMember = testStore[i];
					if(!(typeof testStoreMember === "function")){
						passed = false;
						break;
					}
				}
			}
			t.assertTrue(passed);
		},
		function testIdentityAPI_functionConformance(t){
			// summary:
			//		Simple test write API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test write API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = dojox.data.tests.stores.XmlStore.getBooksStore();
			var identityApi = new dojo.data.api.Identity();
			var passed = true;
			var i;
			for(i in identityApi){
				var member = identityApi[i];
				//Check that all the 'Write' defined functions exist on the test store.
				if(typeof member === "function"){
					var testStoreMember = testStore[i];
					if(!(typeof testStoreMember === "function")){
						passed = false;
						break;
					}
				}
			}
			t.assertTrue(passed);
		}
	]
);

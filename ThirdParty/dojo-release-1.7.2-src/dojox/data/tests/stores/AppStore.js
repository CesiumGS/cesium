dojo.provide("dojox.data.tests.stores.AppStore");
dojo.require("dojox.data.AppStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojo.data.api.Write");
dojo.require("dojo.data.api.Identity");

dojox.data.tests.stores.AppStore.getStore = function(preventCache){
	preventCache = preventCache?true:false;
	return new dojox.data.AppStore({url: dojo.moduleUrl('dojox.atom.tests.widget', 'samplefeedEdit.xml').toString(), urlPreventCache: preventCache});
};

doh.register("dojox.data.tests.stores.AppStore",
	[
		function testReadAPI_fetch_all(t){
			//	summary:
			//		Simple test of fetching all items
			//	description:
			//		Simple test of fetching all items
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(8, items.length);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"*"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_all_preventCache(t){
			//	summary:
			//		Simple test of fetching all items
			//	description:
			//		Simple test of fetching all items
			var store = dojox.data.tests.stores.AppStore.getStore(true);

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(8, items.length);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"*"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_one(t){
			//	summary:
			//		Simple test of fetching one item
			//	description:
			//		Simple test of fetching one item
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_paging(t){
			//	summary:
			//		Simple test of paging
			//	description:
			//		Simple test of paging
			var store = dojox.data.tests.stores.AppStore.getStore();
			
			var d = new doh.Deferred();

			function dumpFifthFetch(items, request){
				t.assertEqual(0, items.length);
				d.callback(true);
			}
			
			function dumpFourthFetch(items, request){
				t.assertEqual(6, items.length);
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
				t.assertEqual(8, items.length);
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
			//	summary:
			//		Simple test of fetching one item with ? pattern match
			//	description:
			//		Simple test of fetching one item with ? pattern match
			var store = dojox.data.tests.stores.AppStore.getStore();
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"?est Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_pattern1(t){
			//	summary:
			//		Simple test of fetching one item with * pattern match
			//	description:
			//		Simple test of fetching one item with * pattern match
			var store = dojox.data.tests.stores.AppStore.getStore();
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(8, items.length);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"*Test*"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_fetch_pattern_caseInsensitive(t){
			//	summary:
			//		Simple test of fetching one item with * pattern match case insensitive
			//	description:
			//		Simple test of fetching one item with * pattern match case insensitive
			var store = dojox.data.tests.stores.AppStore.getStore();
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(8, items.length);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"*test*"}, queryOptions: {ignoreCase: true}, onComplete: onComplete, onError: onError});
			return d; //Object
		},

		function testReadAPI_getLabel(t){
			//	summary:
			//		Simple test of the getLabel function against a store set that has a label defined.
			//	description:
			//		Simple test of the getLabel function against a store set that has a label defined.

			var store = dojox.data.tests.stores.AppStore.getStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var label = store.getLabel(items[0]);
				t.assertTrue(label !== null);
				t.assertEqual("Test Editable Entry #1", label);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d;
		},
		function testReadAPI_getLabelAttributes(t){
			//	summary:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.
			//	description:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.

			var store = dojox.data.tests.stores.AppStore.getStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var labelList = store.getLabelAttributes(items[0]);
				t.assertTrue(dojo.isArray(labelList));
				t.assertEqual("title", labelList[0]);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d;
		},

		function testReadAPI_getValue(t){
			 //	summary:
			 //		Simple test of the getValue API
			 //	description:
			 //		Simple test of the getValue API
			 var store = dojox.data.tests.stores.AppStore.getStore();

			 var d = new doh.Deferred();
			 function onComplete(items, request){
				 t.assertEqual(1, items.length);
				 var item = items[0];
				 t.assertTrue(store.hasAttribute(item,"id"));
				 t.assertEqual(store.getValue(item,"id"), "http://example.com/samplefeedEdit.xml/entry/10");
				 d.callback(true);
			 }
			 function onError(error, request){
				 d.errback(error);
			 }
			 store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			 return d; //Object
		},
		function testReadAPI_getValues(t){
			 //	summary:
			 //		Simple test of the getValues API
			 //	description:
			 //		Simple test of the getValues API
			 var store = dojox.data.tests.stores.AppStore.getStore();

			 var d = new doh.Deferred();
			 function onComplete(items, request){
				 t.assertEqual(1, items.length);
				 var item = items[0];
				 t.assertTrue(store.hasAttribute(item,"id"));
				 var values = store.getValues(item,"id");
				 t.assertEqual(1,values.length);
				 t.assertEqual(values[0], "http://example.com/samplefeedEdit.xml/entry/10");
				 d.callback(true);
			 }
			 function onError(error, request){
				 d.errback(error);
			 }
			 store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			 return d; //Object
		},
		function testReadAPI_isItem(t){
			 //	summary:
			 //		Simple test of the isItem API
			 //	description:
			 //		Simple test of the isItem API
			 var store = dojox.data.tests.stores.AppStore.getStore();

			 var d = new doh.Deferred();
			 function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.isItem(item));
				t.assertTrue(!store.isItem({}));
				t.assertTrue(!store.isItem("Foo"));
				t.assertTrue(!store.isItem(1));
				d.callback(true);
			 }
			 function onError(error, request){
				 d.errback(error);
			 }
			 store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			 return d; //Object
		},
		function testReadAPI_isItem_multistore(t){
			//	summary:
			//		Simple test of the isItem API across multiple store instances.
			//	description:
			//		Simple test of the isItem API across multiple store instances.
			var store1 = dojox.data.tests.stores.AppStore.getStore();
			var store2 = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();

			function onError(error, request){
				d.errback(error);
			}

			function onComplete1(items, request){
				t.assertEqual(1, items.length);
				var item1 = items[0];
				t.assertTrue(store1.isItem(item1));

				function onComplete2(items, request){
					t.assertEqual(1, items.length);
					var item2 = items[0];
					t.assertTrue(store2.isItem(item2));
					t.assertTrue(!store1.isItem(item2));
					t.assertTrue(!store2.isItem(item1));
					d.callback(true);
				}
				store2.fetch({query:{title:"Test Entry #1"}, onComplete: onComplete2, onError: onError});
			}
			store1.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete1, onError: onError});
			return d; //Object
		},
		function testReadAPI_hasAttribute(t){
			//	summary:
			//		Simple test of the hasAttribute API
			//	description:
			//		Simple test of the hasAttribute API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();

			function onError(error, request){
				d.errback(error);
			}

			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.hasAttribute(item,"title"));
				t.assertTrue(store.hasAttribute(item,"summary"));
				t.assertTrue(!store.hasAttribute(item,"bob"));
				d.callback(true);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_containsValue(t){
			//	summary:
			//		Simple test of the containsValue API
			//	description:
			//		Simple test of the containsValue API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"title", "Test Editable Entry #1"));
				t.assertTrue(!store.containsValue(item,"title", "bob"));
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_sortDescending(t){
			//	summary:
			//		Simple test of the sorting API in descending order.
			//	description:
			//		Simple test of the sorting API in descending order.
			var store = dojox.data.tests.stores.AppStore.getStore();

			//Comparison is done as a string type (toString comparison), so the order won't be numeric
			//So have to compare in 'alphabetic' order.
			var order = [	"Test Entry #6",
							"Test Entry #5",
							"Test Entry #4",
							"Test Entry #3",
							"Test Entry #2",
							"Test Entry #1",
							"Test Editable Entry #2",
							"Test Editable Entry #1"];
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(8, items.length);

				for(var i = 0; i < items.length; i++){
					t.assertEqual(order[i], store.getValue(items[i],"title"));
				}
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}

			var sortAttributes = [{attribute: "title", descending: true}];
			store.fetch({query:{title:"*"}, sort: sortAttributes, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_sortAscending(t){
			//	summary:
			//		Simple test of the sorting API in ascending order.
			//	description:
			//		Simple test of the sorting API in ascending order.
			var store = dojox.data.tests.stores.AppStore.getStore();

			//Comparison is done as a string type (toString comparison), so the order won't be numeric
			//So have to compare in 'alphabetic' order.
			var order = [	"Test Editable Entry #1",
							"Test Editable Entry #2",
							"Test Entry #1",
							"Test Entry #2",
							"Test Entry #3",
							"Test Entry #4",
							"Test Entry #5",
							"Test Entry #6"];
						
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(8, items.length);
				var itemId = 1;
				for(var i = 0; i < items.length; i++){
					t.assertEqual(order[i], store.getValue(items[i],"title"));
				}
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}

			var sortAttributes = [{attribute: "title"}];
			store.fetch({query:{title:"*"}, sort: sortAttributes, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_isItemLoaded(t){
			//	summary:
			//		Simple test of the isItemLoaded API
			//	description:
			//		Simple test of the isItemLoaded API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.isItemLoaded(item));
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testReadAPI_getFeatures(t){
			//	summary:
			//		Simple test of the getFeatures function of the store
			//	description:
			//		Simple test of the getFeatures function of the store

			var store = dojox.data.tests.stores.AppStore.getStore();
			var features = store.getFeatures();
			var count = 0;
			for(var i in features){
				t.assertTrue(( i === "dojo.data.api.Read" || i === "dojo.data.api.Write" || i === "dojo.data.api.Identity"));
				count++;
			}
			t.assertEqual(3, count);
		},
		function testReadAPI_getAttributes(t){
			//	summary:
			//		Simple test of the getAttributes API
			//	description:
			//		Simple test of the getAttributes API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				var attributes = store.getAttributes(item);
				t.assertEqual(6,attributes.length);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_newItem(t){
			//	summary:
			//		Simple test of the newItem API
			//	description:
			//		Simple test of the newItem API
			var store = dojox.data.tests.stores.AppStore.getStore();

			store.newItem({title: "New entry", id: "12345", content: "This is test content", author: {name:"Bob"}});

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"title", "New entry"));
				t.assertTrue(store.containsValue(item, "content", "This is test content"));
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{title:"New entry"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_newItemInCallback(t){
			//	summary:
			//		Simple test of the newItem API
			//	description:
			//		Simple test of the newItem API
			var store = dojox.data.tests.stores.AppStore.getStore();

			store.newItem({title: "New entry", id: "12345", content: "This is test content", author: {name:"Bob"}});

			var d = new doh.Deferred();

			function onError(error, request){
				d.errback(error);
			}

			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"title", "New entry"));
				t.assertTrue(store.containsValue(item, "content", "This is test content"));

				store.newItem({title: "New entry2", id: "12346", content: "This is test content", author: [{name:"Bob"}]});
				
				function onComplete1(items, request){
					t.assertEqual(1, items.length);
					var item = items[0];
					t.assertTrue(store.containsValue(item, "title", "New entry2"));
					d.callback(true);
				}
				
				store.fetch({query:{title:"New entry2"}, onComplete: onComplete1, onError: onError});
			}
			store.fetch({query:{title:"New entry"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_deleteItem(t){
			//	summary:
			//		Simple test of the deleteItem API
			//	description:
			//		Simple test of the deleteItem API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();

			function onError(error, request){
				d.errback(error);
			}

			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"title", "Test Editable Entry #1"));
				store.deleteItem(item);
				
				function onComplete1(items, request){
					t.assertEqual(0, items.length);
					d.callback(true);
				}
				store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete1, onError: onError});
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_setValue(t){
			//	summary:
			//		Simple test of the setValue API
			//	description:
			//		Simple test of the setValue API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"title", "Test Editable Entry #1"));
				store.setValue(item, "title", "Edited title");
				t.assertEqual(store.getValue(item,"title"), "Edited title");
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_setValues(t){
			//	summary:
			//		Simple test of the setValues API
			//	description:
			//		Simple test of the setValues API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"title", "Test Editable Entry #1"));
				store.setValues(item, "author", [{name: "John"}, {name: "Bill", email:"bill@example.com", uri:"http://example.com/bill"}]);
				var values = store.getValues(item,"author");
				t.assertEqual(values[0].name, "John");
				t.assertEqual(values[1].name, "Bill");
				t.assertEqual(values[1].email, "bill@example.com");
				t.assertEqual(values[1].uri, "http://example.com/bill");
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_unsetAttribute(t){
			//	summary:
			//		Simple test of the unsetAttribute API
			//	description:
			//		Simple test of the unsetAttribute API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"title", "Test Editable Entry #1"));
				store.unsetAttribute(item,"title");
				t.assertTrue(!store.hasAttribute(item,"title"));
				t.assertTrue(store.isDirty(item));
				d.callback(true);
			}
			function onError(error, request) {
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_isDirty(t){
			//	summary:
			//		Simple test of the isDirty API
			//	description:
			//		Simple test of the isDirty API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"title", "Test Editable Entry #1"));
				store.setValue(item, "title", "Edited title");
				t.assertEqual(store.getValue(item,"title"), "Edited title");
				t.assertTrue(store.isDirty(item));
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_revert(t){
			//	summary:
			//		Simple test of the isDirty API
			//	description:
			//		Simple test of the isDirty API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onError(error, request){
				d.errback(error);
			}
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"title", "Test Editable Entry #1"));
				t.assertTrue(!store.isDirty(item));
				store.setValue(item, "title", "Edited title");
				t.assertEqual(store.getValue(item,"title"), "Edited title");
				t.assertTrue(store.isDirty(item));
				store.revert();
				
				//Fetch again to see if it reset the state.
				function onComplete1(items, request){
					t.assertEqual(1, items.length);
					var item = items[0];
					t.assertTrue(store.containsValue(item,"title", "Test Editable Entry #1"));
					d.callback(true);
				}
				store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete1, onError: onError});
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},
		function testWriteAPI_revert2(t){
			//	summary:
			//		Simple test of the revert API
			//	description:
			//		Simple test of the revert API
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onError(error, request){
				d.errback(error);
			}
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var item = items[0];
				t.assertTrue(store.containsValue(item,"title", "Test Editable Entry #1"));
				store.deleteItem(item);
				
				function onComplete1(items, request){
					t.assertEqual(7, items.length);
					store.newItem({title: "New entry", id: "12345", content: "This is test content", author: {name:"Bob"}});
					
					function onComplete2(items, request){
						t.assertEqual(1, items.length);
						store.revert();
						
						function onComplete3(items, request){
							t.assertEqual(0, items.length);
							d.callback(true);
						}
						store.fetch({query:{title:"New entry"}, onComplete: onComplete3, onError: onError});
					}
					store.fetch({query:{title:"New entry"}, onComplete: onComplete2, onError: onError});
				}
				store.fetch({query:{title:"*"}, onComplete: onComplete1, onError: onError});
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},

		function testReadAPI_getIdentity(t){
			//	summary:
			//		Simple test of fetching the identity of an item.
			//	description:
			//		Simple test of fetching the identity of an item.
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var id = store.getIdentity(items[0]);
				t.assertEqual("http://example.com/samplefeedEdit.xml/entry/10",id);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},

		function testReadAPI_getIdentityAttributes(t){
			//	summary:
			//		Simple test of fetching the identity attributes off an item,
			//	description:
			//		Simple test of fetching the identity attributes off an item,
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(1, items.length);
				var idAttrs = store.getIdentityAttributes(items[0]);
				t.assertEqual(1, idAttrs.length);
				t.assertEqual("id", idAttrs[0]);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetch({query:{title:"Test Editable Entry #1"}, onComplete: onComplete, onError: onError});
			return d; //Object
		},

		function testReadAPI_fetchItemByIdentity(t){
			//	summary:
			//		Simple test of fetching one atom item through its identity
			//	description:
			//		Simple test of fetching one atom item through its identity
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onItem(item, request) {
				var id = store.getIdentity(item);
				t.assertEqual("http://example.com/samplefeedEdit.xml/entry/10",id);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetchItemByIdentity({identity: "http://example.com/samplefeedEdit.xml/entry/10", onItem: onItem, onError: onError});
			return d; //Object
		},

		function testReadAPI_fetchItemByIdentity_fails(t){
			//	summary:
			//		Simple test of fetching one atom item through its identity fails correctly on no id match
			//	description:
			//		Simple test of fetching one atom item through its identity fails correctly on no id match
			var store = dojox.data.tests.stores.AppStore.getStore();

			var d = new doh.Deferred();
			function onItem(item, request){
				t.assertTrue(item === null);
				d.callback(true);
			}
			function onError(error, request){
				d.errback(error);
			}
			store.fetchItemByIdentity({identity: "http://example.com/samplefeedEdit.xml/entry/10/none", onItem: onItem, onError: onError});
			return d; //Object
		},

		function testReadAPI_functionConformance(t){
			//	summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			//	description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			var testStore = dojox.data.tests.stores.AppStore.getStore();
			var readApi = new dojo.data.api.Read();
			var passed = true;

			for(var i in readApi){
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
			//	summary:
			//		Simple test write API conformance.  Checks to see all declared functions are actual functions on the instances.
			//	description:
			//		Simple test write API conformance.  Checks to see all declared functions are actual functions on the instances.
			var testStore = dojox.data.tests.stores.AppStore.getStore();
			var writeApi = new dojo.data.api.Write();
			var passed = true;

			for(var i in writeApi){
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
			//	summary:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.
			//	description:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.
			var testStore = dojox.data.tests.stores.AppStore.getStore();
			var identityApi = new dojo.data.api.Identity();
			var passed = true;

			for(var i in identityApi){
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

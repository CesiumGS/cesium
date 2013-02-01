dojo.provide("dojox.data.tests.stores.OpenSearchStore");
dojo.require("dojox.data.OpenSearchStore");
dojo.require("dojo.data.api.Read");


dojox.data.tests.stores.OpenSearchStore.getAtomStore = function(){
	var store = new dojox.data.OpenSearchStore({url: require.toUrl('dojox/data/tests/stores/opensearch_atom.xml').toString()});
	store._createSearchUrl = function(request){
		return require.toUrl('dojox/data/tests/stores/atom1.xml').toString();
	};
	return store;
};
dojox.data.tests.stores.OpenSearchStore.getRSSStore = function(){
	var store = new dojox.data.OpenSearchStore({url: require.toUrl('dojox/data/tests/stores/opensearch_rss.xml').toString()});
	store._createSearchUrl = function(request){
		return require.toUrl('dojox/data/tests/stores/rss1.xml').toString();
	};
	return store;
};
dojox.data.tests.stores.OpenSearchStore.getHTMLStore = function(){
	var store = new dojox.data.OpenSearchStore({url: require.toUrl('dojox/data/tests/stores/opensearch_html.xml').toString(), itemPath: "table tbody tr"});
	store._createSearchUrl = function(request){
		return require.toUrl('dojox/data/tests/stores/books.html').toString();
	};
	return store;
};

doh.register("dojox.data.tests.stores.OpenSearchStore",
	[
		{
			name: 'testReadAPI_fetch_all_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of fetching all atom entries
				// description:
				//		Simple test of fetching all atom entries
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_fetch_all_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of fetching all atom entries
				// description:
				//		Simple test of fetching all atom entries
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_fetch_all_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of fetching all atom entries
				// description:
				//		Simple test of fetching all atom entries
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_fetch_paging_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of fetching one xml items through an XML element called isbn
				// description:
				//		Simple test of fetching one xml items through an XML element called isbn
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();

				var d = new doh.Deferred();

                function dumpFifthFetch(items, request){
					t.assertEqual(0, items.length);
					d.callback(true);
				}
				
				function dumpFourthFetch(items, request){
					t.assertEqual(18, items.length);
					request.start = 20;
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
			}
		},
		{
			name: 'testReadAPI_fetch_paging_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of fetching one xml items through an XML element called isbn
				// description:
				//		Simple test of fetching one xml items through an XML element called isbn
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();

				var d = new doh.Deferred();

				function dumpFifthFetch(items, request){
					t.assertEqual(0, items.length);
					d.callback(true);
				}

				function dumpFourthFetch(items, request){
					t.assertEqual(18, items.length);
					request.start = 20;
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
			}
		},
		{
			name: 'testReadAPI_fetch_paging_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of fetching one xml items through an XML element called isbn
				// description:
				//		Simple test of fetching one xml items through an XML element called isbn
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();

				var d = new doh.Deferred();

				function dumpFifthFetch(items, request){
					t.assertEqual(10, items.length);
					d.callback(true);
				}
				
				function dumpFourthFetch(items, request){
					t.assertEqual(18, items.length);
					request.start = 10;
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
			}
		},
		{
			name: 'testReadAPI_getLabel',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getLabel function against a store set that has a label defined.
				// description:
				//		Simple test of the getLabel function against a store set that has a label defined.
				//		This test will be the same for all three types, so not bothering.
	
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 20);
					var label = store.getLabel(items[0]);
					t.assertTrue(label === undefined);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d;
			}
		},
		{
			name: 'testReadAPI_getLabelAttributes',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getLabelAttributes function against a store set that has a label defined.
				// description:
				//		Simple test of the getLabelAttributes function against a store set that has a label defined.
				//		This test will be the same for all three types, so not bothering.
	
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 20);
					var labelList = store.getLabelAttributes(items[0]);
					t.assertTrue(!dojo.isArray(labelList));
					t.assertTrue(labelList === null);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d;
			}
		},
		{
			name: 'testReadAPI_getValue_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getValue API
				// description:
				//		Simple test of the getValue API
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertEqual(item.node.nodeName, 'entry');
					var id = item.node.getElementsByTagName('id');
					t.assertEqual(id.length, 1);
					t.assertEqual(dojox.xml.parser.textContent(id[0]), 'http://shaneosullivan.wordpress.com/2008/01/22/using-aol-hosted-dojo-with-your-custom-code/');
					t.assertTrue(store.hasAttribute(item, 'content'));
					t.assertEqual(store.getValue(item, 'content').length, 6624);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_getValue_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getValue API
				// description:
				//		Simple test of the getValue API
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertEqual(item.node.nodeName, 'item');
					var link = item.node.getElementsByTagName('link');
					t.assertEqual(link.length, 3);
					t.assertEqual(dojox.xml.parser.textContent(link[0]), 'http://shaneosullivan.wordpress.com/2008/01/22/using-aol-hosted-dojo-with-your-custom-code/');
					t.assertTrue(store.hasAttribute(item, 'content'));
					t.assertEqual(store.getValue(item, 'content').length, 315);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_getValue_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getValue API
				// description:
				//		Simple test of the getValue API
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertEqual(item.node.nodeName, 'TR');
					var td = item.node.getElementsByTagName('td');
					t.assertEqual(td.length, 3);
					t.assertEqual(dojox.xml.parser.textContent(td[0]), '1');
					t.assertEqual(dojox.xml.parser.textContent(td[1]), 'Title of 1');
					t.assertEqual(dojox.xml.parser.textContent(td[2]), 'Author of 1');
					t.assertTrue(store.hasAttribute(item, 'content'));
					t.assertEqual(store.getValue(item, 'content').length, dojo.isIE?53:64);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_getValues_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getValues API
				// description:
				//		Simple test of the getValues API
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertEqual(item.node.nodeName, 'entry');
					t.assertTrue(store.hasAttribute(item, 'content'));
					var values = store.getValues(item,'content');
					t.assertEqual(1,values.length);
					t.assertEqual(store.getValue(item, 'content').length, 6624);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_getValues_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getValues API
				// description:
				//		Simple test of the getValues API
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertEqual(item.node.nodeName, 'item');
					t.assertTrue(store.hasAttribute(item, 'content'));
					var values = store.getValues(item,'content');
					t.assertEqual(1,values.length);
					t.assertEqual(store.getValue(item, 'content').length, 315);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_getValues_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getValues API
				// description:
				//		Simple test of the getValues API
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertEqual(item.node.nodeName, 'TR');
					t.assertTrue(store.hasAttribute(item, 'content'));
					var values = store.getValues(item,'content');
					t.assertEqual(1,values.length);
					t.assertEqual(store.getValue(item, 'content').length, dojo.isIE?53:64);
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_isItem_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the isItem API
				// description:
				//		Simple test of the isItem API
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
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
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_isItem_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the isItem API
				// description:
				//		Simple test of the isItem API
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
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
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_isItem_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the isItem API
				// description:
				//		Simple test of the isItem API
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
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
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_isItem_multistore',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the isItem API across multiple store instances.
				// description:
				//		Simple test of the isItem API across multiple store instances.
				var store1 = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
				var store2 = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();
	
				var d = new doh.Deferred();
				function onError(error, request) {
					d.errback(error);
				}
				function onComplete1(items, request) {
					t.assertEqual(20, items.length);
					var item1 = items[0];
					t.assertTrue(store1.isItem(item1));
	
					function onComplete2(items, request) {
						t.assertEqual(20, items.length);
						var item2 = items[0];
						t.assertTrue(store2.isItem(item2));
						t.assertTrue(!store1.isItem(item2));
						t.assertTrue(!store2.isItem(item1));
						d.callback(true);
					}
					store2.fetch({onComplete: onComplete2, onError: onError});
				}
				store1.fetch({onComplete: onComplete1, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_hasAttribute_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the hasAttribute API
				// description:
				//		Simple test of the hasAttribute API
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertTrue(store.hasAttribute(item,"content"));
					t.assertTrue(!store.hasAttribute(item,"summary"));
					t.assertTrue(!store.hasAttribute(item,"bob"));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_hasAttribute_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the hasAttribute API
				// description:
				//		Simple test of the hasAttribute API
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertTrue(store.hasAttribute(item,"content"));
					t.assertTrue(!store.hasAttribute(item,"summary"));
					t.assertTrue(!store.hasAttribute(item,"bob"));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_hasAttribute_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the hasAttribute API
				// description:
				//		Simple test of the hasAttribute API
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertTrue(store.hasAttribute(item,"content"));
					t.assertTrue(!store.hasAttribute(item,"summary"));
					t.assertTrue(!store.hasAttribute(item,"bob"));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_containsValue_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the containsValue API
				// description:
				//		Simple test of the containsValue API
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[19];
					t.assertTrue(store.containsValue(item,"content", '<div class=\'snap_preview\'><br /><p><a href="http://billhiggins.us/weblog/about/" target="_blank">Bill Higgins</a> of IBM has written a very well thought out article of why web applications should look and act like web applications, and not the desktop variety.  Well worth a read - <a href="http://billhiggins.us/weblog/2007/05/17/the-uncanny-valley-of-user-interface-design" target="_blank">http://billhiggins.us/weblog/2007/05/17/the-uncanny-valley-of-user-interface-design</a></p>\n\n<img alt="" border="0" src="http://feeds.wordpress.com/1.0/categories/shaneosullivan.wordpress.com/56/" /> <img alt="" border="0" src="http://feeds.wordpress.com/1.0/tags/shaneosullivan.wordpress.com/56/" /> <a rel="nofollow" href="http://feeds.wordpress.com/1.0/gocomments/shaneosullivan.wordpress.com/56/"><img alt="" border="0" src="http://feeds.wordpress.com/1.0/comments/shaneosullivan.wordpress.com/56/" /></a> <a rel="nofollow" href="http://feeds.wordpress.com/1.0/godelicious/shaneosullivan.wordpress.com/56/"><img alt="" border="0" src="http://feeds.wordpress.com/1.0/delicious/shaneosullivan.wordpress.com/56/" /></a> <a rel="nofollow" href="http://feeds.wordpress.com/1.0/gostumble/shaneosullivan.wordpress.com/56/"><img alt="" border="0" src="http://feeds.wordpress.com/1.0/stumble/shaneosullivan.wordpress.com/56/" /></a> <a rel="nofollow" href="http://feeds.wordpress.com/1.0/godigg/shaneosullivan.wordpress.com/56/"><img alt="" border="0" src="http://feeds.wordpress.com/1.0/digg/shaneosullivan.wordpress.com/56/" /></a> <a rel="nofollow" href="http://feeds.wordpress.com/1.0/goreddit/shaneosullivan.wordpress.com/56/"><img alt="" border="0" src="http://feeds.wordpress.com/1.0/reddit/shaneosullivan.wordpress.com/56/" /></a> <img alt="" border="0" src="http://stats.wordpress.com/b.gif?host=shaneosullivan.wordpress.com&blog=258432&post=56&subd=shaneosullivan&ref=&feed=1" /></div>'));
					t.assertTrue(!store.containsValue(item,"content", "bob"));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_containsValue_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the containsValue API
				// description:
				//		Simple test of the containsValue API
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[19];
					t.assertTrue(store.containsValue(item,"content", 'Bill Higgins of IBM has written a very well thought out article of why web applications should look and act like web applications, and not the desktop variety.  Well worth a read - http://billhiggins.us/weblog/2007/05/17/the-uncanny-valley-of-user-interface-design\n        (...)'));
					t.assertTrue(!store.containsValue(item,"content", "bob"));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_containsValue_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the containsValue API
				// description:
				//		Simple test of the containsValue API
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[19];
					var val = store.getValue(item, 'content').replace(/20/g, '19');
					item = items[18];
					// IE Strips the tabs out, so it has a different value.
					t.assertTrue(store.containsValue(item,"content", val));
					t.assertTrue(!store.containsValue(item,"content", "bob"));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_sortDescending_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the sorting API in descending order.
				// description:
				//		Simple test of the sorting API in descending order.
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
	
				//Comparison is done as a string type (toString comparison), so the order won't be numeric
				//So have to compare in 'alphabetic' order.
				var order = [	'http://shaneosullivan.wordpress.com/2007/07/25/why-is-my-web-page-slow-yslow-for-firebug-can-tell-you/',
							 	'http://shaneosullivan.wordpress.com/2007/08/23/dojo-event-performance-tip/',
							 	'http://shaneosullivan.wordpress.com/2007/10/18/upgrading-ubuntu-feisty-fawn-704-to-gutsy-gibbon-710/',
							 	'http://shaneosullivan.wordpress.com/2007/06/19/is-dojo-being-ignored-by-developers/',
							 	'http://shaneosullivan.wordpress.com/2007/08/22/dojo-09-released/',
							 	'http://shaneosullivan.wordpress.com/2007/08/17/dojo-theme-browser-shows-off-dijit-widgets/',
							 	'http://shaneosullivan.wordpress.com/2008/01/22/using-aol-hosted-dojo-with-your-custom-code/',
							 	'http://shaneosullivan.wordpress.com/2007/10/05/dojo-grid-has-landed/',
							 	'http://shaneosullivan.wordpress.com/2007/12/31/navigating-in-an-ie-modal-dialog/',
							 	'http://shaneosullivan.wordpress.com/2007/10/13/introducing-the-new-dojo-image-widgets/',
							 	'http://shaneosullivan.wordpress.com/2007/09/04/image-gallery-slideshow-and-flickr-data-source-for-dojo-09/',
							 	'http://shaneosullivan.wordpress.com/2007/09/22/querying-flickr-with-dojo/',
							 	'http://shaneosullivan.wordpress.com/2007/06/15/dojo-charting-example-to-show-website-statistics-2/',
							 	'http://shaneosullivan.wordpress.com/2007/10/04/a-tortoisesvn-replacement-for-ubuntu/',
							 	'http://shaneosullivan.wordpress.com/2007/07/03/flickr-and-dojo-image-gallery/',
							 	'http://shaneosullivan.wordpress.com/2007/05/22/greasemonkey-script-to-add-digg-like-links-to-posts/',
							 	'http://shaneosullivan.wordpress.com/2007/09/13/specifying-the-callback-function-with-the-flickr-json-apis/',
							 	'http://shaneosullivan.wordpress.com/2008/01/07/dojo-demo-engine-update/',
							 	'http://shaneosullivan.wordpress.com/2007/12/04/a-new-demo-engine-for-dojo/',
							 	'http://shaneosullivan.wordpress.com/2007/05/22/article-on-the-square-pegs-and-round-holes-of-desktop-and-web-applications/'];
				
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
	
					for(var i = 0; i < items.length; i++){
						var id = items[i].node.getElementsByTagName('id');
						t.assertEqual(id.length, 1);
						//console.debug(dojox.xml.parser.textContent(id[0]));
						t.assertEqual(order[i], dojox.xml.parser.textContent(id[0]));
					}
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
	
				var sortAttributes = [{attribute: 'content', descending: true}];
				store.fetch({sort: sortAttributes, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_sortDescending_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the sorting API in descending order.
				// description:
				//		Simple test of the sorting API in descending order.
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();
	
				//Comparison is done as a string type (toString comparison), so the order won't be numeric
				//So have to compare in 'alphabetic' order.
				var order = [	'http://shaneosullivan.wordpress.com/2007/07/25/why-is-my-web-page-slow-yslow-for-firebug-can-tell-you/',
							 	'http://shaneosullivan.wordpress.com/2007/08/23/dojo-event-performance-tip/',
							 	'http://shaneosullivan.wordpress.com/2007/10/18/upgrading-ubuntu-feisty-fawn-704-to-gutsy-gibbon-710/',
							 	'http://shaneosullivan.wordpress.com/2007/06/19/is-dojo-being-ignored-by-developers/',
							 	'http://shaneosullivan.wordpress.com/2007/10/05/dojo-grid-has-landed/',
							 	'http://shaneosullivan.wordpress.com/2007/08/22/dojo-09-released/',
							 	'http://shaneosullivan.wordpress.com/2007/08/17/dojo-theme-browser-shows-off-dijit-widgets/',
							 	'http://shaneosullivan.wordpress.com/2008/01/22/using-aol-hosted-dojo-with-your-custom-code/',
							 	'http://shaneosullivan.wordpress.com/2007/12/31/navigating-in-an-ie-modal-dialog/',
							 	'http://shaneosullivan.wordpress.com/2007/10/13/introducing-the-new-dojo-image-widgets/',
							 	'http://shaneosullivan.wordpress.com/2007/09/04/image-gallery-slideshow-and-flickr-data-source-for-dojo-09/',
							 	'http://shaneosullivan.wordpress.com/2007/09/22/querying-flickr-with-dojo/',
							 	'http://shaneosullivan.wordpress.com/2007/06/15/dojo-charting-example-to-show-website-statistics-2/',
							 	'http://shaneosullivan.wordpress.com/2007/10/04/a-tortoisesvn-replacement-for-ubuntu/',
							 	'http://shaneosullivan.wordpress.com/2007/07/03/flickr-and-dojo-image-gallery/',
							 	'http://shaneosullivan.wordpress.com/2007/05/22/greasemonkey-script-to-add-digg-like-links-to-posts/',
							 	'http://shaneosullivan.wordpress.com/2007/09/13/specifying-the-callback-function-with-the-flickr-json-apis/',
							 	'http://shaneosullivan.wordpress.com/2007/05/22/article-on-the-square-pegs-and-round-holes-of-desktop-and-web-applications/',
							 	'http://shaneosullivan.wordpress.com/2008/01/07/dojo-demo-engine-update/',
							 	'http://shaneosullivan.wordpress.com/2007/12/04/a-new-demo-engine-for-dojo/'];
				
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
	
					for(var i = 0; i < items.length; i++){
						var link = items[i].node.getElementsByTagName('link');
						t.assertEqual(link.length, 3);
						//console.debug(dojox.xml.parser.textContent(link[0]));
						t.assertEqual(order[i], dojox.xml.parser.textContent(link[0]));
					}
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
	
				var sortAttributes = [{attribute: 'content', descending: true}];
				store.fetch({sort: sortAttributes, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_sortDescending_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the sorting API in descending order.
				// description:
				//		Simple test of the sorting API in descending order.
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();
	
				//Comparison is done as a string type (toString comparison), so the order won't be numeric
				//So have to compare in 'alphabetic' order.
				var order = [	'Author of 9',
							 	'Author of 8',
							 	'Author of 7',
							 	'Author of 6',
							 	'Author of 5',
							 	'Author of 4',
							 	'Author of 3',
							 	'Author of 2',
							 	'Author of 20',
							 	'Author of 1',
							 	'Author of 19',
							 	'Author of 18',
							 	'Author of 17',
							 	'Author of 16',
							 	'Author of 15',
							 	'Author of 14',
							 	'Author of 13',
							 	'Author of 12',
							 	'Author of 11',
							 	'Author of 10'];
				
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
	
					for(var i = 0; i < items.length; i++){
						var td = items[i].node.getElementsByTagName('TD');
						t.assertEqual(td.length, 3);
						t.assertEqual(order[i], dojox.xml.parser.textContent(td[2]));
					}
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
	
				var sortAttributes = [{attribute: 'content', descending: true}];
				store.fetch({sort: sortAttributes, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_sortAscending_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the sorting API in descending order.
				// description:
				//		Simple test of the sorting API in descending order.
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
	
				//Comparison is done as a string type (toString comparison), so the order won't be numeric
				//So have to compare in 'alphabetic' order.
				var order = [	'http://shaneosullivan.wordpress.com/2007/05/22/article-on-the-square-pegs-and-round-holes-of-desktop-and-web-applications/',
								'http://shaneosullivan.wordpress.com/2007/12/04/a-new-demo-engine-for-dojo/',
								'http://shaneosullivan.wordpress.com/2008/01/07/dojo-demo-engine-update/',
								'http://shaneosullivan.wordpress.com/2007/09/13/specifying-the-callback-function-with-the-flickr-json-apis/',
								'http://shaneosullivan.wordpress.com/2007/05/22/greasemonkey-script-to-add-digg-like-links-to-posts/',
								'http://shaneosullivan.wordpress.com/2007/07/03/flickr-and-dojo-image-gallery/',
								'http://shaneosullivan.wordpress.com/2007/10/04/a-tortoisesvn-replacement-for-ubuntu/',
								'http://shaneosullivan.wordpress.com/2007/06/15/dojo-charting-example-to-show-website-statistics-2/',
								'http://shaneosullivan.wordpress.com/2007/09/22/querying-flickr-with-dojo/',
								'http://shaneosullivan.wordpress.com/2007/09/04/image-gallery-slideshow-and-flickr-data-source-for-dojo-09/',
								'http://shaneosullivan.wordpress.com/2007/10/13/introducing-the-new-dojo-image-widgets/',
								'http://shaneosullivan.wordpress.com/2007/12/31/navigating-in-an-ie-modal-dialog/',
								'http://shaneosullivan.wordpress.com/2007/10/05/dojo-grid-has-landed/',
								'http://shaneosullivan.wordpress.com/2008/01/22/using-aol-hosted-dojo-with-your-custom-code/',
								'http://shaneosullivan.wordpress.com/2007/08/17/dojo-theme-browser-shows-off-dijit-widgets/',
								'http://shaneosullivan.wordpress.com/2007/08/22/dojo-09-released/',
								'http://shaneosullivan.wordpress.com/2007/06/19/is-dojo-being-ignored-by-developers/',
								'http://shaneosullivan.wordpress.com/2007/10/18/upgrading-ubuntu-feisty-fawn-704-to-gutsy-gibbon-710/',
								'http://shaneosullivan.wordpress.com/2007/08/23/dojo-event-performance-tip/',
								'http://shaneosullivan.wordpress.com/2007/07/25/why-is-my-web-page-slow-yslow-for-firebug-can-tell-you/'];
				
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
	
					for(var i = 0; i < items.length; i++){
						var id = items[i].node.getElementsByTagName('id');
						t.assertEqual(id.length, 1);
						t.assertEqual(order[i], dojox.xml.parser.textContent(id[0]));
					}
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
	
				var sortAttributes = [{attribute: 'content'}];
				store.fetch({sort: sortAttributes, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_sortAscending_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the sorting API in descending order.
				// description:
				//		Simple test of the sorting API in descending order.
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();
	
				//Comparison is done as a string type (toString comparison), so the order won't be numeric
				//So have to compare in 'alphabetic' order.
				var order = [	'http://shaneosullivan.wordpress.com/2007/12/04/a-new-demo-engine-for-dojo/',
								'http://shaneosullivan.wordpress.com/2008/01/07/dojo-demo-engine-update/',
								'http://shaneosullivan.wordpress.com/2007/05/22/article-on-the-square-pegs-and-round-holes-of-desktop-and-web-applications/',
								'http://shaneosullivan.wordpress.com/2007/09/13/specifying-the-callback-function-with-the-flickr-json-apis/',
								'http://shaneosullivan.wordpress.com/2007/05/22/greasemonkey-script-to-add-digg-like-links-to-posts/',
								'http://shaneosullivan.wordpress.com/2007/07/03/flickr-and-dojo-image-gallery/',
								'http://shaneosullivan.wordpress.com/2007/10/04/a-tortoisesvn-replacement-for-ubuntu/',
								'http://shaneosullivan.wordpress.com/2007/06/15/dojo-charting-example-to-show-website-statistics-2/',
								'http://shaneosullivan.wordpress.com/2007/09/22/querying-flickr-with-dojo/',
								'http://shaneosullivan.wordpress.com/2007/09/04/image-gallery-slideshow-and-flickr-data-source-for-dojo-09/',
								'http://shaneosullivan.wordpress.com/2007/10/13/introducing-the-new-dojo-image-widgets/',
								'http://shaneosullivan.wordpress.com/2007/12/31/navigating-in-an-ie-modal-dialog/',
								'http://shaneosullivan.wordpress.com/2008/01/22/using-aol-hosted-dojo-with-your-custom-code/',
								'http://shaneosullivan.wordpress.com/2007/08/17/dojo-theme-browser-shows-off-dijit-widgets/',
								'http://shaneosullivan.wordpress.com/2007/08/22/dojo-09-released/',
								'http://shaneosullivan.wordpress.com/2007/10/05/dojo-grid-has-landed/',
								'http://shaneosullivan.wordpress.com/2007/06/19/is-dojo-being-ignored-by-developers/',
								'http://shaneosullivan.wordpress.com/2007/10/18/upgrading-ubuntu-feisty-fawn-704-to-gutsy-gibbon-710/',
								'http://shaneosullivan.wordpress.com/2007/08/23/dojo-event-performance-tip/',
								'http://shaneosullivan.wordpress.com/2007/07/25/why-is-my-web-page-slow-yslow-for-firebug-can-tell-you/'];
				
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
	
					for(var i = 0; i < items.length; i++){
						var link = items[i].node.getElementsByTagName('link');
						t.assertEqual(link.length, 3);
						t.assertEqual(order[i], dojox.xml.parser.textContent(link[0]));
					}
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
	
				var sortAttributes = [{attribute: 'content'}];
				store.fetch({sort: sortAttributes, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_sortAscending_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the sorting API in descending order.
				// description:
				//		Simple test of the sorting API in descending order.
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();
	
				//Comparison is done as a string type (toString comparison), so the order won't be numeric
				//So have to compare in 'alphabetic' order.
				var order = [	'Author of 10',
							 	'Author of 11',
							 	'Author of 12',
							 	'Author of 13',
							 	'Author of 14',
							 	'Author of 15',
							 	'Author of 16',
							 	'Author of 17',
							 	'Author of 18',
							 	'Author of 19',
							 	'Author of 1',
							 	'Author of 20',
							 	'Author of 2',
							 	'Author of 3',
							 	'Author of 4',
							 	'Author of 5',
							 	'Author of 6',
							 	'Author of 7',
							 	'Author of 8',
							 	'Author of 9'];
				
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
	
					for(var i = 0; i < items.length; i++){
						var td = items[i].node.getElementsByTagName('TD');
						t.assertEqual(td.length, 3);
						t.assertEqual(order[i], dojox.xml.parser.textContent(td[2]));
					}
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
	
				var sortAttributes = [{attribute: 'content'}];
				store.fetch({sort: sortAttributes, onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_isItemLoaded_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the isItemLoaded API
				// description:
				//		Simple test of the isItemLoaded API
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertTrue(store.isItemLoaded(item));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_isItemLoaded_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the isItemLoaded API
				// description:
				//		Simple test of the isItemLoaded API
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertTrue(store.isItemLoaded(item));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_isItemLoaded_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the isItemLoaded API
				// description:
				//		Simple test of the isItemLoaded API
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();
	
				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					t.assertTrue(store.isItemLoaded(item));
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_getFeatures',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getFeatures function of the store
				// description:
				//		Simple test of the getFeatures function of the store
	
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
				var features = store.getFeatures();
				t.assertTrue(dojo.isObject(features));
				t.assertTrue(features["dojo.data.api.Read"]);
				t.assertFalse(features["dojo.data.api.Identity"]);
				t.assertFalse(features["dojo.data.api.Write"]);
				t.assertFalse(features["dojo.data.api.Notification"]);
			}
		},
		{
			name: 'testReadAPI_getAttributes_atom',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getAttributes API
				// description:
				//		Simple test of the getAttributes API
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					var attributes = store.getAttributes(item);
					t.assertTrue(dojo.isArray(attributes));
					t.assertEqual(1,attributes.length);
					t.assertTrue(attributes[0] === 'content');
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_getAttributes_rss',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getAttributes API
				// description:
				//		Simple test of the getAttributes API
				var store = dojox.data.tests.stores.OpenSearchStore.getRSSStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					var attributes = store.getAttributes(item);
					t.assertTrue(dojo.isArray(attributes));
					t.assertEqual(1,attributes.length);
					t.assertTrue(attributes[0] === 'content');
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_getAttributes_html',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test of the getAttributes API
				// description:
				//		Simple test of the getAttributes API
				var store = dojox.data.tests.stores.OpenSearchStore.getHTMLStore();

				var d = new doh.Deferred();
				function onComplete(items, request) {
					t.assertEqual(20, items.length);
					var item = items[0];
					var attributes = store.getAttributes(item);
					t.assertTrue(dojo.isArray(attributes));
					t.assertEqual(1,attributes.length);
					t.assertTrue(attributes[0] === 'content');
					d.callback(true);
				}
				function onError(error, request) {
					d.errback(error);
				}
				store.fetch({onComplete: onComplete, onError: onError});
				return d; //Object
			}
		},
		{
			name: 'testReadAPI_functionConformance',
			timeout: 20000,
			runTest: function(t){
				// summary:
				//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
				// description:
				//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
	
				var store = dojox.data.tests.stores.OpenSearchStore.getAtomStore();
				var readApi = new dojo.data.api.Read();
				var passed = true;
	
				for(var i in readApi){
					var member = readApi[i];
					//Check that all the 'Read' defined functions exist on the test store.
					if(typeof member === "function"){
						var testStoreMember = store[i];
						if(!(typeof testStoreMember === "function")){
							console.log("Problem with function: [" + i + "]");
							passed = false;
							break;
						}
					}
				}
				t.assertTrue(passed);
			}
		}
	]
);

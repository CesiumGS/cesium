dojo.provide("dojox.data.tests.stores.AtomReadStore");
dojo.require("dojox.data.AtomReadStore");
dojo.require("dojo.data.api.Read");

dojox.data.tests.stores.AtomReadStore.getBlog1Store = function(){
	return new dojox.data.AtomReadStore({url: require.toUrl("dojox/data/tests/stores/atom1.xml").toString()});
	//return new dojox.data.AtomReadStore({url: "/sos/feeds/blog.php"});
};
/*
dojox.data.tests.stores.AtomReadStore.getBlog2Store = function(){
	return new dojox.data.AtomReadStore({url: dojo.moduleUrl("dojox.data.tests", "stores/atom2.xml").toString()});
};
*/
dojox.data.tests.stores.AtomReadStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.

	//console.log("In here.");
	//console.trace();
	d.errback(errData);
}

doh.register("dojox.data.tests.stores.AtomReadStore",
	[
		{
			name: "ReadAPI:  Fetch_One",
			timeout:	5000, //1 second
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on AtomReadStore of a single item.
				// description:
				//		Simple test of a basic fetch on AtomReadStore of a single item.

				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.is(1, items.length);
					d.callback(true);
				}
				atomStore.fetch({
					query: {
					},
					count: 1,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  Fetch_5_Streaming",
			timeout:	5000, //1 second.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on AtomReadStore.
				// description:
				//		Simple test of a basic fetch on AtomReadStore.
				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				var count = 0;

				function onItem(item, requestObj){
				  t.assertTrue(atomStore.isItem(item));
				  count++;
				}
				function onComplete(items, request){
					t.is(5, count);

					t.is(null, items);
					d.callback(true);
				}
				//Get everything...
				atomStore.fetch({
					query: {
					},
					onBegin: null,
					count: 5,
					onItem: onItem,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  Fetch_Paging",
			timeout:	5000, //1 second.
			runTest: function(t) {
				// summary:
				//		Test of multiple fetches on a single result.  Paging, if you will.
				// description:
				//		Test of multiple fetches on a single result.  Paging, if you will.

				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();
				var d = new doh.Deferred();
				
				function dumpFirstFetch(items, request){
					t.is(5, items.length);
					request.start = 3;
					request.count = 1;
					request.onComplete = dumpSecondFetch;
					atomStore.fetch(request);
				}

				function dumpSecondFetch(items, request){
					console.log("dumpSecondFetch: got "+items.length);
					t.is(1, items.length);
					request.start = 0;
					request.count = 5;
					request.onComplete = dumpThirdFetch;
					atomStore.fetch(request);
				}

				function dumpThirdFetch(items, request){
					console.log("dumpThirdFetch: got "+items.length);
					t.is(5, items.length);
					request.start = 2;
					request.count = 18;
					request.onComplete = dumpFourthFetch;
					atomStore.fetch(request);
				}

				function dumpFourthFetch(items, request){
					console.log("dumpFourthFetch: got "+items.length);
					t.is(18, items.length);
					request.start = 5;
					request.count = 11;
					request.onComplete = dumpFifthFetch;
					atomStore.fetch(request);
				}

				function dumpFifthFetch(items, request){
					console.log("dumpFifthFetch: got "+items.length);
					t.is(11, items.length);
					request.start = 4;
					request.count = 16;
					request.onComplete = dumpSixthFetch;
					atomStore.fetch(request);
				}

				function dumpSixthFetch(items, request){
					console.log("dumpSixthFetch: got "+items.length);
					t.is(16, items.length);
					d.callback(true);
				}

				function completed(items, request){
					t.is(7, items.length);
					request.start = 1;
					request.count = 5;
					request.onComplete = dumpFirstFetch;
					atomStore.fetch(request);
				}
				atomStore.fetch({
					query: {
					},
					count: 7,
					onComplete: completed,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getLabel",
			timeout:	5000, //1 second.
			runTest: function(t) {
				// summary:
				//		Simple test of the getLabel function against a store set that has a label defined.
				// description:
				//		Simple test of the getLabel function against a store set that has a label defined.

				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 1);
					var label = atomStore.getLabel(items[0]);
					t.assertTrue(label !== null);
					d.callback(true);
				}
				atomStore.fetch({
					query: {
					},
					count: 1,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
				});
				return d;
			}
		},
		{
			name: "ReadAPI:  getLabelAttributes",
			timeout:	5000, //1 second
			runTest: function(t) {
				// summary:
				//		Simple test of the getLabelAttributes function against a store set that has a label defined.
				// description:
				//		Simple test of the getLabelAttributes function against a store set that has a label defined.
				
				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 1);
					var labelList = atomStore.getLabelAttributes(items[0]);
					t.assertTrue(dojo.isArray(labelList));
					t.assertEqual("title", labelList[0]);
					d.callback(true);
				}
				atomStore.fetch({
					query: {
					},
					count: 1,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
				});
				return d;
							
			}
		},
		{
			name: "ReadAPI:  getValue",
			timeout:	5000, //1 second
			runTest: function(t) {
				// summary:
				//		Simple test of the getValue function of the store.
				// description:
				//		Simple test of the getValue function of the store.
				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function completedAll(items){
					t.is(1, items.length);
					t.assertTrue(atomStore.getValue(items[0], "summary") !== null);
					t.assertTrue(atomStore.getValue(items[0], "content") !== null);
					t.assertTrue(atomStore.getValue(items[0], "published") !== null);
					t.assertTrue(atomStore.getValue(items[0], "updated") !== null);
					console.log("typeof updated = "+typeof(atomStore.getValue(items[0], "updated")));
					t.assertTrue(atomStore.getValue(items[0], "updated").getFullYear);
					d.callback(true);
				}

				//Get one item and look at it.
				atomStore.fetch({
					query: {
					},
					count: 1,
					onComplete: completedAll,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getValue_Failure",
			timeout:	5000, //1 second
			runTest: function(t) {
				// summary:
				//		Simple test of the getValue function of the store.
				// description:
				//		Simple test of the getValue function of the store.
				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();
				var passed = false;
				try{
					var value = atomStore.getValue("NotAnItem", "foo");
				}catch(e){
					passed = true;
				}
				t.assertTrue(passed);
			}
		},
		{
			name: "ReadAPI:  getValues",
			timeout:	5000, //1 second
			runTest: function(t) {
				// summary:
				//		Simple test of the getValue function of the store.
				// description:
				//		Simple test of the getValue function of the store.
				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function completedAll(items){
					t.is(1, items.length);
					var summary = atomStore.getValues(items[0], "summary");
					t.assertTrue(dojo.isArray(summary));

					var content = atomStore.getValues(items[0], "content");
					t.assertTrue(dojo.isArray(content));

					var published = atomStore.getValues(items[0], "published");
					t.assertTrue(dojo.isArray(published));

					var updated = atomStore.getValues(items[0], "updated");
					t.assertTrue(dojo.isArray(updated));
					d.callback(true);
				}
				//Get one item and look at it.
				atomStore.fetch({
					query: {
					},
					count: 1,
					onComplete: completedAll,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error,
					t,
					d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getValues_Failure",
			timeout:	5000, //1 second
			runTest: function(t) {
				// summary:
				//		Simple test of the getValue function of the store.
				// description:
				//		Simple test of the getValue function of the store.
				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();
				var passed = false;
				try{
					var value = atomStore.getValues("NotAnItem", "foo");
				}catch(e){
					passed = true;
				}
				t.assertTrue(passed);
			}
		},
		{
			name: "ReadAPI:  isItem",
			timeout:	5000, //1 second
			runTest: function(t) {
				// summary:
				//		Simple test of the isItem function of the store
				// description:
				//		Simple test of the isItem function of the store
				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function completedAll(items){
					t.is(5, items.length);
					for(var i=0; i < items.length; i++){
						t.assertTrue(atomStore.isItem(items[i]));
					}
					d.callback(true);
				}

				//Get everything...
				atomStore.fetch({
						query: {
						},
						count: 5,
						onComplete: completedAll,
						onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
					});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  hasAttribute",
			timeout:	5000, //1 second
			runTest: function(t) {
				// summary:
				//		Simple test of the hasAttribute function of the store
				// description:
				//		Simple test of the hasAttribute function of the store

				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function onComplete(items){
					t.is(1, items.length);
					t.assertTrue(items[0] !== null);
					var count = 0;
					console.log("hasAttribute");
					t.assertTrue(atomStore.hasAttribute(items[0], "author"));
					t.assertTrue(atomStore.hasAttribute(items[0], "published"));
					t.assertTrue(atomStore.hasAttribute(items[0], "updated"));
					t.assertTrue(atomStore.hasAttribute(items[0], "category"));
					t.assertTrue(atomStore.hasAttribute(items[0], "id"));
					t.assertTrue(!atomStore.hasAttribute(items[0], "foo"));
					t.assertTrue(!atomStore.hasAttribute(items[0], "bar"));
					
					
					t.assertTrue(atomStore.hasAttribute(items[0], "summary"));
					t.assertTrue(atomStore.hasAttribute(items[0], "content"));
					t.assertTrue(atomStore.hasAttribute(items[0], "title"));
					
					
					var summary = atomStore.getValue(items[0], "summary");
					var content = atomStore.getValue(items[0], "content");
					var title = atomStore.getValue(items[0], "title");
										
					t.assertTrue(summary && summary.text && summary.type == "html");
					t.assertTrue(content && content.text && content.type == "html");
					t.assertTrue(title && title.text && title.type == "html");

					//Test that null attributes throw an exception
					try{
						atomStore.hasAttribute(items[0], null);
						t.assertTrue(false);
					}catch (e){
						
					}
					d.callback(true);
				}

				//Get one item...
				atomStore.fetch({
					query: {
					},
					count: 1,
						onComplete: onComplete,
						onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  containsValue",
			timeout:	5000, //1 second
			runTest: function(t) {
				// summary:
				//		Simple test of the containsValue function of the store
				// description:
				//		Simple test of the containsValue function of the store

				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function onComplete(items){
					t.is(1, items.length);

					t.assertTrue(atomStore.containsValue(items[0], "id","http://shaneosullivan.wordpress.com/2008/01/22/using-aol-hosted-dojo-with-your-custom-code/"));

					d.callback(true);
				}

				//Get one item...
				atomStore.fetch({
					query: {
					},
					count: 1,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getAttributes",
			timeout:	5000, //1 second
			runTest: function(t) {
				// summary:
				//		Simple test of the getAttributes function of the store
				// description:
				//		Simple test of the getAttributes function of the store

				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function onComplete(items){
					t.is(1, items.length);
					t.assertTrue(atomStore.isItem(items[0]));

					var attributes = atomStore.getAttributes(items[0]);
					console.log("getAttributes 4: "+attributes.length);
					t.is(10, attributes.length);
					d.callback(true);
				}

				//Get everything...
				atomStore.fetch({
						query: {
						},
						count: 1,
						onComplete: onComplete,
						onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
					});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  fetch_Category",
			timeout:	5000, //1 second.
			runTest: function(t) {
				// summary:
				//		Retrieve items from the store by category
				// description:
				//		Simple test of the getAttributes function of the store

				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function onComplete(items){
					t.is(2, items.length);
					t.assertTrue(atomStore.isItem(items[0]));
					t.assertTrue(atomStore.isItem(items[1]));

					var categories = atomStore.getValues(items[0], "category");
					t.assertTrue(dojo.some(categories, function(category){
						return category.term == "aol";
					}));
					categories = atomStore.getValues(items[1], "category");
					t.assertTrue(dojo.some(categories, function(category){
						return category.term == "aol";
					}));

					d.callback(true);
				}

				//Get everything...
				atomStore.fetch({
					query: {
						category: "aol"
					},
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  fetch_byID",
			timeout:	5000, //1 second.
			runTest: function(t) {
				// summary:
				//		Retrieve items from the store by category
				// description:
				//		Simple test of the getAttributes function of the store

				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function onComplete(items){
					console.log("getById: items.length="+items.length)
					t.is(1, items.length);
					t.assertTrue(atomStore.isItem(items[0]));

					var title = atomStore.getValue(items[0], "title");
					console.log("getById: title.text="+title.text)
					t.assertTrue(title.text == "Dojo Grid has landed");

					d.callback(true);
				}

				//Get everything...
				atomStore.fetch({
					query: {
						id: "http://shaneosullivan.wordpress.com/2007/10/05/dojo-grid-has-landed/"
					},
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  fetch_alternate",
			timeout:	5000, //1 second.
			runTest: function(t) {
				// summary:
				//		Retrieve items from the store by category
				// description:
				//		Simple test of the getAttributes function of the store

				var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

				var d = new doh.Deferred();
				function onComplete(items){
					t.is(1, items.length);
					t.assertTrue(atomStore.isItem(items[0]));

					var alternate = atomStore.getValue(items[0], "alternate");
					t.assertEqual(alternate.href, "http://shaneosullivan.wordpress.com/2007/10/05/dojo-grid-has-landed/");

					d.callback(true);
				}

				//Get everything...
				atomStore.fetch({
					query: {
						id: "http://shaneosullivan.wordpress.com/2007/10/05/dojo-grid-has-landed/"
					},
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.AtomReadStore.error, t, d)
				});
				return d; //Object
			}
		},
		function testReadAPI_getFeatures(t){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store

			var atomStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();

			var features = atomStore.getFeatures();
			var count = 0;
			for(i in features){
				t.assertTrue((i === "dojo.data.api.Read"));
				count++;
			}
			t.assertTrue(count === 1);
		},
		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = dojox.data.tests.stores.AtomReadStore.getBlog1Store();
			var readApi = new dojo.data.api.Read();
			var passed = true;

			for(i in readApi){
				if(i.toString().charAt(0) !== '_')
				{
					var member = readApi[i];
					//Check that all the 'Read' defined functions exist on the test store.
					if(typeof member === "function"){
						console.log("Looking at function: [" + i + "]");
						var testStoreMember = testStore[i];
						if(!(typeof testStoreMember === "function")){
							console.log("Problem with function: [" + i + "].   Got value: " + testStoreMember);
							passed = false;
							break;
						}
					}
				}
			}
			t.assertTrue(passed);
		}
	]
);

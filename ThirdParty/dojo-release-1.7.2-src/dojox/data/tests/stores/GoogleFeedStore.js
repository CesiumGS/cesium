dojo.provide("dojox.data.tests.stores.GoogleFeedStore");
dojo.require("dojox.data.GoogleFeedStore");
dojo.require("dojo.data.api.Read");

dojox.data.tests.stores.GoogleFeedStore.getStore = function(){
	return new dojox.data.GoogleFeedStore();
};

dojox.data.tests.stores.GoogleFeedStore.error = function(t, d, errData){
	//  summary:
	//		The error callback function to be used for all of the tests.
	//console.trace();
	d.errback(errData);
};

doh.register("dojox.data.tests.stores.GoogleFeedStore",
	[
		{
			name: "ReadAPI:  Fetch_One",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of a basic fetch on GoogleFeedStore of a single item.
				//	description:
				//		Simple test of a basic fetch on GoogleFeedStore of a single item.

				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.is(1, items.length);
					d.callback(true);
				}
				googleStore.fetch({
					query: {
						url: "http://shaneosullivan.wordpress.com/feed"
					},
					count: 1,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  test_Invalid_Query",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of a basic fetch on GoogleFeedStore of a single item.
				//	description:
				//		Simple test of a basic fetch on GoogleFeedStore of a single item.

				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

				var d = new doh.Deferred();
				function doNotCall1(items, request){
					t.assertTrue(false);
					d.callback(true);
				}
				function doNotCall2(items, request){
					t.assertTrue(false);
					d.callback(true);
				}
				function doNotCall3(items, request){
					t.assertTrue(false);
					d.callback(true);
				}
				try {
					googleStore.fetch({
						query: {
						},
						count: 1,
						onItem:doNotCall2,
						onBegin: doNotCall1,
						onComplete: doNotCall3,
						onError: function(){
							//Swallow this as it is expected
							d.callback(true);
						}
					});
				} catch (e) {
					console.log("exception thrown", e);
					t.assertTrue(false);
					d.callback(true);
				}
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  Fetch_20_Streaming",
			timeout:	10000, //20 seconds.
			runTest: function(t) {
				//	summary:
				//		Simple test of a basic fetch on GoogleFeedStore.
				//	description:
				//		Simple test of a basic fetch on GoogleFeedStore.
				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

				var d = new doh.Deferred();
				var count = 0;

				function onItem(item, requestObj){
					t.assertTrue(googleStore.isItem(item));
					count++;
				}
				function onComplete(items, request){
					t.is(20, count);

					t.is(null, items);
					d.callback(true);
				}
				//Get everything...
				googleStore.fetch({
					query: {
						url: "http://shaneosullivan.wordpress.com/feed"
					},
					onBegin: null,
					count: 20,
					onItem: onItem,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  Fetch_Paging",
			timeout:	10000, // 10 seconds.
			runTest: function(t) {
				//	summary:
				//		Test of multiple fetches on a single result.  Paging, if you will.
				//	description:
				//		Test of multiple fetches on a single result.  Paging, if you will.

				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();
				var d = new doh.Deferred();

				function dumpSixthFetch(items, request){
					t.is(16, items.length);
					d.callback(true);
				}

				function dumpFifthFetch(items, request){
					t.is(11, items.length);
					request.start = 4;
					request.count = 16;
					request.onComplete = dumpSixthFetch;
					googleStore.fetch(request);
				}

				function dumpFourthFetch(items, request){
					t.is(18, items.length);
					request.start = 5;
					request.count = 11;
					request.onComplete = dumpFifthFetch;
					googleStore.fetch(request);
				}

				function dumpThirdFetch(items, request){
					t.is(5, items.length);
					request.start = 2;
					request.count = 18;
					request.onComplete = dumpFourthFetch;
					googleStore.fetch(request);
				}

				function dumpSecondFetch(items, request){
					t.is(1, items.length);
					request.start = 0;
					request.count = 5;
					request.onComplete = dumpThirdFetch;
					googleStore.fetch(request);
				}
				
				function dumpFirstFetch(items, request){
					t.is(5, items.length);
					request.start = 3;
					request.count = 1;
					request.onComplete = dumpSecondFetch;
					googleStore.fetch(request);
				}

				function completed(items, request){
					t.is(7, items.length);
					d.callback(true);
				}
				googleStore.fetch({
					query: {
						url: "http://shaneosullivan.wordpress.com/feed"
					},
					count: 7,
					onComplete: completed,
					onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getLabel",
			timeout:	10000, // 10 seconds.
			runTest: function(t) {
				//	summary:
				//		Simple test of the getLabel function against a store set that has a label defined.
				//	description:
				//		Simple test of the getLabel function against a store set that has a label defined.

				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 1);
					var label = googleStore.getLabel(items[0]);
					t.assertTrue(label !== null);
					d.callback(true);
				}
				googleStore.fetch({
					query: {
						url: "http://shaneosullivan.wordpress.com/feed"
					},
					count: 1,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error, t, d)
				});
				return d;
			}
		},
		{
			name: "ReadAPI:  getLabelAttributes",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of the getLabelAttributes function against a store set that has a label defined.
				//	description:
				//		Simple test of the getLabelAttributes function against a store set that has a label defined.

				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 1);
					var labelList = googleStore.getLabelAttributes(items[0]);
					t.assertTrue(dojo.isArray(labelList));
					t.assertEqual("titleNoFormatting", labelList[0]);
					d.callback(true);
				}
				googleStore.fetch({
					query: {
						url: "http://shaneosullivan.wordpress.com/feed"
					},
					count: 1,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error, t, d)
				});
				return d;
			}
		},
		{
			name: "ReadAPI:  getValue",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of the getValue function of the store.
				//	description:
				//		Simple test of the getValue function of the store.
				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

				var d = new doh.Deferred();
				function completedAll(items){
					t.is(1, items.length);
					t.assertTrue(googleStore.getValue(items[0], "unescapedUrl") !== null);
					t.assertTrue(googleStore.getValue(items[0], "url") !== null);
					t.assertTrue(googleStore.getValue(items[0], "visibleUrl") !== null);
					t.assertTrue(googleStore.getValue(items[0], "cacheUrl") !== null);
					t.assertTrue(googleStore.getValue(items[0], "title") !== null);
					t.assertTrue(googleStore.getValue(items[0], "titleNoFormatting") !== null);
					t.assertTrue(googleStore.getValue(items[0], "content") !== null);
					d.callback(true);
				}

				//Get one item and look at it.
				googleStore.fetch({
					query: {
						url: "http://shaneosullivan.wordpress.com/feed"
					},
					count: 1,
					onComplete: completedAll,
					onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error, t, d)});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getValue_Failure",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of the getValue function of the store.
				//	description:
				//		Simple test of the getValue function of the store.
				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();
				var passed = false;
				try{
					var value = googleStore.getValue("NotAnItem", "foo");
				}catch(e){
					passed = true;
				}
				t.assertTrue(passed);
			}
		},
		{
			name: "ReadAPI:  getValues",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of the getValue function of the store.
				//	description:
				//		Simple test of the getValue function of the store.
				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

                var d = new doh.Deferred();
				function completedAll(items){
					t.is(1, items.length);
					var summary = googleStore.getValues(items[0], "unescapedUrl");
					t.assertTrue(dojo.isArray(summary));

					var url = googleStore.getValues(items[0], "url");
					t.assertTrue(dojo.isArray(url));

					var published = googleStore.getValues(items[0], "visibleUrl");
					t.assertTrue(dojo.isArray(published));

					var updated = googleStore.getValues(items[0], "cacheUrl");
					t.assertTrue(dojo.isArray(updated));

					var title = googleStore.getValues(items[0], "title");
					t.assertTrue(dojo.isArray(title));

					var titleNoFormatting = googleStore.getValues(items[0], "titleNoFormatting");
					t.assertTrue(dojo.isArray(titleNoFormatting));

					var content = googleStore.getValues(items[0], "content");
					t.assertTrue(dojo.isArray(content));

					d.callback(true);
				}
				//Get one item and look at it.
				googleStore.fetch({
					query: {
						url: "http://shaneosullivan.wordpress.com/feed"
					},
					count: 1,
					onComplete: completedAll,
					onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error,
					t,
					d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getValues_Failure",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of the getValue function of the store.
				//	description:
				//		Simple test of the getValue function of the store.
				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();
				var passed = false;
				try{
					var value = googleStore.getValues("NotAnItem", "foo");
				}catch(e){
					passed = true;
				}
				t.assertTrue(passed);
			}
		},
		{
			name: "ReadAPI:  isItem",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of the isItem function of the store
				//	description:
				//		Simple test of the isItem function of the store
				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

				var d = new doh.Deferred();
				function completedAll(items){
					t.is(5, items.length);
					for(var i=0; i < items.length; i++){
						t.assertTrue(googleStore.isItem(items[i]));
					}
					d.callback(true);
				}

				//Get everything...
				googleStore.fetch({
						query: {
							url: "http://shaneosullivan.wordpress.com/feed"
						},
						count: 5,
						onComplete: completedAll,
						onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error, t, d)
					});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  hasAttribute",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of the hasAttribute function of the store
				//	description:
				//		Simple test of the hasAttribute function of the store

				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

				var d = new doh.Deferred();
				function onComplete(items){
					t.is(1, items.length);
					t.assertTrue(items[0] !== null);
					var count = 0;
					t.assertTrue(googleStore.hasAttribute(items[0], "title"));
					t.assertTrue(googleStore.hasAttribute(items[0], "link"));
					t.assertTrue(googleStore.hasAttribute(items[0], "content"));
					t.assertTrue(googleStore.hasAttribute(items[0], "author"));
					t.assertTrue(googleStore.hasAttribute(items[0], "published"));
					t.assertTrue(googleStore.hasAttribute(items[0], "categories"));
					t.assertTrue(!googleStore.hasAttribute(items[0], "I dont exist"));

					//Test that null attributes throw an exception
					try{
						googleStore.hasAttribute(items[0], null);
						t.assertTrue(false);
					}catch (e){

					}
					d.callback(true);
				}

				//Get one item...
				googleStore.fetch({
					query: {
						url: "http://shaneosullivan.wordpress.com/feed"
					},
					count: 1,
						onComplete: onComplete,
						onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  containsValue",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of the containsValue function of the store
				//	description:
				//		Simple test of the containsValue function of the store

				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

				var d = new doh.Deferred();
				function onComplete(items){
					t.is(1, items.length);

					// This is the only way to test the results, as we cannot depend on the search
					// result with a hard coded value.
					t.assertTrue(googleStore.containsValue(items[0], "link", items[0].link));

					d.callback(true);
				}

				//Get one item...
				googleStore.fetch({
					query: {
						url: "http://shaneosullivan.wordpress.com/feed"
					},
					count: 1,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getAttributes",
			timeout:	10000, // 10 seconds
			runTest: function(t) {
				//	summary:
				//		Simple test of the getAttributes function of the store
				//	description:
				//		Simple test of the getAttributes function of the store

				var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

				var d = new doh.Deferred();
				function onComplete(items){
					console.log("items.length = " + items.length);
					t.is(1, items.length);
					t.assertTrue(googleStore.isItem(items[0]));

					var attributes = googleStore.getAttributes(items[0]);

					console.log("attributes.length = " + attributes.length, attributes);
					t.is(7, attributes.length);
					d.callback(true);
				}

				//Get everything...
				googleStore.fetch({
						query: {
							url: "http://shaneosullivan.wordpress.com/feed"
						},
						count: 1,
						onComplete: onComplete,
						onError: dojo.partial(dojox.data.tests.stores.GoogleFeedStore.error, t, d)
					});
				return d; //Object
			}
		},
		function testReadAPI_getFeatures(t){
			//	summary:
			//		Simple test of the getFeatures function of the store
			//	description:
			//		Simple test of the getFeatures function of the store

			var googleStore = dojox.data.tests.stores.GoogleFeedStore.getStore();

			var features = googleStore.getFeatures();
			var count = 0;
			var i;
			for(i in features){
				t.assertTrue((i === "dojo.data.api.Read"));
				count++;
			}
			t.assertTrue(count === 1);
		},
		function testReadAPI_functionConformance(t){
			//	summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			//	description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = dojox.data.tests.stores.GoogleFeedStore.getStore();
			var readApi = new dojo.data.api.Read();
			var passed = true;
			var i;
			for(i in readApi){
				if(i.toString().charAt(0) !== '_')
				{
					var member = readApi[i];
					//Check that all the 'Read' defined functions exist on the test store.
					if(typeof member === "function"){
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

dojo.provide("dojox.data.tests.stores.FlickrRestStore");
dojo.require("dojox.data.FlickrRestStore");
dojo.require("dojo.data.api.Read");


dojox.data.tests.stores.FlickrRestStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	d.errback(errData);
};

doh.register("dojox.data.tests.stores.FlickrRestStore",
	[
		{
			name: "ReadAPI:  Fetch_One",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on FlickrRestStore of a single item.
				// description:
				//		Simple test of a basic fetch on FlickrRestStore of a single item.

				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.is(1, items.length);
					d.callback(true);
				}
				flickrStore.fetch({
					query: {
						userid: "44153025@N00",
						apikey: "8c6803164dbc395fb7131c9d54843627"
					},
					count: 1,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  Fetch_20_Streaming",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on FlickrRestStore.
				// description:
				//		Simple test of a basic fetch on FlickrRestStore.
				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				var count = 0;

				function onItem(item, requestObj){
				  t.assertTrue(flickrStore.isItem(item));
				  count++;
				}
				function onComplete(items, request){
					t.is(5, count);
					
					t.is(null, items);
					d.callback(true);
				}
				//Get everything...
				flickrStore.fetch({
					query: {
						userid: "44153025@N00",
						apikey: "8c6803164dbc395fb7131c9d54843627"
					},
					onBegin: null,
					count: 5,
					onItem: onItem,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  Fetch_Paging",
			timeout:	30000, //30 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Test of multiple fetches on a single result.  Paging, if you will.
				// description:
				//		Test of multiple fetches on a single result.  Paging, if you will.

				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				function dumpFirstFetch(items, request){
					t.is(5, items.length);
					request.start = 3;
					request.count = 1;
					request.onComplete = dumpSecondFetch;
					flickrStore.fetch(request);
				}

				function dumpSecondFetch(items, request){
					t.is(1, items.length);
					request.start = 0;
					request.count = 5;
					request.onComplete = dumpThirdFetch;
					flickrStore.fetch(request);
				}

				function dumpThirdFetch(items, request){
					t.is(5, items.length);
					request.start = 2;
					request.count = 18;
					request.onComplete = dumpFourthFetch;
					flickrStore.fetch(request);
				}

				function dumpFourthFetch(items, request){
					t.is(18, items.length);
					request.start = 9;
					request.count = 11;
					request.onComplete = dumpFifthFetch;
					flickrStore.fetch(request);
				}

				function dumpFifthFetch(items, request){
					t.is(11, items.length);
					request.start = 4;
					request.count = 16;
					request.onComplete = dumpSixthFetch;
					flickrStore.fetch(request);
				}

				function dumpSixthFetch(items, request){
					t.is(16, items.length);
					d.callback(true);
				}

				function completed(items, request){
					t.is(7, items.length);
					request.start = 1;
					request.count = 5;
					request.onComplete = dumpFirstFetch;
					flickrStore.fetch(request);
				}
				flickrStore.fetch({
					query: {
						userid: "44153025@N00",
						apikey: "8c6803164dbc395fb7131c9d54843627"
					},
					count: 7,
					onComplete: completed,
					onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getLabel",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of the getLabel function against a store set that has a label defined.
				// description:
				//		Simple test of the getLabel function against a store set that has a label defined.

				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 1);
					var label = flickrStore.getLabel(items[0]);
					t.assertTrue(label !== null);
					d.callback(true);
				}
				flickrStore.fetch({
					query: {
						userid: "44153025@N00",
						apikey: "8c6803164dbc395fb7131c9d54843627"
					},
					count: 1,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error, t, d)
				});
				return d;
			}
		},
		{
			name: "ReadAPI:  getLabelAttributes",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of the getLabelAttributes function against a store set that has a label defined.
				// description:
				//		Simple test of the getLabelAttributes function against a store set that has a label defined.

				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 1);
					var labelList = flickrStore.getLabelAttributes(items[0]);
					t.assertTrue(dojo.isArray(labelList));
					t.assertEqual("title", labelList[0]);
					d.callback(true);
				}
				flickrStore.fetch({
									query: {
										userid: "44153025@N00",
										apikey: "8c6803164dbc395fb7131c9d54843627"
									},
									count: 1,
									onComplete: onComplete,
									onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error, t, d)
								});
				return d;
			}
		},
		{
			name: "ReadAPI:  getValue",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of the getValue function of the store.
				// description:
				//		Simple test of the getValue function of the store.
				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				function completedAll(items){
					t.is(1, items.length);
					t.assertTrue(flickrStore.getValue(items[0], "title") !== null);
					t.assertTrue(flickrStore.getValue(items[0], "imageUrl") !== null);
					t.assertTrue(flickrStore.getValue(items[0], "imageUrlSmall") !== null);
					t.assertTrue(flickrStore.getValue(items[0], "imageUrlMedium") !== null);
					d.callback(true);
				}

				//Get one item and look at it.
				flickrStore.fetch({
								query: {
									userid: "44153025@N00",
									apikey: "8c6803164dbc395fb7131c9d54843627"
								},
								count: 1,
								onComplete: completedAll,
								onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error, t, d)});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getValues",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of the getValue function of the store.
				// description:
				//		Simple test of the getValue function of the store.
				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				function completedAll(items){
					t.is(1, items.length);
					var title = flickrStore.getValues(items[0], "title");
					t.assertTrue(title instanceof Array);
					
					var imgUrl = flickrStore.getValues(items[0], "imageUrl");
					t.assertTrue(imgUrl instanceof Array);
					
					var imgUrlSmall = flickrStore.getValues(items[0], "imageUrlSmall");
					t.assertTrue(imgUrlSmall instanceof Array);
					
					var imgUrlMedium = flickrStore.getValues(items[0], "imageUrlMedium");
					t.assertTrue(imgUrlMedium instanceof Array);
					d.callback(true);
				}
				//Get one item and look at it.
				flickrStore.fetch({
							query: {
								userid: "44153025@N00",
								apikey: "8c6803164dbc395fb7131c9d54843627"
							},
							count: 1,
							onComplete: completedAll,
							onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error,
							t,
							d)});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  isItem",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of the isItem function of the store
				// description:
				//		Simple test of the isItem function of the store
				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				function completedAll(items){
					t.is(5, items.length);
					for(var i=0; i < items.length; i++){
						t.assertTrue(flickrStore.isItem(items[i]));
					}
					d.callback(true);
				}

				//Get everything...
				flickrStore.fetch({
						query: {
							userid: "44153025@N00",
							apikey: "8c6803164dbc395fb7131c9d54843627"
						},
						count: 5,
						onComplete: completedAll,
						onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error, t, d)
					});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  hasAttribute",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of the hasAttribute function of the store
				// description:
				//		Simple test of the hasAttribute function of the store

				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				function onComplete(items){
					t.is(1, items.length);
					t.assertTrue(items[0] !== null);
					t.assertTrue(flickrStore.hasAttribute(items[0], "title"));
					t.assertTrue(flickrStore.hasAttribute(items[0], "author"));
					t.assertTrue(!flickrStore.hasAttribute(items[0], "Nothing"));
					t.assertTrue(!flickrStore.hasAttribute(items[0], "Text"));

					//Test that null attributes throw an exception
					var passed = false;
					try{
						flickrStore.hasAttribute(items[0], null);
					}catch (e){
						passed = true;
					}
					t.assertTrue(passed);
					d.callback(true);
				}

				//Get one item...
				flickrStore.fetch({
					query: {
						userid: "44153025@N00",
						apikey: "8c6803164dbc395fb7131c9d54843627"
					},
					count: 1,
						onComplete: onComplete,
						onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error, t, d)
				});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  containsValue",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of the containsValue function of the store
				// description:
				//		Simple test of the containsValue function of the store

				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				function onComplete(items){
					t.is(1, items.length);
					d.callback(true);
				}

				//Get one item...
				flickrStore.fetch({
									query: {
										userid: "44153025@N00",
										apikey: "8c6803164dbc395fb7131c9d54843627"
									},
									count: 1,
									onComplete: onComplete,
									onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error, t, d)
								});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getAttributes",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of the getAttributes function of the store
				// description:
				//		Simple test of the getAttributes function of the store

				var flickrStore = new dojox.data.FlickrRestStore();

				var d = new doh.Deferred();
				function onComplete(items){
					t.is(1, items.length);
					t.assertTrue(flickrStore.isItem(items[0]));

					var attributes = flickrStore.getAttributes(items[0]);
					t.is(11, attributes.length);
					d.callback(true);
				}

				//Get everything...
				flickrStore.fetch({
						query: {
							userid: "44153025@N00",
							apikey: "8c6803164dbc395fb7131c9d54843627"
						},
						count: 1,
						onComplete: onComplete,
						onError: dojo.partial(dojox.data.tests.stores.FlickrRestStore.error, t, d)
					});
				return d; //Object
			}
		},
		function testReadAPI_getFeatures(t){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store

			var flickrStore = new dojox.data.FlickrRestStore();

			var features = flickrStore.getFeatures();
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

			var testStore = new dojox.data.FlickrRestStore();
			var readApi = new dojo.data.api.Read();
			var passed = true;

			for(i in readApi){
				if(i.toString().charAt(0) !== '_')
				{
					var member = readApi[i];
					//Check that all the 'Read' defined functions exist on the test store.
					if(typeof member === "function"){
						var testStoreMember = testStore[i];
						if(!(typeof testStoreMember === "function")){
							passed = false;
							break;
						}
					}
				}
			}
		}
	]
);


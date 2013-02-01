dojo.provide("dojox.data.tests.stores.SnapLogicStore");
dojo.require("dojox.data.SnapLogicStore");
dojo.require("dojo.data.api.Read");

dojox.data.tests.stores.SnapLogicStore.pipelineUrl = require.toUrl("dojox/data/tests/stores/snap_pipeline.php").toString();
dojox.data.tests.stores.SnapLogicStore.pipelineSize = 14;
dojox.data.tests.stores.SnapLogicStore.attributes = ["empno", "ename", "job", "hiredate", "sal", "comm", "deptno"];

dojox.data.tests.stores.SnapLogicStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	d.errback(errData);
};

doh.register("dojox.data.tests.stores.SnapLogicStore",
	[
	    {
			name: "ReadAPI:  Fetch One",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch from a SnapLogic pipeline
				// description:
				//		Simple test of a basic fetch from a SnapLogic pipeline

				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(1, items.length);
					d.callback(true);
				}
				store.fetch({	count: 1,
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, doh, d)
								});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  Fetch_10_Streaming",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on SnapLogic pipeline.
				// description:
				//		Simple test of a basic fetch on SnapLogic pipeline.

				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				count = 0;

				function onBegin(size, requestObj){
					t.assertEqual(dojox.data.tests.stores.SnapLogicStore.pipelineSize, size);
				}
				function onItem(item, requestObj){
					t.assertTrue(store.isItem(item));
					count++;
				}
				function onComplete(items, request){
					t.assertEqual(10, count);
					t.assertTrue(items === null);
					d.callback(true);
				}

				//Get everything...
				store.fetch({		onBegin: onBegin,
									count: 10,
									onItem: onItem,
									onComplete: onComplete,
									onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, t, d)
								});
				return d; //Object
			}
		},
	    {
			name: "ReadAPI:  Fetch Zero",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Try fetching 0 records. A count of the items in the pipeline should be returned.
				// description:
				//		Try fetching 0 records. A count of the items in the pipeline should be returned.

				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function onBegin(count, request){
					t.assertEqual(dojox.data.tests.stores.SnapLogicStore.pipelineSize, count);
					d.callback(true);
				}
				store.fetch({	count: 0,
								onBegin: onBegin,
								onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, doh, d)
								});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  Fetch_Paging",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Test of multiple fetches on a single result.  Paging, if you will.
				// description:
				//		Test of multiple fetches on a single result.  Paging, if you will.

				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function dumpFirstFetch(items, request){
					t.assertEqual(request.count, items.length);
					request.start = dojox.data.tests.stores.SnapLogicStore.pipelineSize / 3;
					request.count = 1;
					request.onComplete = dumpSecondFetch;
					store.fetch(request);
				}

				function dumpSecondFetch(items, request){
					t.assertEqual(1, items.length);
					request.start = 0;
					request.count = dojox.data.tests.stores.SnapLogicStore.pipelineSize / 2;
					request.onComplete = dumpThirdFetch;
					store.fetch(request);
				}

				function dumpThirdFetch(items, request){
					t.assertEqual(request.count, items.length);
					request.count = dojox.data.tests.stores.SnapLogicStore.pipelineSize * 2;
					request.onComplete = dumpFourthFetch;
					store.fetch(request);
				}

				function dumpFourthFetch(items, request){
					t.assertEqual(dojox.data.tests.stores.SnapLogicStore.pipelineSize, items.length);
					request.start = Math.floor(3 * dojox.data.tests.stores.SnapLogicStore.pipelineSize / 4);
					request.count = dojox.data.tests.stores.SnapLogicStore.pipelineSize;
					request.onComplete = dumpFifthFetch;
					store.fetch(request);
				}

				function dumpFifthFetch(items, request){
					t.assertEqual(dojox.data.tests.stores.SnapLogicStore.pipelineSize - request.start, items.length);
					request.start = 2;
					request.count = dojox.data.tests.stores.SnapLogicStore.pipelineSize * 10;
					request.onComplete = dumpSixthFetch;
					store.fetch(request);
				}

				function dumpSixthFetch(items, request){
					t.assertEqual(dojox.data.tests.stores.SnapLogicStore.pipelineSize - request.start, items.length);
					d.callback(true);
				}

				store.fetch({	count: 5,
								onComplete: dumpFirstFetch,
								onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, t, d)});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getLabel",
			timeout:	3000, //3 seconds
			runTest: function(t) {
				// summary:
				//		Test that the label function returns undefined since it's not supported.
				// description:
				//		Test that the label function returns undefined since it's not supported.

				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 1);
					var label = store.getLabel(items[0]);
					t.assertTrue(label === undefined);
					d.callback(true);
				}
				store.fetch({		count: 1,
									onComplete: onComplete,
									onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, t, d)
								});
				return d;
			}
		},
		{
			name: "ReadAPI:  getLabelAttributes",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of the getLabelAttributes returns null since it's not supported.
				// description:
				//		Simple test of the getLabelAttributes returns null since it's not supported.

				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function onComplete(items, request){
					t.assertEqual(items.length, 1);
					var labelList = store.getLabelAttributes(items[0]);
					t.assertTrue(labelList === null);
					d.callback(true);
				}
				store.fetch({		count: 1,
									onComplete: onComplete,
									onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, t, d)
								});
				return d;
			}
		},
		{
			name: "ReadAPI:  getValue",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of the getValue function of the store.
				// description:
				//		Simple test of the getValue function of the store.
				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function completedAll(items){
					t.assertEqual(1, items.length);
					console.debug(items[0]);
					t.assertTrue(store.getValue(items[0], "empno") === 7369);
					t.assertTrue(store.getValue(items[0], "ename") === "SMITH,CLERK");
					console.debug(store.getValue(items[0], "sal"));
					t.assertTrue(store.getValue(items[0], "sal") == 800.00);
					console.debug(1);
					t.assertTrue(store.getValue(items[0], "deptno") === 20);
					d.callback(true);
				}

				store.fetch({	count: 1,
								onComplete: completedAll,
								onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, t, d)});
				return d;
			}
		},
		{
			name: "ReadAPI:  getValues",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of the getValue function of the store.
				// description:
				//		Simple test of the getValue function of the store.
				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function completedAll(items){
					t.assertEqual(1, items.length);
					for(var i = 0; i < dojox.data.tests.stores.SnapLogicStore.attributes.length; ++i){
						var values = store.getValues(items[0], dojox.data.tests.stores.SnapLogicStore.attributes[i]);
						t.assertTrue(dojo.isArray(values));
						t.assertTrue(values[0] === store.getValue(items[0], dojox.data.tests.stores.SnapLogicStore.attributes[i]));
					}
					d.callback(true);
				}

				store.fetch({	count: 1,
								onComplete: completedAll,
								onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, t, d)});
				return d;
			}
		},
		{
			name: "ReadAPI:  isItem",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of the isItem function of the store
				// description:
				//		Simple test of the isItem function of the store
				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function completedAll(items){
					t.assertEqual(5, items.length);
					for(var i=0; i < items.length; i++){
						t.assertTrue(store.isItem(items[i]));
					}
					d.callback(true);
				}

				//Get everything...
				store.fetch({	count: 5,
								onComplete: completedAll,
								onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, t, d)});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  hasAttribute",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of the hasAttribute function of the store
				// description:
				//		Simple test of the hasAttribute function of the store

				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function onComplete(items){
					t.assertEqual(1, items.length);
					t.assertTrue(items[0] !== null);
					for(var i = 0; i < dojox.data.tests.stores.SnapLogicStore.attributes.length; ++i){
						t.assertTrue(store.hasAttribute(items[0], dojox.data.tests.stores.SnapLogicStore.attributes[i]));
					}
					t.assertTrue(!store.hasAttribute(items[0], "Nothing"));
					t.assertTrue(!store.hasAttribute(items[0], "Text"));

					//Test that null attributes throw an exception
					var passed = false;
					try{
						store.hasAttribute(items[0], null);
					}catch (e){
						passed = true;
					}
					t.assertTrue(passed);
					d.callback(true);
				}

				//Get one item...
				store.fetch({	count: 1,
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, t, d)
								});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  containsValue",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of the containsValue function of the store
				// description:
				//		Simple test of the containsValue function of the store

				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function onComplete(items){
					t.assertEqual(1, items.length);
					var value = store.getValue(items[0], "LastName");
					t.assertTrue(store.containsValue(items[0], "LastName", value));
					d.callback(true);
				}

				//Get one item...
				store.fetch({	count: 1,
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, t, d)
								});
				return d; //Object
			}
		},
		{
			name: "ReadAPI:  getAttributes",
			timeout:	3000, //3 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of the getAttributes function of the store
				// description:
				//		Simple test of the getAttributes function of the store

				var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

				var d = new doh.Deferred();
				function onComplete(items){
					t.assertEqual(1, items.length);

					var itemAttributes = store.getAttributes(items[0]);
					t.assertEqual(dojox.data.tests.stores.SnapLogicStore.attributes.length, itemAttributes.length);
					for(var i = 0; i < dojox.data.tests.stores.SnapLogicStore.attributes.length; ++i){
						t.assertTrue(dojo.indexOf(itemAttributes, dojox.data.tests.stores.SnapLogicStore.attributes[i]) !== -1);
					}
					d.callback(true);
				}

				//Get everything...
				store.fetch({	count: 1,
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.SnapLogicStore.error, t, d)});
				return d; //Object
			}
		},
		function testReadAPI_getFeatures(t){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store

			var store = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});

			var features = store.getFeatures();
			var count = 0;
			for(var i in features){
				t.assertEqual(i, "dojo.data.api.Read");
				count++;
			}

			t.assertEqual(count, 1);
		},
		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = new dojox.data.SnapLogicStore({url: dojox.data.tests.stores.SnapLogicStore.pipelineUrl});
			var readApi = new dojo.data.api.Read();
			var passed = true;

			for(var i in readApi){
				if(i.toString().charAt(0) !== '_'){
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
			t.assertTrue(passed);
		}
	]
);

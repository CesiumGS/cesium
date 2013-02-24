dojo.provide("dojox.data.tests.stores.KeyValueStore");
dojo.require("dojox.data.KeyValueStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojo.data.api.Identity");

dojox.data.tests.stores.KeyValueStore.getDatasource = function(type){
	// summary:
	//		A simple helper function for getting the sample data used in each of the tests.
	// description:
	//		A simple helper function for getting the sample data used in each of the tests.

	var dataSource = {};
	var filepath = "stores/properties.js";
	if(dojo.isBrowser){
		dataSource.url = require.toUrl("dojox/data/tests/" + filepath).toString();
	}else{
		// When running tests in Rhino, xhrGet is not available,
		// so we have the file data in the code below.
		var keyData = "/*[";
		// Properties of December 1, 2007
		keyData += '{ "year": "2007" },';
		keyData += '{ "nmonth": "12" },';
		keyData += '{ "month": "December" },';
		keyData += '{ "nday": "1" },';
		keyData += '{ "day": "Saturday" },';
		keyData += '{ "dayOfYear": "335" },';
		keyData += '{ "weekOfYear": "48" }';
		keyData += ']*/';
		dataSource.data = keyData;
	}
	return dataSource; //Object
};

dojox.data.tests.stores.KeyValueStore.verifyItems = function(keyStore, items, attribute, compareArray){
	// summary:
	//		A helper function for validating that the items array is ordered
	//		the same as the compareArray
	if(items.length != compareArray.length){ return false; }
	for(var i = 0; i < items.length; i++){
		if(!(keyStore.getValue(items[i], attribute) === compareArray[i])){
			return false; //Boolean
		}
	}
	return true; //Boolean
};

dojox.data.tests.stores.KeyValueStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	for (i in errData) {
		console.log(errData[i]);
	}
	d.errback(errData);
};

doh.register("dojox.data.tests.stores.KeyValueStore",
	[
		function testReadAPI_fetch_all(t){
			// summary:
			//		Simple test of a basic fetch on KeyValueStore.
			// description:
			//		Simple test of a basic fetch on KeyValueStore.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/properties.js");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue((items.length === 7));
				d.callback(true);
			}

			//Get everything...
			keyStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_all_withEmptyStringField(t){
			// summary:
			//		Simple test of a basic fetch on KeyValueStore.
			// description:
			//		Simple test of a basic fetch on KeyValueStore.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource();
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue((items.length === 7));
				d.callback(true);
			}

			//Get everything...
			keyStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_one(t){
			// summary:
			//		Simple test of a basic fetch on KeyValueStore of a single item.
			// description:
			//		Simple test of a basic fetch on KeyValueStore of a single item.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource();
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.is(1, items.length);
				d.callback(true);
			}
			keyStore.fetch({ 	query: {key: "year"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)
							});
			return d; //Object
		},
		function testReadAPI_fetch_Multiple(t){
			// summary:
			//		Simple test of a basic fetch on KeyValueStore of a single item.
			// description:
			//		Simple test of a basic fetch on KeyValueStore of a single item.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource();
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();

			var done = [false, false];

			function onCompleteOne(items, request){
				done[0] = true;
				t.is(1, items.length);
				if(done[0] && done[1]){
					d.callback(true);
				}
			}
			
			function onCompleteTwo(items, request){
				done[1] = true;
				t.is(1, items.length);
				if(done[0] && done[1]){
					d.callback(true);
				}
			}
			
			try
			{
				keyStore.fetch({ 	query: {key: "year"},
									onComplete: onCompleteOne,
									onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)
								});
				keyStore.fetch({ 	query: {key: "month"},
									onComplete: onCompleteTwo,
									onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)
								});
			}
			catch(e)
			{
				for (i in e) {
					console.log(e[i]);
				}
			}

			return d; //Object
		},
		function testReadAPI_fetch_MultipleMixed(t){
			// summary:
			//		Simple test of a basic fetch on KeyValueStore of a single item.
			// description:
			//		Simple test of a basic fetch on KeyValueStore of a single item.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource();
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();

			var done = [false, false];
			function onComplete(items, request){
				done[0] = true;
				t.is(1, items.length);
				if(done[0] && done[1]){
					d.callback(true);
				}
			}
			
			function onItem(item){
				done[1] = true;
				t.assertTrue(item !== null);
				t.is('year', keyStore.getValue(item,"key"));
				t.is(2007, keyStore.getValue(item,"value"));
				t.is(2007, keyStore.getValue(item,"year"));
				if(done[0] && done[1]){
					d.callback(true);
				}
			}

			keyStore.fetch({ 	query: {key: "day"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)
							});
			
			keyStore.fetchItemByIdentity({identity: "year", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_all_streaming(t){
			// summary:
			//		Simple test of a basic fetch on KeyValueStore.
			// description:
			//		Simple test of a basic fetch on KeyValueStore.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource();
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			count = 0;

			function onBegin(size, requestObj){
				t.assertTrue(size === 7);
			}
			function onItem(item, requestObj){
				t.assertTrue(keyStore.isItem(item));
				count++;
			}
			function onComplete(items, request){
				t.is(7, count);
				t.is(null, items);
			    d.callback(true);
			}

			//Get everything...
			keyStore.fetch({	onBegin: onBegin,
								onItem: onItem,
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)
							});
			return d; //Object
		},
		function testReadAPI_fetch_paging(t){
			 // summary:
			 //		Test of multiple fetches on a single result.  Paging, if you will.
			 // description:
			 //		Test of multiple fetches on a single result.  Paging, if you will.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource();
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function dumpFirstFetch(items, request){
				t.is(5, items.length);
				request.start = 3;
				request.count = 1;
				request.onComplete = dumpSecondFetch;
				keyStore.fetch(request);
			}

			function dumpSecondFetch(items, request){
				t.is(1, items.length);
				request.start = 0;
				request.count = 5;
				request.onComplete = dumpThirdFetch;
				keyStore.fetch(request);
			}

			function dumpThirdFetch(items, request){
				t.is(5, items.length);
				request.start = 2;
				request.count = 20;
				request.onComplete = dumpFourthFetch;
				keyStore.fetch(request);
			}

			function dumpFourthFetch(items, request){
				t.is(5, items.length);
				request.start = 9;
				request.count = 100;
				request.onComplete = dumpFifthFetch;
				keyStore.fetch(request);
			}

			function dumpFifthFetch(items, request){
				t.is(0, items.length);
				request.start = 2;
				request.count = 20;
				request.onComplete = dumpSixthFetch;
				keyStore.fetch(request);
			}

			function dumpSixthFetch(items, request){
				t.is(5, items.length);
			    d.callback(true);
			}

			function completed(items, request){
				t.is(7, items.length);
				request.start = 1;
				request.count = 5;
				request.onComplete = dumpFirstFetch;
				keyStore.fetch(request);
			}

			keyStore.fetch({onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		
		function testReadAPI_getLabel(t){
			// summary:
			//		Simple test of the getLabel function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabel function against a store set that has a label defined.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource();
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var label = keyStore.getLabel(items[0]);
				t.assertTrue(label !== null);
				t.assertEqual("year", label);
				d.callback(true);
			}
			keyStore.fetch({ 	query: {key: "year"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)
							});
			return d;
		},
		function testReadAPI_getLabelAttributes(t){
			// summary:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.

			 var args = dojox.data.tests.stores.KeyValueStore.getDatasource();
			 var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var labelList = keyStore.getLabelAttributes(items[0]);
				t.assertTrue(dojo.isArray(labelList));
				t.assertEqual("key", labelList[0]);
				d.callback(true);
			}
			keyStore.fetch({ 	query: {key: "year"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)
							});
			return d;
		},
		function testReadAPI_getValue(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is("nday", keyStore.getValue(item,"key"));
				t.is(1, keyStore.getValue(item,"value"));
				t.is(1, keyStore.getValue(item,"nday"));
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "nday", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d;
		},
		function testReadAPI_getValue_2(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is("day", keyStore.getValue(item,"key"));
				t.is("Saturday", keyStore.getValue(item,"value"));
				t.is("Saturday", keyStore.getValue(item,"day"));
				d.callback(true);
			}
            keyStore.fetchItemByIdentity({identity: "day", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d;
		},
		function testReadAPI_getValue_3(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is("dayOfYear", keyStore.getValue(item,"key"));
				t.is(335, keyStore.getValue(item,"value"));
				t.is(335, keyStore.getValue(item,"dayOfYear"));
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "dayOfYear", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d;
		},
		function testReadAPI_getValue_4(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is("weekOfYear", keyStore.getValue(item,"key"));
				t.is(48, keyStore.getValue(item,"value"));
				t.is(48, keyStore.getValue(item,"weekOfYear"));
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "weekOfYear", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d;
		},
		function testReadAPI_getValues(t){
			// summary:
			//		Simple test of the getValues function of the store.
			// description:
			//		Simple test of the getValues function of the store.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				var names = keyStore.getValues(item,"year");
				t.assertTrue(dojo.isArray(names));
				t.is(1, names.length);
				t.is(2007, names[0]);
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "year", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "year", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d;
		},

		function testIdentityAPI_fetchItemByIdentity_bad1(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "y3ar", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity_bad2(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "-1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity_bad3(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "999999", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_getIdentity(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(7, items.length);
				t.is(keyStore.getIdentity(items[0]), 'year');
				t.is(keyStore.getIdentity(items[1]), 'nmonth');
				t.is(keyStore.getIdentity(items[2]), 'month');
				t.is(keyStore.getIdentity(items[3]), 'nday');
				t.is(keyStore.getIdentity(items[4]), 'day');
				t.is(keyStore.getIdentity(items[5]), 'dayOfYear');
				t.is(keyStore.getIdentity(items[6]), 'weekOfYear');
				d.callback(true);
			}
			
			//Get everything...
			keyStore.fetch({ onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testIdentityAPI_getIdentityAttributes(t){
			// summary:
			//		Simple test of the getIdentityAttributes
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(keyStore.isItem(item));
				t.assertEqual("key", keyStore.getIdentityAttributes(item));
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "year", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
		   	return d;
		},
		function testReadAPI_isItem(t){
			// summary:
			//		Simple test of the isItem function of the store
			// description:
			//		Simple test of the isItem function of the store

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(keyStore.isItem(item));
				t.assertTrue(!keyStore.isItem({}));
				t.assertTrue(!keyStore.isItem({ item: "not an item" }));
				t.assertTrue(!keyStore.isItem("not an item"));
				t.assertTrue(!keyStore.isItem(["not an item"]));
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "year", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
		   	return d;
		},
		function testReadAPI_hasAttribute(t){
			// summary:
			//		Simple test of the hasAttribute function of the store
			// description:
			//		Simple test of the hasAttribute function of the store

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(keyStore.hasAttribute(item, "key"));
				t.assertTrue(keyStore.hasAttribute(item, "value"));
				t.assertTrue(keyStore.hasAttribute(item, "year"));
				t.assertTrue(!keyStore.hasAttribute(item, "Year"));
				t.assertTrue(!keyStore.hasAttribute(item, "Nothing"));
				t.assertTrue(!keyStore.hasAttribute(item, "Title"));

				//Test that null attributes throw an exception
				var passed = false;
				try{
					keyStore.hasAttribute(item, null);
				}catch (e){
					passed = true;
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "year", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
		   	return d;
		},
		function testReadAPI_containsValue(t){
			// summary:
			//		Simple test of the containsValue function of the store
			// description:
			//		Simple test of the containsValue function of the store

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
 			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(keyStore.containsValue(item, "year", "2007"));
				t.assertTrue(keyStore.containsValue(item, "value", "2007"));
				t.assertTrue(keyStore.containsValue(item, "key", "year"));
				t.assertTrue(!keyStore.containsValue(item, "Title", "Alien2"));
				t.assertTrue(!keyStore.containsValue(item, "Year", "1979   "));
				t.assertTrue(!keyStore.containsValue(item, "Title", null));

				//Test that null attributes throw an exception
				var passed = false;
				try{
					keyStore.containsValue(item, null, "foo");
				}catch (e){
					passed = true;
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "year", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
		   	return d;
		},
		function testReadAPI_getAttributes(t){
			// summary:
			//		Simple test of the getAttributes function of the store
			// description:
			//		Simple test of the getAttributes function of the store

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(keyStore.isItem(item));

				var attributes = keyStore.getAttributes(item);
				t.is(3, attributes.length);
				for(var i = 0; i < attributes.length; i++){
					t.assertTrue((attributes[i] === "year" || attributes[i] === "value" || attributes[i] === "key"));
				}
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "year", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
		   	return d;
		},

		function testReadAPI_getAttributes_onlyTwo(t){
			// summary:
			//		Simple test of the getAttributes function of the store
			// description:
			//		Simple test of the getAttributes function of the store

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				// Test an item that does not have all of the attributes
				t.assertTrue(item !== null);
				t.assertTrue(keyStore.isItem(item));

				var attributes = keyStore.getAttributes(item);
				t.assertTrue(attributes.length === 3);
				t.assertTrue(attributes[0] === "key");
				t.assertTrue(attributes[1] === "value");
				t.assertTrue(attributes[2] === "nmonth");
				d.callback(true);
			}
			keyStore.fetchItemByIdentity({identity: "nmonth", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
		   	return d;
		},

		function testReadAPI_getFeatures(t){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var features = keyStore.getFeatures();
			var count = 0;
			for(i in features){
				t.assertTrue((i === "dojo.data.api.Read" || i === "dojo.data.api.Identity"));
				count++;
			}
			t.assertTrue(count === 2);
		},
		function testReadAPI_fetch_patternMatch0(t){
			// summary:
			//		Function to test pattern matching of everything starting with lowercase e
			// description:
			//		Function to test pattern matching of everything starting with lowercase e

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);

			var d = new doh.Deferred();
			function completed(items, request){
				t.is(2, items.length);
				var valueArray = [ "nmonth", "month"];
				t.assertTrue(dojox.data.tests.stores.KeyValueStore.verifyItems(keyStore, items, "key", valueArray));
				d.callback(true);
			}
			
			keyStore.fetch({query: {key: "*month"}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch1(t){
			// summary:
			//		Function to test pattern matching of everything with $ in it.
			// description:
			//		Function to test pattern matching of everything with $ in it.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/patterns.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.assertTrue(items.length === 2);
				var valueArray = [ "1", "Saturday"];
				t.assertTrue(dojox.data.tests.stores.KeyValueStore.verifyItems(keyStore, items, "value", valueArray));
				d.callback(true);
			}
			
			keyStore.fetch({query: {key: "*day"}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch2(t){
			// summary:
			//		Function to test exact pattern match
			// description:
			//		Function to test exact pattern match
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/patterns.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(2, items.length);
				t.assertTrue(keyStore.getValue(items[0], "value") === "12");
				t.assertTrue(keyStore.getValue(items[0], "key") === "nmonth");
				t.assertTrue(keyStore.getValue(items[1], "value") === "1");
				t.assertTrue(keyStore.getValue(items[1], "key") === "nday");
				d.callback(true);
			}
			
			keyStore.fetch({query: {value: "1*"}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch_caseInsensitive(t){
			// summary:
			//		Function to test exact pattern match with case insensitivity set.
			// description:
			//		Function to test exact pattern match with case insensitivity set.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/patterns.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(1, items.length);
				t.assertTrue(keyStore.getValue(items[0], "value") === "December");
				d.callback(true);
			}
			
			keyStore.fetch({query: {key: "MONth"}, queryOptions: {ignoreCase: true}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch_caseSensitive(t){
			// summary:
			//		Function to test exact pattern match with case insensitivity set.
			// description:
			//		Function to test exact pattern match with case insensitivity set.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/patterns.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(0, items.length);
				d.callback(true);
			}
			
			keyStore.fetch({query: {value: "DECEMberO"}, queryOptions: {ignoreCase: false}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabetic(t){
			// summary:
			//		Function to test sorting alphabetic ordering.
			// description:
			//		Function to test sorting alphabetic ordering.
		
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/patterns.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ "day", "dayOfYear", "month", "nday", "nmonth", "weekOfYear", "year" ];
				t.is(7, items.length);
				t.assertTrue(dojox.data.tests.stores.KeyValueStore.verifyItems(keyStore, items, "key", orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "key"}];
			keyStore.fetch({sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabeticDescending(t){
			// summary:
			//		Function to test sorting alphabetic ordering in descending mode.
			// description:
			//		Function to test sorting alphabetic ordering in descending mode.
		
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/patterns.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ "year", "weekOfYear", "nmonth", "nday", "month", "dayOfYear", "day" ];
				t.is(7, items.length);
				t.assertTrue(dojox.data.tests.stores.KeyValueStore.verifyItems(keyStore, items, "key", orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "key", descending: true}];
			keyStore.fetch({sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortMultiple(t){
			// summary:
			//		Function to test sorting on multiple attributes.
			// description:
			//		Function to test sorting on multiple attributes.
			
			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/patterns.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
		
			var d = new doh.Deferred();
			function completed(items, request){
				var orderedArray1 = [	"123abc",
										"123abc",
										"123abc",
										"123abcdefg",
										"BaBaMaSaRa***Foo",
										"bar*foo",
										"bit$Bite",
										"foo*bar",
										"jfq4@#!$!@Rf14r14i5u",
										undefined
									];
				var orderedArray0 = [ "day", "dayOfYear", "month", "nday", "nmonth", "weekOfYear", "year" ];
				var orderedArray1 = [ "Saturday", "335", "December", "1", "12", "48", "2007" ];
				t.is(7, items.length);
				t.assertTrue(dojox.data.tests.stores.KeyValueStore.verifyItems(keyStore, items, "key", orderedArray0));
				t.assertTrue(dojox.data.tests.stores.KeyValueStore.verifyItems(keyStore, items, "value", orderedArray1));
				d.callback(true);
			}
			
			var sortAttributes = [{ attribute: "key"}, { attribute: "value", descending: true}];
			keyStore.fetch({sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortMultipleSpecialComparator(t){
			// summary:
			//		Function to test sorting on multiple attributes with a custom comparator.
			// description:
			//		Function to test sorting on multiple attributes with a custom comparator.

			var args = dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv");
			var keyStore = new dojox.data.KeyValueStore(args);
			
			keyStore.comparatorMap = {};
			keyStore.comparatorMap["key"] = function(a,b){
				var ret = 0;
				// We want to sort keys alphabetical by the last character in the string
				function lastChar(name){
					if(typeof name === "undefined"){ return undefined; }
					
					return name.slice(name.length-1); // Grab the last character in the string.
				}
				var lastCharA = lastChar(a);
				var lastCharB = lastChar(b);
				if(lastCharA > lastCharB || typeof lastCharA === "undefined"){
					ret = 1;
				}else if(lastCharA < lastCharB || typeof lastCharB === "undefined"){
					ret = -1;
				}
				return ret;
			};
		
			var sortAttributes = [{attribute: "key", descending: true}, { attribute: "value", descending: true}];
		
			var d = new doh.Deferred();
			function completed(items, findResult){
				var orderedArray = [5,4,0,3,2,1,6];
				var orderedArray = [ "day", "nday", "weekOfYear", "dayOfYear", "year", "month", "nmonth" ];
				t.assertTrue(items.length === 7);
				var passed = true;
				for(var i = 0; i < items.length; i++){
					if(!(keyStore.getIdentity(items[i]) === orderedArray[i])){
						passed=false;
						break;
					}
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			
			keyStore.fetch({sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.KeyValueStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = new dojox.data.KeyValueStore(dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv"));
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
		},
		function testIdentityAPI_functionConformance(t){
			// summary:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = new dojox.data.KeyValueStore(dojox.data.tests.stores.KeyValueStore.getDatasource("stores/movies.csv"));
			var identityApi = new dojo.data.api.Identity();
			var passed = true;

			for(i in identityApi){
				if(i.toString().charAt(0) !== '_')
				{
					var member = identityApi[i];
					//Check that all the 'Read' defined functions exist on the test store.
					if(typeof member === "function"){
						console.log("Looking at function: [" + i + "]");
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


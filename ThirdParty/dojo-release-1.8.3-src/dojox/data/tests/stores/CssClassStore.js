dojo.provide("dojox.data.tests.stores.CssClassStore");
dojo.require("dojox.data.CssClassStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojo.data.api.Identity");

dojox.data.tests.stores.CssClassStore.createStore = function(context){
	// summary:
	//		A simple helper function for getting the sample data used in each of the tests.
	// description:
	//		A simple helper function for getting the sample data used in each of the tests.
	var store = null;
	if(dojo.isBrowser){
		if(!dojox.data.tests.stores.CssClassStore._loaded){
			var head = dojo.doc.getElementsByTagName('head')[0];
			var link = document.createElement('link');
			link.href = require.toUrl('dojox/data/tests/stores/test1.css').toString();
			link.rel = "stylesheet";
			link.type = "text/css";
			head.appendChild(link);
			var style;
			var text;
			if(dojo.isIE){
				style = document.createStyleSheet();
				style.cssText = '@import "'+require.toUrl('dojox/data/tests/stores/test2.css').toString()+'";';
			}else{
				style = document.createElement('style');
				text = document.createTextNode('@import "'+require.toUrl('dojox/data/tests/stores/test2.css').toString()+'";');
				style.appendChild(text);
				head.appendChild(style);
			}
			if(dojo.isIE){
				style = document.createStyleSheet();
				style.cssText = '.embeddedTestClass { text-align: center; }';
			}else{
				style = document.createElement('style');
				text = document.createTextNode('.embeddedTestClass { text-align: center; }');
				style.appendChild(text);
				head.appendChild(style);
			}
			dojox.data.tests.stores.CssClassStore._loaded = true;
		}
		store = new dojox.data.CssClassStore({context: context});
	}else{
		// When running tests in Rhino, xhrGet is not available,
		// so we have the file data in the code below.
		
		// TODO: What are the stipulations re: DOM ? Can I do the same as above?
	}
	return store;
};

dojox.data.tests.stores.CssClassStore.verifyItems = function(cssClassStore, items, attribute, compareArray){
	// summary:
	//		A helper function for validating that the items array is ordered
	//		the same as the compareArray
	if(items.length != compareArray.length){ return false; }
	for(var i = 0; i < items.length; i++){
		// Safari is dumb, see comment in CssClassStore about bug in selectorText
		if(!(cssClassStore.getValue(items[i], attribute) === compareArray[i])){
			return false; //Boolean
		}
	}
	return true; //Boolean
};

dojox.data.tests.stores.CssClassStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	for (var i in errData) {
		console.log(errData[i]);
	}
	d.errback(errData);
};

doh.register("dojox.data.tests.stores.CssClassStore",
	[
		{
			name: "testReadAPI_fetch",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on CssClassStore.
				// description:
				//		Simple test of a basic fetch on CssClassStore.
				var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();

				var d = new doh.Deferred();
				function completedAll(items){
					t.assertTrue(items.length === 3);
					d.callback(true);
				}

				//Get everything...
				cssClassStore.fetch({
					query: {'class': '*TestClass'},
					onComplete: completedAll,
					onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
				});
				return d; //Object
			}
		},
		function testReadAPI_fetch_all(t){
			// summary:
			//		Simple test of a basic fetch on CssClassStore.
			// description:
			//		Simple test of a basic fetch on CssClassStore.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore(['dojox/data/tests/stores/test1.css', 'dojox/data/tests/stores/test2.css']);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue(items.length === 3);
				d.callback(true);
			}
			
			//Get everything...
			cssClassStore.fetch({
				onComplete: completedAll,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_withinContext(t){
			// summary:
			//		Simple test of a basic fetch on CssClassStore.
			// description:
			//		Simple test of a basic fetch on CssClassStore.
			
			//dojox.data.tests.stores.CssClassStore.loadStylesheets();
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore(['dojox/data/tests/stores/test1.css']);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue(items.length === 1);
				d.callback(true);
			}
			
			//Get everything...
			cssClassStore.fetch({
				query: {'class': '*TestClass'},
				onComplete: completedAll,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_withinMultipleSheetContext(t){
			// summary:
			//		Simple test of a basic fetch on CssClassStore.
			// description:
			//		Simple test of a basic fetch on CssClassStore.
		
			//dojox.data.tests.stores.CssClassStore.loadStylesheets();
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore(['dojox/data/tests/stores/test1.css', 'dojox/data/tests/stores/test2.css']);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue(items.length === 2);
				d.callback(true);
			}
			
			//Get everything...
			cssClassStore.fetch({
				query: {'class': '*TestClass'},
				onComplete: completedAll,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_switchContext(t){
			// summary:
			//		Simple test of a basic fetch on CssClassStore.
			// description:
			//		Simple test of a basic fetch on CssClassStore.
			
			//dojox.data.tests.stores.CssClassStore.loadStylesheets();
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore(['dojox/data/tests/stores/test1.css', 'dojox/data/tests/stores/test2.css']);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue(items.length === 2);

				function completedAllTwo(items){
					t.assertTrue(items.length === 1);
					d.callback(true);
				}

				cssClassStore.setContext(['dojox/data/tests/stores/test1.css']);
				cssClassStore.fetch({
					query: {'class': '*TestClass'},
					onComplete: completedAllTwo,
					onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
				});
			}
			
			//Get everything...
			cssClassStore.fetch({
				query: {'class': '*TestClass'},
				onComplete: completedAll,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_one(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore of a single item.
			// description:
			//		Simple test of a basic fetch on CsvStore of a single item.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.is(1, items.length);
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'class': '.linkTestClass'},
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_one_sans(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore of a single item.
			// description:
			//		Simple test of a basic fetch on CsvStore of a single item.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.is(1, items.length);
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'classSans': 'linkTestClass'},
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_Multiple(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore of a single item.
			// description:
			//		Simple test of a basic fetch on CsvStore of a single item.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			
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
			
			try{
				cssClassStore.fetch({
					query: {'class': '.embeddedTestClass'},
					onComplete: onCompleteOne,
					onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
				});
				cssClassStore.fetch({
					query: {'class': '.linkTestClass'},
					onComplete: onCompleteTwo,
					onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
				});
			}catch(e){
				for(var i in e){
					console.log(e[i]);
				}
			}

			return d; //Object
		},
		function testReadAPI_fetch_MultipleMixed(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore of a single item.
			// description:
			//		Simple test of a basic fetch on CsvStore of a single item.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			
			var d = new doh.Deferred();

			var done = [false, false];
			function onComplete(items, request){
				done[0] = true;
				t.is(1, items.length);
				t.is('.linkTestClass', cssClassStore.getValue(items[0], 'class'));
				if(done[0] && done[1]){
					d.callback(true);
				}
			}
			
			function onItem(item){
				done[1] = true;
				t.assertTrue(item !== null);
				t.is('.embeddedTestClass', cssClassStore.getValue(item, 'class'));
				if(done[0] && done[1]){
					d.callback(true);
				}
			}

			cssClassStore.fetch({
				query: {'class': '.linkTestClass'},
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			
			cssClassStore.fetch({
				query: {'classSans': 'embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_all_streaming(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore.
			// description:
			//		Simple test of a basic fetch on CsvStore.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();

			var d = new doh.Deferred();
			var count = 0;

			function onBegin(size, requestObj){
				t.assertTrue(size === 3);
			}
			function onItem(item, requestObj){
				t.assertTrue(cssClassStore.isItem(item));
				count++;
			}
			function onComplete(items, request){
				t.is(3, count);
				t.is(null, items);
			    d.callback(true);
			}

			//Get everything...
			cssClassStore.fetch({
				query: {'class': '*TestClass'},
				onBegin: onBegin,
				onItem: onItem,
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_paging(t){
			 // summary:
			 //		Test of multiple fetches on a single result.  Paging, if you will.
			 // description:
			 //		Test of multiple fetches on a single result.  Paging, if you will.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			
			var d = new doh.Deferred();

			function dumpThirdFetch(items, request){
				t.is(2, items.length);
			    d.callback(true);
			}

			function dumpSecondFetch(items, request){
				t.is(1, items.length);
				t.is('.embeddedTestClass', cssClassStore.getValue(items[0], 'class'));
				request.start = 0;
				request.count = 2;
				request.onComplete = dumpThirdFetch;
				cssClassStore.fetch(request);
			}

			function dumpFirstFetch(items, request){
				t.is(3, items.length);
				request.start = 2;
				request.count = 1;
				request.onComplete = dumpSecondFetch;
				cssClassStore.fetch(request);
			}

			cssClassStore.fetch({
				query: {'class': '*TestClass'},
				onComplete: dumpFirstFetch,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object

		},
		
		function testReadAPI_getLabel(t){
			// summary:
			//		Simple test of the getLabel function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabel function against a store set that has a label defined.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var label = cssClassStore.getLabel(items[0]);
				t.assertTrue(label !== null);
				t.assertEqual(".linkTestClass", label);
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'classSans': 'linkTestClass'},
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getLabelAttributes(t){
			// summary:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var labelList = cssClassStore.getLabelAttributes(items[0]);
				t.assertTrue(dojo.isArray(labelList));
				t.assertEqual("class", labelList[0]);
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'classSans': 'linkTestClass'},
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getValue(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is('.linkTestClass', cssClassStore.getValue(item,'class'));
				t.is('linkTestClass', cssClassStore.getValue(item,'classSans'));
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'classSans': 'linkTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getValue_2(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is('.importTestClass', cssClassStore.getValue(item,'class'));
				t.is('importTestClass', cssClassStore.getValue(item,'classSans'));
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'classSans': 'importTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getValues(t){
			// summary:
			//		Simple test of the getValues function of the store.
			// description:
			//		Simple test of the getValues function of the store.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				var values = cssClassStore.getValues(item,'class');
				t.assertTrue(dojo.isArray(values));
				t.is(1, values.length);
				t.is('.embeddedTestClass', values[0]);
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'classSans': 'embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_isItem(t){
			// summary:
			//		Simple test of the isItem function of the store
			// description:
			//		Simple test of the isItem function of the store
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(cssClassStore.isItem(item));
				t.assertTrue(!cssClassStore.isItem({}));
				t.assertTrue(!cssClassStore.isItem({ item: "not an item" }));
				t.assertTrue(!cssClassStore.isItem("not an item"));
				t.assertTrue(!cssClassStore.isItem(["not an item"]));
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'classSans': 'embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_hasAttribute(t){
			// summary:
			//		Simple test of the hasAttribute function of the store
			// description:
			//		Simple test of the hasAttribute function of the store
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(cssClassStore.hasAttribute(item, 'class'));
				t.assertTrue(cssClassStore.hasAttribute(item, 'classSans'));
				t.assertTrue(!cssClassStore.hasAttribute(item, "Year"));
				t.assertTrue(!cssClassStore.hasAttribute(item, "Nothing"));
				t.assertTrue(!cssClassStore.hasAttribute(item, "title"));

				//Test that null attributes throw an exception
				var passed = false;
				try{
					cssClassStore.hasAttribute(item, null);
				}catch (e){
					passed = true;
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'classSans': 'embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_containsValue(t){
			// summary:
			//		Simple test of the containsValue function of the store
			// description:
			//		Simple test of the containsValue function of the store
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
 			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(cssClassStore.containsValue(item, 'class', '.embeddedTestClass'));
				t.assertTrue(cssClassStore.containsValue(item, 'classSans', 'embeddedTestClass'));
				t.assertTrue(!cssClassStore.containsValue(item, 'class', '.embeddedTestClass2'));
				t.assertTrue(!cssClassStore.containsValue(item, 'classSans', 'embeddedTestClass	'));
				t.assertTrue(!cssClassStore.containsValue(item, 'class', null));

				//Test that null attributes throw an exception
				var passed = false;
				try{
					cssClassStore.containsValue(item, null, "foo");
				}catch (e){
					passed = true;
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'classSans': 'embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getAttributes(t){
			// summary:
			//		Simple test of the getAttributes function of the store
			// description:
			//		Simple test of the getAttributes function of the store
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(cssClassStore.isItem(item));

				var attributes = cssClassStore.getAttributes(item);
				t.is(2, attributes.length);
				for(var i = 0; i < attributes.length; i++){
					t.assertTrue((attributes[i] === 'class' || attributes[i] === 'classSans'));
				}
				d.callback(true);
			}
			cssClassStore.fetch({
				query: {'classSans': 'embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getFeatures(t){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();

			var features = cssClassStore.getFeatures();
			var count = 0;
			for(var i in features){
				t.assertTrue(i === "dojo.data.api.Read" || i === "dojo.data.api.Identity");
				count++;
			}
			t.assertTrue(count === 2);
		},
		function testReadAPI_fetch_patternMatch0(t){
			// summary:
			//		Function to test pattern matching of everything swith Cla in it
			// description:
			//		Function to test pattern matching of everything with Cla in it
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(3, items.length);
				var valueArray = ['linkTestClass', 'importTestClass', 'embeddedTestClass'];
				t.assertTrue(dojox.data.tests.stores.CssClassStore.verifyItems(cssClassStore, items, 'classSans', valueArray));
				d.callback(true);
			}
			
			cssClassStore.fetch({
				query: {'class': '*TestCla**'},
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch_caseInsensitive(t){
			// summary:
			//		Function to test exact pattern match with case insensitivity set.
			// description:
			//		Function to test exact pattern match with case insensitivity set.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(1, items.length);
				t.assertTrue(cssClassStore.getValue(items[0], 'class') === '.linkTestClass');
				d.callback(true);
			}

			cssClassStore.fetch({
				query: {'class': '.LINKtEsTclass'},
				queryOptions: {ignoreCase: true},
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch_caseSensitive(t){
			// summary:
			//		Function to test exact pattern match with case insensitivity set.
			// description:
			//		Function to test exact pattern match with case insensitivity set.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(0, items.length);
				d.callback(true);
			}

			cssClassStore.fetch({
				query: {'class': '.LINKtEsTclass'},
				queryOptions: {ignoreCase: false},
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabetic(t){
			// summary:
			//		Function to test sorting alphabetic ordering.
			// description:
			//		Function to test sorting alphabetic ordering.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			var d = new doh.Deferred();
			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ 	'.embeddedTestClass',
										'.importTestClass',
										'.linkTestClass'
				];
				t.is(3, items.length);
				t.assertTrue(dojox.data.tests.stores.CssClassStore.verifyItems(cssClassStore, items, 'class', orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: 'class'}];
			cssClassStore.fetch({
				query: {'class': '*TestClass'},
				sort: sortAttributes,
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabeticDescending(t){
			// summary:
			//		Function to test sorting alphabetic ordering in descending mode.
			// description:
			//		Function to test sorting alphabetic ordering in descending mode.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			var d = new doh.Deferred();


			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ 	'linkTestClass',
										'importTestClass',
										'embeddedTestClass'
					];

				console.debug(items);

				t.is(3, items.length);
				t.assertTrue(dojox.data.tests.stores.CssClassStore.verifyItems(cssClassStore, items, 'classSans', orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "classSans", descending: true}];
			cssClassStore.fetch({
				query: {'class': '*TestClass'},
				sort: sortAttributes,
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			var testStore = dojox.data.tests.stores.CssClassStore.createStore();
			var readApi = new dojo.data.api.Read();
			var passed = true;

			for(var i in readApi){
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
		function testIdentityAPI_fetchItemByIdentity(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				d.callback(true);
			}
			cssClassStore.fetchItemByIdentity({
				identity: ".linkTestClass",
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity_bad1(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
			cssClassStore.fetchItemByIdentity({
				identity: ".bsClass",
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity_bad2(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
			cssClassStore.fetchItemByIdentity({
				identity: 'linkTestClass', // missing the '.'!
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity_bad3(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
			cssClassStore.fetchItemByIdentity({
				identity: '9999999',
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d;
		},
		function testIdentityAPI_getIdentity(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(3, items.length);
				t.assertTrue(cssClassStore.getIdentity(items[0]) === '.embeddedTestClass');
				t.assertTrue(cssClassStore.getIdentity(items[1]) === '.importTestClass');
				t.assertTrue(cssClassStore.getIdentity(items[2]) === '.linkTestClass');
				d.callback(true);
			}
			//Get everything...
			cssClassStore.fetch({
				query: {'class': '*TestClass'},
				sort: [{attribute: 'class'}],
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
			return d; //Object
		},
		function testIdentityAPI_getIdentityAttributes(t){
			// summary:
			//		Simple test of the getIdentityAttributes
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			var cssClassStore = dojox.data.tests.stores.CssClassStore.createStore();
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(cssClassStore.isItem(item));
				var attrs = cssClassStore.getIdentityAttributes(item);
				t.assertTrue(dojo.isArray(attrs));
				t.is(1, attrs.length);
				t.assertEqual(attrs[0], 'class');
				d.callback(true);
			}
			cssClassStore.fetchItemByIdentity({
				identity: ".linkTestClass",
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssClassStore.error, t, d)
			});
		   	return d;
		}
	]
);


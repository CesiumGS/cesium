dojo.provide("dojox.data.tests.stores.CssRuleStore");
dojo.require("dojox.data.CssRuleStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojo.data.api.Identity");

dojox.data.tests.stores.CssRuleStore.createStore = function(context){
	// summary:
	//		A simple helper function for getting the sample data used in each of the tests.
	// description:
	//		A simple helper function for getting the sample data used in each of the tests.
	var store = null;
	if(dojo.isBrowser){
		if(!dojox.data.tests.stores.CssRuleStore._loaded){
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
			dojox.data.tests.stores.CssRuleStore._loaded = true;
		}
		store = new dojox.data.CssRuleStore({context: context});
	}else{
		// When running tests in Rhino, xhrGet is not available,
		// so we have the file data in the code below.
		
		// TODO: What are the stipulations re: DOM ? Can I do the same as above?
	}
	return store;
} ;

dojox.data.tests.stores.CssRuleStore.verifyItems = function(cssRuleStore, items, attribute, compareArray){
	// summary:
	//		A helper function for validating that the items array is ordered
	//		the same as the compareArray
	if(items.length != compareArray.length){ return false; }
	for(var i = 0; i < items.length; i++){
		if(!(cssRuleStore.getValue(items[i], attribute) === compareArray[i])){
			return false; //Boolean
		}
	}
	return true; //Boolean
};

dojox.data.tests.stores.CssRuleStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	for (var i in errData) {
		console.log(errData[i]);
	}
	d.errback(errData);
};

doh.register("dojox.data.tests.stores.CssRuleStore",
	[
		{
			name: "testReadAPI_fetch",
			timeout:	10000, //10 seconds.  Flickr can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on CssRuleStorem longer timeout because initial load can sometimes take a bit..
				// description:
				//		Simple test of a basic fetch on CssRuleStorem longer timeout because initial load can sometimes take a bit.
				var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();

				var d = new doh.Deferred();
				function completedAll(items){
					t.assertTrue(items.length === 3);
					d.callback(true);
				}

				//Get everything...
				cssRuleStore.fetch({
					query: {'selector': '*TestClass'},
					onComplete: completedAll,
					onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
				});
				return d; //Object
			}
		},
		function testReadAPI_fetch_all(t){
			// summary:
			//		Simple test of a basic fetch on CssRuleStore.
			// description:
			//		Simple test of a basic fetch on CssClassStore.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore(['dojox/data/tests/stores/test1.css', 'dojox/data/tests/stores/test2.css']);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue(items.length === 3);
				d.callback(true);
			}
			
			//Get everything...
			cssRuleStore.fetch({
				onComplete: completedAll,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_withinContext(t){
			// summary:
			//		Simple test of a basic fetch on CssRuleStore.
			// description:
			//		Simple test of a basic fetch on CssRuleStore.
		
			//dojox.data.tests.stores.CssRuleStore.loadStylesheets();
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore(['dojox/data/tests/stores/test1.css']);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue(items.length === 1);
				d.callback(true);
			}
			
			//Get everything...
			cssRuleStore.fetch({
				query: {'selector': '*TestClass'},
				onComplete: completedAll,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_withinMultipleSheetContext(t){
			// summary:
			//		Simple test of a basic fetch on CssRuleStore.
			// description:
			//		Simple test of a basic fetch on CssRuleStore.
			
			//dojox.data.tests.stores.CssRuleStore.loadStylesheets();
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore(['dojox/data/tests/stores/test1.css', 'dojox/data/tests/stores/test2.css']);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue(items.length === 2);
				d.callback(true);
			}
			
			//Get everything...
			cssRuleStore.fetch({
				query: {'selector': '*TestClass'},
				onComplete: completedAll,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_switchContext(t){
			// summary:
			//		Simple test of a basic fetch on CssRuleStore.
			// description:
			//		Simple test of a basic fetch on CssRuleStore.
		
			//dojox.data.tests.stores.CssRuleStore.loadStylesheets();
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore(['dojox/data/tests/stores/test1.css', 'dojox/data/tests/stores/test2.css']);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue(items.length === 2);

				function completedAllTwo(items){
					t.assertTrue(items.length === 1);
					d.callback(true);
				}

				cssRuleStore.setContext(['dojox/data/tests/stores/test1.css']);
				cssRuleStore.fetch({
					query: {'selector': '*TestClass'},
					onComplete: completedAllTwo,
					onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
				});
			}
			
			//Get everything...
			cssRuleStore.fetch({
				query: {'selector': '*TestClass'},
				onComplete: completedAll,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_one(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore of a single item.
			// description:
			//		Simple test of a basic fetch on CsvStore of a single item.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.is(1, items.length);
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.linkTestClass'},
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_one_longer(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore of a single item.
			// description:
			//		Simple test of a basic fetch on CsvStore of a single item.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.is(1, items.length);
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.linkTestClass .test'},
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_Multiple(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore of a single item.
			// description:
			//		Simple test of a basic fetch on CsvStore of a single item.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			
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
				cssRuleStore.fetch({
					query: {'selector': '.embeddedTestClass'},
					onComplete: onCompleteOne,
					onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
				});
				cssRuleStore.fetch({
					query: {'selector': '.linkTestClass'},
					onComplete: onCompleteTwo,
					onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
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
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			
			var d = new doh.Deferred();

			var done = [false, false];
			function onComplete(items, request){
				done[0] = true;
				t.is(1, items.length);
				t.is('.embeddedTestClass', cssRuleStore.getValue(items[0], 'selector'));
				if(done[0] && done[1]){
					d.callback(true);
				}
			}
			
			function onItem(item){
				done[1] = true;
				t.assertTrue(item !== null);
				t.is('.linkTestClass .test', cssRuleStore.getValue(item, 'selector'));
				if(done[0] && done[1]){
					d.callback(true);
				}
			}

			cssRuleStore.fetch({
				query: {'selector': '.embeddedTestClass'},
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			
			cssRuleStore.fetch({
				query: {'selector': '.linkTestClass .test'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_all_streaming(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore.
			// description:
			//		Simple test of a basic fetch on CsvStore.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();

			var d = new doh.Deferred();
			var count = 0;

			function onBegin(size, requestObj){
				t.assertTrue(size === 3);
			}
			function onItem(item, requestObj){
				t.assertTrue(cssRuleStore.isItem(item));
				count++;
			}
			function onComplete(items, request){
				t.is(3, count);
				t.is(null, items);
			    d.callback(true);
			}

			//Get everything...
			cssRuleStore.fetch({
				query: {'selector': '*TestClass'},
				onBegin: onBegin,
				onItem: onItem,
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_paging(t){
			 // summary:
			 //		Test of multiple fetches on a single result.  Paging, if you will.
			 // description:
			 //		Test of multiple fetches on a single result.  Paging, if you will.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			
			var d = new doh.Deferred();

			function dumpThirdFetch(items, request){
				t.is(2, items.length);
			    d.callback(true);
			}
			
			function dumpSecondFetch(items, request){
				t.is(1, items.length);
				t.is('.embeddedTestClass', cssRuleStore.getValue(items[0], 'selector'));
				request.start = 0;
				request.count = 2;
				request.onComplete = dumpThirdFetch;
				cssRuleStore.fetch(request);
			}

			function dumpFirstFetch(items, request){
				t.is(3, items.length);
				request.start = 2;
				request.count = 1;
				request.onComplete = dumpSecondFetch;
				cssRuleStore.fetch(request);
			}


			cssRuleStore.fetch({
				query: {'selector': '*TestClass'},
				onComplete: dumpFirstFetch,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object

		},
		
		function testReadAPI_getLabel(t){
			// summary:
			//		Simple test of the getLabel function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabel function against a store set that has a label defined.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var label = cssRuleStore.getLabel(items[0]);
				t.assertTrue(label !== null);
				t.assertEqual(".linkTestClass", label);
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.linkTestClass'},
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getLabelAttributes(t){
			// summary:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var labelList = cssRuleStore.getLabelAttributes(items[0]);
				t.assertTrue(dojo.isArray(labelList));
				t.assertEqual('selector', labelList[0]);
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.linkTestClass'},
				onComplete: onComplete,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getValue(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is('.linkTestClass', cssRuleStore.getValue(item,'selector'));
				t.assertTrue(cssRuleStore.getValue(item, 'parentStyleSheetHref').match('dojox/data/tests/stores/test1.css'));
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.linkTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getValue_2(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is('.importTestClass', cssRuleStore.getValue(item,'selector'));
				t.assertTrue(cssRuleStore.getValue(item, 'parentStyleSheetHref').match('dojox/data/tests/stores/test2.css'));
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.importTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getValues(t){
			// summary:
			//		Simple test of the getValues function of the store.
			// description:
			//		Simple test of the getValues function of the store.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				var values = cssRuleStore.getValues(item,'selector');
				t.assertTrue(dojo.isArray(values));
				t.is(1, values.length);
				t.is('.embeddedTestClass', values[0]);
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_isItem(t){
			// summary:
			//		Simple test of the isItem function of the store
			// description:
			//		Simple test of the isItem function of the store
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(cssRuleStore.isItem(item));
				t.assertTrue(!cssRuleStore.isItem({}));
				t.assertTrue(!cssRuleStore.isItem({ item: "not an item" }));
				t.assertTrue(!cssRuleStore.isItem("not an item"));
				t.assertTrue(!cssRuleStore.isItem(["not an item"]));
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_hasAttribute(t){
			// summary:
			//		Simple test of the hasAttribute function of the store
			// description:
			//		Simple test of the hasAttribute function of the store
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(cssRuleStore.hasAttribute(item, 'selector'));
				t.assertTrue(cssRuleStore.hasAttribute(item, 'classes'));
				t.assertTrue(!cssRuleStore.hasAttribute(item, 'Year'));
				t.assertTrue(!cssRuleStore.hasAttribute(item, 'Nothing'));
				t.assertTrue(!cssRuleStore.hasAttribute(item, 'title'));

				//Test that null attributes throw an exception
				var passed = false;
				try{
					cssRuleStore.hasAttribute(item, null);
				}catch (e){
					passed = true;
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_containsValue(t){
			// summary:
			//		Simple test of the containsValue function of the store
			// description:
			//		Simple test of the containsValue function of the store
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
 			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(cssRuleStore.containsValue(item, 'selector', '.embeddedTestClass'));
				t.assertTrue(cssRuleStore.containsValue(item, 'classes', '.embeddedTestClass'));
				t.assertTrue(!cssRuleStore.containsValue(item, 'selector', '.embeddedTestClass2'));
				t.assertTrue(!cssRuleStore.containsValue(item, 'classes', 'embeddedTestClass	'));
				t.assertTrue(!cssRuleStore.containsValue(item, 'selector', null));

				//Test that null attributes throw an exception
				var passed = false;
				try{
					cssRuleStore.containsValue(item, null, "foo");
				}catch (e){
					passed = true;
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getAttributes(t){
			// summary:
			//		Simple test of the getAttributes function of the store
			// description:
			//		Simple test of the getAttributes function of the store
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(cssRuleStore.isItem(item));

				var attributes = cssRuleStore.getAttributes(item);
				t.assertTrue(attributes.length > 8);
				for(var i = 0; i < 8; i++){
					var a = attributes[i];
					t.assertTrue((	a === 'selector' 			|| a === 'classes'
								||	a === 'rule' 				|| a === 'style'
								||	a === 'cssText' 			|| a === 'styleSheet'
								||	a === 'parentStyleSheet' 	|| a === 'parentStyleSheetHref'));
				}
				d.callback(true);
			}
			cssRuleStore.fetch({
				query: {'selector': '.embeddedTestClass'},
				onItem: onItem,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d;
		},
		function testReadAPI_getFeatures(t){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();

			var features = cssRuleStore.getFeatures();
			var count = 0;
			for(var i in features){
				t.assertTrue(i === "dojo.data.api.Read");
				count++;
			}
			t.assertTrue(count === 1);
		},
		function testReadAPI_fetch_patternMatch(t){
			// summary:
			//		Function to test pattern matching of everything swith Cla in it
			// description:
			//		Function to test pattern matching of everything with Cla in it
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(4, items.length);
				var valueArray = ['.linkTestClass', '.linkTestClass .test', '.importTestClass', '.embeddedTestClass'];
				t.assertTrue(dojox.data.tests.stores.CssRuleStore.verifyItems(cssRuleStore, items, 'selector', valueArray));
				d.callback(true);
			}
			
			cssRuleStore.fetch({
				query: {'selector': '*TestCla*'},
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch_caseInsensitive(t){
			// summary:
			//		Function to test exact pattern match with case insensitivity set.
			// description:
			//		Function to test exact pattern match with case insensitivity set.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(1, items.length);
				t.assertTrue(cssRuleStore.getValue(items[0], 'selector') === '.linkTestClass');
				d.callback(true);
			}

			cssRuleStore.fetch({
				query: {'selector': '.LINKtEsTclass'},
				queryOptions: {ignoreCase: true},
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch_caseSensitive(t){
			// summary:
			//		Function to test exact pattern match with case insensitivity set.
			// description:
			//		Function to test exact pattern match with case insensitivity set.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(0, items.length);
				d.callback(true);
			}

			cssRuleStore.fetch({
				query: {'selector': '.LINKtEsTclass'},
				queryOptions: {ignoreCase: false},
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabetic(t){
			// summary:
			//		Function to test sorting alphabetic ordering.
			// description:
			//		Function to test sorting alphabetic ordering.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			var d = new doh.Deferred();
			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ 	'.embeddedTestClass',
										'.importTestClass',
										'.linkTestClass'
				];
				t.is(3, items.length);
				t.assertTrue(dojox.data.tests.stores.CssRuleStore.verifyItems(cssRuleStore, items, 'selector', orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: 'selector'}];
			cssRuleStore.fetch({
				query: {'selector': '*TestClass'},
				sort: sortAttributes,
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabeticDescending(t){
			// summary:
			//		Function to test sorting alphabetic ordering in descending mode.
			// description:
			//		Function to test sorting alphabetic ordering in descending mode.
			var cssRuleStore = dojox.data.tests.stores.CssRuleStore.createStore();
			var d = new doh.Deferred();


			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ 	'.linkTestClass',
										'.importTestClass',
										'.embeddedTestClass'
					];

				t.is(3, items.length);
				t.assertTrue(dojox.data.tests.stores.CssRuleStore.verifyItems(cssRuleStore, items, 'selector', orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "selector", descending: true}];
			cssRuleStore.fetch({
				query: {'selector': '*TestClass'},
				sort: sortAttributes,
				onComplete: completed,
				onError: dojo.partial(dojox.data.tests.stores.CssRuleStore.error, t, d)
			});
			return d; //Object
		},
		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			var testStore = dojox.data.tests.stores.CssRuleStore.createStore();
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
		}
	]
);


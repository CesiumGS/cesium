dojo.provide("dojox.data.tests.stores.CsvStore");
dojo.require("dojox.data.CsvStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojo.data.api.Identity");

dojox.data.tests.stores.CsvStore.getDatasource = function(filepath){
	// summary:
	//		A simple helper function for getting the sample data used in each of the tests.
	// description:
	//		A simple helper function for getting the sample data used in each of the tests.

	var dataSource = {};
	if(dojo.isBrowser){
		dataSource.url = require.toUrl("dojox/data/tests/"+filepath).toString();
	}else{
		// When running tests in Rhino, xhrGet is not available,
		// so we have the file data in the code below.
		var csvData;
		switch(filepath){
			case "stores/movies.csv":
				csvData += "Title, Year, Producer\n";
				csvData += "City of God, 2002, Katia Lund\n";
				csvData += "Rain,, Christine Jeffs\n";
				csvData += "2001: A Space Odyssey, 1968, Stanley Kubrick\n";
				csvData += '"This is a ""fake"" movie title", 1957, Sidney Lumet\n';
				csvData += "Alien, 1979   , Ridley Scott\n";
				csvData += '"The Sequel to ""Dances With Wolves.""", 1982, Ridley Scott\n';
				csvData += '"Caine Mutiny, The", 1954, "Dymtryk ""the King"", Edward"\n';
				break;
			case "stores/movies2.csv":
				csvData += "Title, Year, Producer\n";
				csvData += "City of God, 2002, Katia Lund\n";
				csvData += "Rain,\"\", Christine Jeffs\n";
				csvData += "2001: A Space Odyssey, 1968, Stanley Kubrick\n";
				csvData += '"This is a ""fake"" movie title", 1957, Sidney Lumet\n';
				csvData += "Alien, 1979   , Ridley Scott\n";
				csvData += '"The Sequel to ""Dances With Wolves.""", 1982, Ridley Scott\n';
				csvData += '"Caine Mutiny, The", 1954, "Dymtryk ""the King"", Edward"\n';
				break;
			case "stores/empty.csv":
				csvData += "Title, Year, Producer\n";
				break;
			case "stores/movies3.csv":
				csvData += "Title, Year, Producer\n";
				csvData += "\"City\n of God\", 2002, Katia Lund\n";
				csvData += "Rain,\"\", Christine Jeffs\n";
				csvData += "2001: A Space Odyssey, 1968, Stanley Kubrick\n";
				csvData += '"This is a ""fake"" movie title", 1957, Sidney Lumet\n';
				csvData += "Alien, 1979   , Ridley Scott\n";
				csvData += '"The Sequel to ""Dances With\n Wolves.""", 1982, Ridley Scott\n';
				csvData += '"Caine Mutiny, The", 1954, "Dymtryk ""the King"", Edward"\n';
				break;
			case "stores/books.csv":
				csvData += "Title, Author\n";
				csvData += "The Transparent Society, David Brin\n";
				csvData += "The First Measured Century, Theodore Caplow\n";
				csvData += "Maps in a Mirror, Orson Scott Card\n";
				csvData += "Princess Smartypants, Babette Cole\n";
				csvData += "Carfree Cities, Crawford J.H.\n";
				csvData += "Down and Out in the Magic Kingdom, Cory Doctorow\n";
				csvData += "Tax Shift, Alan Thein Durning\n";
				csvData += "The Sneetches and other stories, Dr. Seuss\n";
				csvData += "News from Tartary, Peter Fleming\n";
				break;
			case "stores/patterns.csv":
				csvData += "uniqueId, value\n";
				csvData += "9, jfq4@#!$!@Rf14r14i5u\n";
				csvData += "6, BaBaMaSaRa***Foo\n";
				csvData += "2, bar*foo\n";
				csvData += "8, 123abc\n";
				csvData += "4, bit$Bite\n";
				csvData += "3, 123abc\n";
				csvData += "10, 123abcdefg\n";
				csvData += "1, foo*bar\n";
				csvData += "7, \n";
				csvData += "5, 123abc\n";
				break;
			case "stores/semicolonSeparator.csv":
				csvData += "article;price\n";
				csvData += "1008;4,59\n";
				csvData += "1010;10,09\n";
				csvData += "1011;5,13\n";
				csvData += "1016;16,68\n";
				csvData += "1019;15,5\n";
				csvData += "1022;10,36\n";
				break;
			case "stores/pipeSeparator.csv":
				csvData += "article|price\n";
				csvData += "1008|4,59\n";
				csvData += "1010|10,09\n";
				csvData += "1011|5,13\n";
				csvData += "1016|16,68\n";
				csvData += "1019|15,5\n";
				csvData += "1022|10,36\n";
				break;
			case "stores/pipeSeparatorInData.csv":
				csvData += "article|price\n";
				csvData += "1008|\"4,59|4,54\"\n";
				csvData += "1010|10,09\n";
				csvData += "1011|5,13\n";
				csvData += "1016|16,68\n";
				csvData += "1019|15,5\n";
				csvData += "1022|10,36\n";
				break;
		}
		dataSource.data = csvData;
	}
	return dataSource; //Object
};

dojox.data.tests.stores.CsvStore.verifyItems = function(csvStore, items, attribute, compareArray){
	// summary:
	//		A helper function for validating that the items array is ordered
	//		the same as the compareArray
	if(items.length != compareArray.length){ return false; }
	for(var i = 0; i < items.length; i++){
		if(!(csvStore.getValue(items[i], attribute) === compareArray[i])){
			return false; //Boolean
		}
	}
	return true; //Boolean
};

dojox.data.tests.stores.CsvStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	for (var i in errData) {
		console.log(errData[i]);
	}
	d.errback(errData);
};

doh.register("dojox.data.tests.stores.CsvStore",
	[
		function testReadAPI_fetch_all(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore.
			// description:
			//		Simple test of a basic fetch on CsvStore.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue((items.length === 7));
				d.callback(true);
			}

			//Get everything...
			csvStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_all_empty(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore that's empty.
			// description:
			//		Simple test of a basic fetch on CsvStore that's empty.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/empty.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue((items.length === 0));
				d.callback(true);
			}

			//Get everything...
			csvStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_all_semicolon(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore with separator defined as |.
			// description:
			//		Simple test of a basic fetch on CsvStore with separator defined as |.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/semicolonSeparator.csv");
			args.separator = ";";
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertEqual(6, items.length);
				d.callback(true);
			}

			//Get everything...
			csvStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_all_pipe(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore with separator defined as |.
			// description:
			//		Simple test of a basic fetch on CsvStore with separator defined as |
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/pipeSeparator.csv");
			args.separator = "|";
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertEqual(6, items.length);
				d.callback(true);
			}

			//Get everything...
			csvStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_all_pipe_indata(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore with separator defined as |.
			// description:
			//		Simple test of a basic fetch on CsvStore with separator defined as |
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/pipeSeparatorInData.csv");
			args.separator = "|";
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertEqual(6, items.length);
				d.callback(true);
			}

			//Get everything...
			csvStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_all_withnewlinedCsv(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore loading a CSV file with quoted newlines.
			// description:
			//		Simple test of a basic fetch on CsvStore loading a CSV file with quoted newlines.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies3.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue((items.length === 7));
				d.callback(true);
			}

			//Get everything...
			csvStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_all_withEmptyStringField(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore.
			// description:
			//		Simple test of a basic fetch on CsvStore.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies2.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.assertTrue((items.length === 7));
				d.callback(true);
			}

			//Get everything...
			csvStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_one(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore of a single item.
			// description:
			//		Simple test of a basic fetch on CsvStore of a single item.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.is(1, items.length);
				d.callback(true);
			}
			csvStore.fetch({ 	query: {Title: "*Sequel*"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)
							});
			return d; //Object
		},
		function testReadAPI_fetch_one_preventcache(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore of a single item.
			// description:
			//		Simple test of a basic fetch on CsvStore of a single item.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			args.urlPreventCache = true;
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.is(1, items.length);
				d.callback(true);
			}
			csvStore.fetch({ 	query: {Title: "*Sequel*"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)
							});
			return d; //Object
		},
		function testReadAPI_fetch_Multiple(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore of a single item.
			// description:
			//		Simple test of a basic fetch on CsvStore of a single item.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
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
				csvStore.fetch({ 	query: {Title: "*Sequel*"},
									onComplete: onCompleteOne,
									onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)
								});
				csvStore.fetch({ 	query: {Title: "2001:*"},
									onComplete: onCompleteTwo,
									onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)
								});
			}
			catch(e)
			{
				for (var i in e) {
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

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
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
				t.is('Dymtryk "the King", Edward', csvStore.getValue(item,"Producer"));
				t.is('Caine Mutiny, The', csvStore.getValue(item,"Title"));
				if(done[0] && done[1]){
					d.callback(true);
				}
			}

			csvStore.fetch({ 	query: {Title: "*Sequel*"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)
							});
			
			csvStore.fetchItemByIdentity({identity: "6", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_all_streaming(t){
			// summary:
			//		Simple test of a basic fetch on CsvStore.
			// description:
			//		Simple test of a basic fetch on CsvStore.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			var count = 0;

			function onBegin(size, requestObj){
				t.assertTrue(size === 7);
			}
			function onItem(item, requestObj){
				t.assertTrue(csvStore.isItem(item));
				count++;
			}
			function onComplete(items, request){
				t.is(7, count);
				t.is(null, items);
			    d.callback(true);
			}

			//Get everything...
			csvStore.fetch({	onBegin: onBegin,
								onItem: onItem,
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)
							});
			return d; //Object
		},
		function testReadAPI_fetch_paging(t){
			 // summary:
			 //		Test of multiple fetches on a single result.  Paging, if you will.
			 // description:
			 //		Test of multiple fetches on a single result.  Paging, if you will.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();

			function dumpSixthFetch(items, request){
				t.is(5, items.length);
			    d.callback(true);
			}

			function dumpFifthFetch(items, request){
				t.is(0, items.length);
				request.start = 2;
				request.count = 20;
				request.onComplete = dumpSixthFetch;
				csvStore.fetch(request);
			}

			function dumpFourthFetch(items, request){
				t.is(5, items.length);
				request.start = 9;
				request.count = 100;
				request.onComplete = dumpFifthFetch;
				csvStore.fetch(request);
			}

			function dumpThirdFetch(items, request){
				t.is(5, items.length);
				request.start = 2;
				request.count = 20;
				request.onComplete = dumpFourthFetch;
				csvStore.fetch(request);
			}

			function dumpSecondFetch(items, request){
				t.is(1, items.length);
				request.start = 0;
				request.count = 5;
				request.onComplete = dumpThirdFetch;
				csvStore.fetch(request);
			}

			function dumpFirstFetch(items, request){
				t.is(5, items.length);
				request.start = 3;
				request.count = 1;
				request.onComplete = dumpSecondFetch;
				csvStore.fetch(request);
			}

			function completed(items, request){
				t.is(7, items.length);
				request.start = 1;
				request.count = 5;
				request.onComplete = dumpFirstFetch;
				csvStore.fetch(request);
			}

			csvStore.fetch({onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		
		function testReadAPI_getLabel(t){
			// summary:
			//		Simple test of the getLabel function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabel function against a store set that has a label defined.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			args.label = "Title";
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var label = csvStore.getLabel(items[0]);
				t.assertTrue(label !== null);
				t.assertEqual("The Sequel to \"Dances With Wolves.\"", label);
				d.callback(true);
			}
			csvStore.fetch({ 	query: {Title: "*Sequel*"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)
							});
			return d;
		},
		function testReadAPI_getLabelAttributes(t){
			// summary:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.

			 var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			 args.label = "Title";
			 var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var labelList = csvStore.getLabelAttributes(items[0]);
				t.assertTrue(dojo.isArray(labelList));
				t.assertEqual("Title", labelList[0]);
				d.callback(true);
			}
			csvStore.fetch({ 	query: {Title: "*Sequel*"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)
							});
			return d;
		},
		function testReadAPI_getValue(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is('Dymtryk "the King", Edward', csvStore.getValue(item,"Producer"));
				t.is('Caine Mutiny, The', csvStore.getValue(item,"Title"));
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "6", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},
		function testReadAPI_getValue_2(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is("City of God", csvStore.getValue(item,"Title"));
				t.is("2002", csvStore.getValue(item,"Year"));
				d.callback(true);
			}
            csvStore.fetchItemByIdentity({identity: "0", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},
		function testReadAPI_getValue_3(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is("1979", csvStore.getValue(item,"Year"));
				t.is("Alien", csvStore.getValue(item,"Title"));
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "4", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},
		function testReadAPI_getValue_4(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.is("2001: A Space Odyssey", csvStore.getValue(item,"Title"));
				t.is("Stanley Kubrick", csvStore.getValue(item,"Producer"));
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "2", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},

		function testReadAPI_getValues(t){
			// summary:
			//		Simple test of the getValues function of the store.
			// description:
			//		Simple test of the getValues function of the store.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				var names = csvStore.getValues(item,"Title");
				t.assertTrue(dojo.isArray(names));
				t.is(1, names.length);
				t.is("Rain", names[0]);
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},

		function testIdentityAPI_fetchItemByIdentity_withDefinedIdentifier(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			args.identifier = "Title";
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "City of God", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},

		function testIdentityAPI_fetchItemByIdentity_withDefinedIdentifier_bad1(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			args.identifier = "Title";
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "No Such Title", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},

		function testIdentityAPI_fetchItemByIdentity_bad1(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "7", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity_bad2(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "-1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity_bad3(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "999999", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_getIdentity(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(7, items.length);
				var passed = true;
				for(var i = 0; i < items.length; i++){
					if(!(csvStore.getIdentity(items[i]) === i)){
						passed=false;
						break;
					}
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			
			//Get everything...
			csvStore.fetch({ onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},

		function testIdentityAPI_getIdentity_withDefinedIdentifier(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			args.identifier = "Title";
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(7, items.length);
				var passed = true;
				for(var i = 0; i < items.length; i++){
					if(!csvStore.getIdentity(items[i])){
                        passed=false;
						break;
					}
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			
			//Get everything...
			csvStore.fetch({ onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},

		function testIdentityAPI_getIdentity_withBadDefinedIdentifier(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			args.identifier = "Not Column";
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				d.errback(new Error("Unexpected callback of success in failure case."));
			}
			function error(err){
				d.callback(true);
			}
			
			//Get everything...
			csvStore.fetch({onComplete: completed, onError: error});
			return d; //Object
		},

		function testIdentityAPI_getIdentityAttributes(t){
			// summary:
			//		Simple test of the getIdentityAttributes
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(csvStore.isItem(item));
				t.assertEqual(null, csvStore.getIdentityAttributes(item));
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
		   	return d;
		},
		function testReadAPI_isItem(t){
			// summary:
			//		Simple test of the isItem function of the store
			// description:
			//		Simple test of the isItem function of the store

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(csvStore.isItem(item));
				t.assertTrue(!csvStore.isItem({}));
				t.assertTrue(!csvStore.isItem({ item: "not an item" }));
				t.assertTrue(!csvStore.isItem("not an item"));
				t.assertTrue(!csvStore.isItem(["not an item"]));
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
		   	return d;
		},
		function testReadAPI_hasAttribute(t){
			// summary:
			//		Simple test of the hasAttribute function of the store
			// description:
			//		Simple test of the hasAttribute function of the store

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(csvStore.hasAttribute(item, "Title"));
				t.assertTrue(csvStore.hasAttribute(item, "Producer"));
				t.assertTrue(!csvStore.hasAttribute(item, "Year"));
				t.assertTrue(!csvStore.hasAttribute(item, "Nothing"));
				t.assertTrue(!csvStore.hasAttribute(item, "title"));

				//Test that null attributes throw an exception
				var passed = false;
				try{
					csvStore.hasAttribute(item, null);
				}catch (e){
					passed = true;
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
		   	return d;
		},
		function testReadAPI_containsValue(t){
			// summary:
			//		Simple test of the containsValue function of the store
			// description:
			//		Simple test of the containsValue function of the store

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
 			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(csvStore.containsValue(item, "Title", "Alien"));
				t.assertTrue(csvStore.containsValue(item, "Year", "1979"));
				t.assertTrue(csvStore.containsValue(item, "Producer", "Ridley Scott"));
				t.assertTrue(!csvStore.containsValue(item, "Title", "Alien2"));
				t.assertTrue(!csvStore.containsValue(item, "Year", "1979   "));
				t.assertTrue(!csvStore.containsValue(item, "Title", null));

				//Test that null attributes throw an exception
				var passed = false;
				try{
					csvStore.containsValue(item, null, "foo");
				}catch (e){
					passed = true;
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "4", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
		   	return d;
		},
		function testReadAPI_getAttributes(t){
			// summary:
			//		Simple test of the getAttributes function of the store
			// description:
			//		Simple test of the getAttributes function of the store

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				t.assertTrue(csvStore.isItem(item));

				var attributes = csvStore.getAttributes(item);
				t.is(3, attributes.length);
				for(var i = 0; i < attributes.length; i++){
					t.assertTrue((attributes[i] === "Title" || attributes[i] === "Year" || attributes[i] === "Producer"));
				}
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "4", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
		   	return d;
		},

		function testReadAPI_getAttributes_onlyTwo(t){
			// summary:
			//		Simple test of the getAttributes function of the store
			// description:
			//		Simple test of the getAttributes function of the store

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function onItem(item){
				// Test an item that does not have all of the attributes
				t.assertTrue(item !== null);
				t.assertTrue(csvStore.isItem(item));

				var attributes = csvStore.getAttributes(item);
				t.assertTrue(attributes.length === 2);
				t.assertTrue(attributes[0] === "Title");
				t.assertTrue(attributes[1] === "Producer");
				d.callback(true);
			}
			csvStore.fetchItemByIdentity({identity: "1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
		   	return d;
		},

		function testReadAPI_getFeatures(t){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var features = csvStore.getFeatures();
			var count = 0;
			for(var i in features){
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

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function completed(items, request){
				t.is(2, items.length);
				var valueArray = [ "Alien", "The Sequel to \"Dances With Wolves.\""];
				t.assertTrue(dojox.data.tests.stores.CsvStore.verifyItems(csvStore, items, "Title", valueArray));
				d.callback(true);
			}
			
			csvStore.fetch({query: {Producer: "* Scott"}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch1(t){
			// summary:
			//		Function to test pattern matching of everything with $ in it.
			// description:
			//		Function to test pattern matching of everything with $ in it.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/patterns.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.assertTrue(items.length === 2);
				var valueArray = [ "jfq4@#!$!@Rf14r14i5u", "bit$Bite"];
				t.assertTrue(dojox.data.tests.stores.CsvStore.verifyItems(csvStore, items, "value", valueArray));
				d.callback(true);
			}
			
			csvStore.fetch({query: {value: "*$*"}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch2(t){
			// summary:
			//		Function to test exact pattern match
			// description:
			//		Function to test exact pattern match
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/patterns.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(1, items.length);
				t.assertTrue(csvStore.getValue(items[0], "value") === "bar*foo");
				d.callback(true);
			}
			
			csvStore.fetch({query: {value: "bar\\*foo"}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch_caseInsensitive(t){
			// summary:
			//		Function to test exact pattern match with case insensitivity set.
			// description:
			//		Function to test exact pattern match with case insensitivity set.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/patterns.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(1, items.length);
				t.assertTrue(csvStore.getValue(items[0], "value") === "bar*foo");
				d.callback(true);
			}
			
			csvStore.fetch({query: {value: "BAR\\*foo"}, queryOptions: {ignoreCase: true}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch_caseSensitive(t){
			// summary:
			//		Function to test exact pattern match with case insensitivity set.
			// description:
			//		Function to test exact pattern match with case insensitivity set.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/patterns.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(0, items.length);
				d.callback(true);
			}
			
			csvStore.fetch({query: {value: "BAR\\*foo"}, queryOptions: {ignoreCase: false}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortNumeric(t){
			// summary:
			//		Function to test sorting numerically.
			// description:
			//		Function to test sorting numerically.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/patterns.csv");
			var csvStore = new dojox.data.CsvStore(args);

			var d = new doh.Deferred();
			function completed(items, request){
				t.assertTrue(items.length === 10);
				// TODO: CsvStore treats everything like a string, so these numbers will be sorted lexicographically.
				var orderedArray = [ "1", "10", "2", "3", "4", "5", "6", "7", "8", "9" ];
				t.assertTrue(dojox.data.tests.stores.CsvStore.verifyItems(csvStore, items, "uniqueId", orderedArray));
				d.callback(true);
			}

			var sortAttributes = [{attribute: "uniqueId"}];
			csvStore.fetch({onComplete: completed,
							onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d),
							sort: sortAttributes});
			return d; //Object
		},
		function testReadAPI_fetch_sortNumericDescending(t){
			// summary:
			//		Function to test sorting numerically.
			// description:
			//		Function to test sorting numerically.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/patterns.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(10, items.length);
				// TODO: CsvStore treats everything like a string, so these numbers will be sorted lexicographically.
				var orderedArray = [ "9", "8", "7", "6", "5", "4", "3", "2", "10", "1" ];
				t.assertTrue(dojox.data.tests.stores.CsvStore.verifyItems(csvStore, items, "uniqueId", orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "uniqueId", descending: true}];
			csvStore.fetch({ sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortNumericWithCount(t){
			// summary:
			//		Function to test sorting numerically in descending order, returning only a specified number of them.
			// description:
			//		Function to test sorting numerically in descending order, returning only a specified number of them.
		
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/patterns.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(5, items.length);
				// TODO: CsvStore treats everything like a string, so these numbers will be sorted lexicographically.
				var orderedArray = [ "9", "8", "7", "6", "5" ];
				t.assertTrue(dojox.data.tests.stores.CsvStore.verifyItems(csvStore, items, "uniqueId", orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "uniqueId", descending: true}];
			csvStore.fetch({sort: sortAttributes,
							count: 5,
							onComplete: completed,
							onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabetic(t){
			// summary:
			//		Function to test sorting alphabetic ordering.
			// description:
			//		Function to test sorting alphabetic ordering.
		
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/patterns.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ 	"123abc",
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
				t.is(10, items.length);
				t.assertTrue(dojox.data.tests.stores.CsvStore.verifyItems(csvStore, items, "value", orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "value"}];
			csvStore.fetch({sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabeticDescending(t){
			// summary:
			//		Function to test sorting alphabetic ordering in descending mode.
			// description:
			//		Function to test sorting alphabetic ordering in descending mode.
		
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/patterns.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ 	undefined,
										"jfq4@#!$!@Rf14r14i5u",
										"foo*bar",
										"bit$Bite",
										"bar*foo",
										"BaBaMaSaRa***Foo",
										"123abcdefg",
										"123abc",
										"123abc",
										"123abc"
					];
				t.is(10, items.length);
				t.assertTrue(dojox.data.tests.stores.CsvStore.verifyItems(csvStore, items, "value", orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "value", descending: true}];
			csvStore.fetch({sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortMultiple(t){
			// summary:
			//		Function to test sorting on multiple attributes.
			// description:
			//		Function to test sorting on multiple attributes.
			
			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/patterns.csv");
			var csvStore = new dojox.data.CsvStore(args);
		
			var d = new doh.Deferred();
			function completed(items, request){
				var orderedArray0 = [ "8", "5", "3", "10", "6", "2", "4", "1", "9", "7" ];
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
				t.is(10, items.length);
				t.assertTrue(dojox.data.tests.stores.CsvStore.verifyItems(csvStore, items, "uniqueId", orderedArray0));
				t.assertTrue(dojox.data.tests.stores.CsvStore.verifyItems(csvStore, items, "value", orderedArray1));
				d.callback(true);
			}
			
			var sortAttributes = [{ attribute: "value"}, { attribute: "uniqueId", descending: true}];
			csvStore.fetch({sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortMultipleSpecialComparator(t){
			// summary:
			//		Function to test sorting on multiple attributes with a custom comparator.
			// description:
			//		Function to test sorting on multiple attributes with a custom comparator.

			var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
			var csvStore = new dojox.data.CsvStore(args);
			
			csvStore.comparatorMap = {};
			csvStore.comparatorMap["Producer"] = function(a,b){
				var ret = 0;
				// We want to sort authors alphabetical by their last name
				function lastName(name){
					if(typeof name === "undefined"){ return undefined; }
					
					var matches = name.match(/\s*(\S+)$/); // Grab the last word in the string.
					return matches ? matches[1] : name; // Strings with only whitespace will not match.
				}
				var lastNameA = lastName(a);
				var lastNameB = lastName(b);
				if(lastNameA > lastNameB || typeof lastNameA === "undefined"){
					ret = 1;
				}else if(lastNameA < lastNameB || typeof lastNameB === "undefined"){
					ret = -1;
				}
				return ret;
			};
		
			var sortAttributes = [{attribute: "Producer", descending: true}, { attribute: "Title", descending: true}];
		
			var d = new doh.Deferred();
			function completed(items, findResult){
				var orderedArray = [5,4,0,3,2,1,6];
				t.assertTrue(items.length === 7);
				var passed = true;
				for(var i = 0; i < items.length; i++){
					if(!(csvStore.getIdentity(items[i]) === orderedArray[i])){
						passed=false;
						break;
					}
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			
			csvStore.fetch({sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.CsvStore.error, t, d)});
			return d; //Object
		},

		{
			name: "testReadAPI_fetch_abort",
			runTest: function(t){
				// summary:
				//		Simple test of a basic fetch abort on CsvStore.
				// description:
				//		Simple test of a basic fetch abort on CsvStore.
				//		Can only async abort in a browser, so disable this test from rhino
				if(dojo.isBrowser){
					var args = dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv");
					var store = new dojox.data.CsvStore(args);
				
					var d = new doh.Deferred();
					var abortCalled = false;
					var completedAll = function(items, request){
						t.is(7, items.length);
						if(abortCalled){
							console.log("Made it to complete callback and abort was called.  Problem.");
							d.errback(new Error("Should not be here."));
						}else{
							//We beat out calling abort, so this is okay.  Timing.
							console.log("in onComplete and abort has not been called.  Timing.  This is okay.");
							d.callback(true);
						}
					};
					var error = function(errData, request){
						//An abort should throw a cancel error, so we should
						//reach this.
						t.assertTrue(true);
						d.callback(true);
					};
	
					//Get everything...
					var req = store.fetch({ onComplete: completedAll, onError: error});
					abortCalled=true;
					console.log("Calling abort.");
					req.abort();
					return d;
				}
			}
		},

		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = new dojox.data.CsvStore(dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv"));
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
		function testIdentityAPI_functionConformance(t){
			// summary:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = new dojox.data.CsvStore(dojox.data.tests.stores.CsvStore.getDatasource("stores/movies.csv"));
			var identityApi = new dojo.data.api.Identity();
			var passed = true;

			for(var i in identityApi){
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


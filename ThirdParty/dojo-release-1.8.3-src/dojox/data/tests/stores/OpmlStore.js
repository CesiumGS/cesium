dojo.provide("dojox.data.tests.stores.OpmlStore");
dojo.require("dojox.data.OpmlStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojo.data.api.Identity");

dojox.data.tests.stores.OpmlStore.getDatasource = function(filepath){
	// summary:
	//		A simple helper function for getting the sample data used in each of the tests.
	// description:
	//		A simple helper function for getting the sample data used in each of the tests.
	
	var dataSource = {};
	if(dojo.isBrowser){
		dataSource.url = require.toUrl("dojox/data/tests/" + filepath).toString();
	}else{
		// When running tests in Rhino, xhrGet is not available,
		// so we have the file data in the code below.
		switch(filepath){
			case "stores/geography.xml":
				var opmlData = "";
				opmlData += '<?xml version="1.0" encoding="ISO-8859-1"?>\n';
				opmlData += '	<opml version="1.0">\n';
				opmlData += '		<head>\n';
				opmlData += '			<title>geography.opml</title>\n';
				opmlData += '			<dateCreated>2006-11-10</dateCreated>\n';
				opmlData += '			<dateModified>2006-11-13</dateModified>\n';
				opmlData += '			<ownerName>Magellan, Ferdinand</ownerName>\n';
				opmlData += '		</head>\n';
				opmlData += '		<body>\n';
				opmlData += '			<outline text="Africa" type="continent">\n';
				opmlData += '				<outline text="Egypt" type="country"/>\n';
				opmlData += '				<outline text="Kenya" type="country">\n';
				opmlData += '					<outline text="Nairobi" type="city"/>\n';
				opmlData += '					<outline text="Mombasa" type="city"/>\n';
				opmlData += '				</outline>\n';
				opmlData += '				<outline text="Sudan" type="country">\n';
				opmlData += '					<outline text="Khartoum" type="city"/>\n';
				opmlData += '				</outline>\n';
				opmlData += '			</outline>\n';
				opmlData += '			<outline text="Asia" type="continent">\n';
				opmlData += '				<outline text="China" type="country"/>\n';
				opmlData += '				<outline text="India" type="country"/>\n';
				opmlData += '				<outline text="Russia" type="country"/>\n';
				opmlData += '				<outline text="Mongolia" type="country"/>\n';
				opmlData += '			</outline>\n';
				opmlData += '			<outline text="Australia" type="continent" population="21 million">\n';
				opmlData += '				<outline text="Australia" type="country" population="21 million"/>\n';
				opmlData += '			</outline>\n';
				opmlData += '			<outline text="Europe" type="continent">\n';
				opmlData += '				<outline text="Germany" type="country"/>\n';
				opmlData += '				<outline text="France" type="country"/>\n';
				opmlData += '				<outline text="Spain" type="country"/>\n';
				opmlData += '				<outline text="Italy" type="country"/>\n';
				opmlData += '			</outline>\n';
				opmlData += '			<outline text="North America" type="continent">\n';
				opmlData += '				<outline text="Mexico" type="country" population="108 million" area="1,972,550 sq km">\n';
				opmlData += '					<outline text="Mexico City" type="city" population="19 million" timezone="-6 UTC"/>\n';
				opmlData += '					<outline text="Guadalajara" type="city" population="4 million" timezone="-6 UTC"/>\n';
				opmlData += '				</outline>\n';
				opmlData += '				<outline text="Canada" type="country" population="33 million" area="9,984,670 sq km">\n';
				opmlData += '					<outline text="Ottawa" type="city" population="0.9 million" timezone="-5 UTC"/>\n';
				opmlData += '					<outline text="Toronto" type="city" population="2.5 million" timezone="-5 UTC"/>\n';
				opmlData += '				</outline>\n';
				opmlData += '				<outline text="United States of America" type="country"/>\n';
				opmlData += '			</outline>\n';
				opmlData += '			<outline text="South America" type="continent">\n';
				opmlData += '				<outline text="Brazil" type="country" population="186 million"/>\n';
				opmlData += '				<outline text="Argentina" type="country" population="40 million"/>\n';
				opmlData += '			</outline>\n';
				opmlData += '		</body>\n';
				opmlData += '	</opml>\n';
				break;
			case "stores/geography_withspeciallabel.xml":
				var opmlData = "";
				opmlData += '<?xml version="1.0" encoding="ISO-8859-1"?>\n';
				opmlData += '<opml version="1.0">\n';
				opmlData += '	<head>\n';
				opmlData += '		<title>geography.opml</title>\n';
				opmlData += '		<dateCreated>2006-11-10</dateCreated>\n';
				opmlData += '		<dateModified>2006-11-13</dateModified>\n';
				opmlData += '		<ownerName>Magellan, Ferdinand</ownerName>\n';
				opmlData += '	</head>\n';
				opmlData += '	<body>\n';
				opmlData += '		<outline text="Africa" type="continent" label="Continent/Africa">\n';
				opmlData += '			<outline text="Egypt" type="country" label="Country/Egypt"/>\n';
				opmlData += '			<outline text="Kenya" type="country" label="Country/Kenya">\n';
				opmlData += '				<outline text="Nairobi" type="city" label="City/Nairobi"/>\n';
				opmlData += '				<outline text="Mombasa" type="city" label="City/Mombasa"/>\n';
				opmlData += '			</outline>\n';
				opmlData += '			<outline text="Sudan" type="country" label="Country/Sudan">\n';
				opmlData += '				<outline text="Khartoum" type="city" label="City/Khartoum"/>\n';
				opmlData += '			</outline>\n';
				opmlData += '		</outline>\n';
				opmlData += '		<outline text="Asia" type="continent" label="Continent/Asia">\n';
				opmlData += '			<outline text="China" type="country" label="Country/China"/>\n';
				opmlData += '			<outline text="India" type="country" label="Country/India"/>\n';
				opmlData += '			<outline text="Russia" type="country" label="Country/Russia"/>\n';
				opmlData += '			<outline text="Mongolia" type="country" label="Country/Mongolia"/>\n';
				opmlData += '		</outline>\n';
				opmlData += '		<outline text="Australia" type="continent" population="21 million" label="Continent/Australia">\n';
				opmlData += '			<outline text="Australia" type="country" population="21 million" label="Country/Australia"/>\n';
				opmlData += '		</outline>\n';
				opmlData += '		<outline text="Europe" type="continent" label="Contintent/Europe">\n';
				opmlData += '			<outline text="Germany" type="country" label="Country/Germany"/>\n';
				opmlData += '			<outline text="France" type="country"  label="Country/France"/>\n';
				opmlData += '			<outline text="Spain" type="country"   label="Country/Spain"/>\n';
				opmlData += '			<outline text="Italy" type="country"   label="Country/Italy"/>\n';
				opmlData += '		</outline>\n';
				opmlData += '		<outline text="North America" type="continent" label="Continent/North America">\n';
				opmlData += '			<outline text="Mexico" type="country" population="108 million" area="1,972,550 sq km" label="Country/Mexico">\n';
				opmlData += '				<outline text="Mexico City" type="city" population="19 million" timezone="-6 UTC" label="City/Mexico City"/>\n';
				opmlData += '				<outline text="Guadalajara" type="city" population="4 million" timezone="-6 UTC"  label="City/Guadalajara"/>\n';
				opmlData += '			</outline>\n';
				opmlData += '			<outline text="Canada" type="country" population="33 million" area="9,984,670 sq km" label="Country/Canada">\n';
				opmlData += '				<outline text="Ottawa" type="city" population="0.9 million" timezone="-5 UTC"    label="City/Ottawa"/>\n';
				opmlData += '				<outline text="Toronto" type="city" population="2.5 million" timezone="-5 UTC"   label="City/Toronto"/>\n';
				opmlData += '			</outline>\n';
				opmlData += '			<outline text="United States of America" type="country" label="Country/United States of America"/>\n';
				opmlData += '		</outline>\n';
				opmlData += '		<outline text="South America" type="continent" label="Continent/South America">\n';
				opmlData += '			<outline text="Brazil" type="country" population="186 million" label="Country/Brazil"/>\n';
				opmlData += '			<outline text="Argentina" type="country" population="40 million" label="Country/Argentina"/>\n';
				opmlData += '		</outline>\n';
				opmlData += '	</body>\n';
				opmlData += '</opml>\n';
				break;
		}
		dataSource.data = opmlData;
	}
	return dataSource; //Object
};

dojox.data.tests.stores.OpmlStore.verifyItems = function(opmlStore, items, attribute, compareArray){
	// summary:
	//		A helper function for validating that the items array is ordered
	//		the same as the compareArray
	if(items.length != compareArray.length){ return false; }
	for(var i = 0; i < items.length; i++){
		if(!(opmlStore.getValue(items[i], attribute) === compareArray[i])){
			return false; //Boolean
		}
	}
	return true; //Boolean
};

dojox.data.tests.stores.OpmlStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	d.errback(errData);
};

doh.register("dojox.data.tests.stores.OpmlStore",
	[
		function testReadAPI_fetch_all(t){
			// summary:
			//		Simple test of a basic fetch on OpmlStore.
			// description:
			//		Simple test of a basic fetch on OpmlStore.
			
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.is(6, items.length);
				d.callback(true);
			}

			//Get everything...
			opmlStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_one(t){
			// summary:
			//		Simple test of a basic fetch on OpmlStore of a single item.
			// description:
			//		Simple test of a basic fetch on OpmlStore of a single item.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.is(1, items.length);
				d.callback(true);
			}
			opmlStore.fetch({ 	query: {text: "Asia"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});
			return d; //Object
		},

		function testReadAPI_fetch_one_Multiple(t){
			// summary:
			//		Simple test of a basic fetch on OpmlStore of a single item.
			// description:
			//		Simple test of a basic fetch on OpmlStore of a single item.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			var done = [false,false];
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

			opmlStore.fetch({ 	query: {text: "Asia"},
								onComplete: onCompleteOne,
								onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});

			opmlStore.fetch({ 	query: {text: "North America"},
								onComplete: onCompleteTwo,
								onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});

			return d; //Object
		},

		function testReadAPI_fetch_one_MultipleMixed(t){
			// summary:
			//		Simple test of a basic fetch on OpmlStore of a single item mixing two fetch types.
			// description:
			//		Simple test of a basic fetch on Cpmltore of a single item mixing two fetch types.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();

			var done = [false, false];
			function onComplete(items, request){
				done[0] = true;
				t.is(1, items.length);
				console.log("Found item: " + opmlStore.getValue(items[0],"text") + " with identity: " + opmlStore.getIdentity(items[0]));
				t.is(0, opmlStore.getIdentity(items[0]));
				if(done[0] && done[1]){
					d.callback(true);
				}
			}
			
			function onItem(item){
				done[1] = true;
				t.assertTrue(item !== null);
				console.log("Found item: " + opmlStore.getValue(item,"text"));
				t.is('Egypt', opmlStore.getValue(item,"text")); //Should be the second node parsed, ergo id 1, first node is id 0.
				t.is(1, opmlStore.getIdentity(item));
				if(done[0] && done[1]){
					d.callback(true);
				}
			}

			opmlStore.fetch({ 	query: {text: "Africa"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});
			
            opmlStore.fetchItemByIdentity({identity: "1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});

			return d; //Object
		},

		function testReadAPI_fetch_one_deep(t){
			// summary:
			//		Simple test of a basic fetch on OpmlStore of a single item that's nested down as a child item.
			// description:
			//		Simple test of a basic fetch on OpmlStore of a single item that's nested down as a child item.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.is(1, items.length);
				d.callback(true);
			}
			opmlStore.fetch({ 	query: {text: "Mexico City"},
								queryOptions: {deep:true},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});
			return d; //Object
		},

		function testReadAPI_fetch_one_deep_off(t){
			// summary:
			//		Simple test of a basic fetch on OpmlStore of a single item that's nested down as a child item.
			// description:
			//		Simple test of a basic fetch on OpmlStore of a single item that's nested down as a child item.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				//Nothing should be found.
				t.is(0, items.length);
				d.callback(true);
			}
			opmlStore.fetch({ 	query: {text: "Mexico City"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});
			return d; //Object
		},

		function testReadAPI_fetch_all_streaming(t){
			// summary:
			//		Simple test of a basic fetch on OpmlStore.
			// description:
			//		Simple test of a basic fetch on OpmlStore.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);

			var d = new doh.Deferred();
			count = 0;

			function onBegin(size, requestObj){
				t.is(6, size);
			}
			function onItem(item, requestObj){
				t.assertTrue(opmlStore.isItem(item));
				count++;
			}
			function onComplete(items, request){
				t.is(6, count);
				t.is(null, items);
				d.callback(true);
			}

			//Get everything...
			opmlStore.fetch({	onBegin: onBegin,
								onItem: onItem,
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});
			return d; //Object
		},
		function testReadAPI_fetch_paging(t){
			 // summary:
			 //		Test of multiple fetches on a single result.  Paging, if you will.
			 // description:
			 //		Test of multiple fetches on a single result.  Paging, if you will.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function dumpFirstFetch(items, request){
				t.is(5, items.length);
				request.start = 3;
				request.count = 1;
				request.onComplete = dumpSecondFetch;
				opmlStore.fetch(request);
			}

			function dumpSecondFetch(items, request){
				t.is(1, items.length);
				request.start = 0;
				request.count = 5;
				request.onComplete = dumpThirdFetch;
				opmlStore.fetch(request);
			}

			function dumpThirdFetch(items, request){
				t.is(5, items.length);
				request.start = 2;
				request.count = 20;
				request.onComplete = dumpFourthFetch;
				opmlStore.fetch(request);
			}

			function dumpFourthFetch(items, request){
				t.is(4, items.length);
				request.start = 9;
				request.count = 100;
				request.onComplete = dumpFifthFetch;
				opmlStore.fetch(request);
			}

			function dumpFifthFetch(items, request){
				t.is(0, items.length);
				request.start = 2;
				request.count = 20;
				request.onComplete = dumpSixthFetch;
				opmlStore.fetch(request);
			}

			function dumpSixthFetch(items, request){
				t.is(4, items.length);
			    d.callback(true);
			}

			function completed(items, request){
				t.is(6, items.length);
				request.start = 1;
				request.count = 5;
				request.onComplete = dumpFirstFetch;
				opmlStore.fetch(request);
			}

			opmlStore.fetch({onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object

		},
		function testReadAPI_getLabel(t){
			// summary:
			//		Simple test of the getLabel function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabel function against a store set that has a label defined.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var label = opmlStore.getLabel(items[0]);
				t.assertTrue(label !== null);
				t.assertEqual("Asia", label);
				d.callback(true);
			}
			opmlStore.fetch({ 	query: {text: "Asia"},
						   		onComplete: onComplete,
						   		onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
						   	});
			return d;
		},
		function testReadAPI_getLabelAttributes(t){
			// summary:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var labelList = opmlStore.getLabelAttributes(items[0]);
				t.assertTrue(dojo.isArray(labelList));
				t.assertEqual("text", labelList[0]);
				d.callback(true);
			}
			opmlStore.fetch({ 	query: {text: "Asia"},
							   	onComplete: onComplete,
							   	onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});
			return d;
		},

		function testReadAPI_getLabel_nondefault(t){
			// summary:
			//		Simple test of the getLabel function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabel function against a store set that has a label defined.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography_withspeciallabel.xml");
			args.label="label";
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var label = opmlStore.getLabel(items[0]);
				t.assertTrue(label !== null);
				t.assertEqual("Continent/Asia", label);
				d.callback(true);
			}
			opmlStore.fetch({ 	query: {text: "Asia"},
						   		onComplete: onComplete,
						   		onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
						   	});
			return d;
		},
		function testReadAPI_getLabelAttributes_nondefault(t){
			// summary:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.
			// description:
			//		Simple test of the getLabelAttributes function against a store set that has a label defined.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography_withspeciallabel.xml");
			args.label="label";
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function onComplete(items, request){
				t.assertEqual(items.length, 1);
				var labelList = opmlStore.getLabelAttributes(items[0]);
				t.assertTrue(dojo.isArray(labelList));
				t.assertEqual("label", labelList[0]);
				d.callback(true);
			}
			opmlStore.fetch({ 	query: {text: "Asia"},
							   	onComplete: onComplete,
							   	onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});
			return d;
		},

		function testReadAPI_getValue(t){
			// summary:
			//		Simple test of the getValue function of the store.
			// description:
			//		Simple test of the getValue function of the store.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function completedAll(items){
				t.is(6, items.length);
				
				t.is("Africa", 		opmlStore.getValue(items[0],"text"));
				t.is("Asia", 		opmlStore.getValue(items[1],"text"));
				t.is("Australia", 	opmlStore.getValue(items[2],"text"));
				t.is("Europe", 		opmlStore.getValue(items[3],"text"));
				t.is("North America", 	opmlStore.getValue(items[4],"text"));
				t.is("South America",	opmlStore.getValue(items[5],"text"));
	
				t.is("continent", 	opmlStore.getValue(items[1],"type"));
				t.is("21 million", 	opmlStore.getValue(items[2],"population"));
				
				var firstChild = opmlStore.getValue(items[4],"children");
				t.assertTrue(opmlStore.isItem(firstChild));
				t.is("Mexico", 		opmlStore.getValue(firstChild,"text"));
				t.is("country", 	opmlStore.getValue(firstChild,"type"));
				t.is("108 million", 	opmlStore.getValue(firstChild,"population"));
				t.is("1,972,550 sq km", opmlStore.getValue(firstChild,"area"));
				
				firstChild = opmlStore.getValue(firstChild,"children");
				t.assertTrue(opmlStore.isItem(firstChild));
				t.is("Mexico City", 	opmlStore.getValue(firstChild,"text"));
				t.is("city", 		opmlStore.getValue(firstChild,"type"));
				t.is("19 million", 	opmlStore.getValue(firstChild,"population"));
				t.is("-6 UTC", 		opmlStore.getValue(firstChild,"timezone"));
				
				d.callback(true);
			}

			//Get everything...
			opmlStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_getValues(t){
			// summary:
			//		Simple test of the getValues function of the store.
			// description:
			//		Simple test of the getValues function of the store.

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);

			var d = new doh.Deferred();
			function completed(items){
				t.is(1, items.length);
				
				var children = opmlStore.getValues(items[0],"children");
				t.is(3, children.length);
				for(var i=0; i<children.length; i++){
					t.assertTrue(opmlStore.isItem(children[i]));
				}
				
				t.is("Mexico", 		opmlStore.getValues(children[0],"text")[0]);
				t.is("country", 	opmlStore.getValues(children[0],"type")[0]);
				t.is("108 million", 	opmlStore.getValues(children[0],"population")[0]);
				t.is("1,972,550 sq km", opmlStore.getValues(children[0],"area")[0]);
				
				t.is("Canada", 		opmlStore.getValues(children[1],"text")[0]);
				t.is("country", 	opmlStore.getValues(children[1],"type")[0]);
				
				children = opmlStore.getValues(children[1],"children");
				t.is(2, children.length);
				for(var i=0; i<children.length; i++){
					t.assertTrue(opmlStore.isItem(children[i]));
				}
				t.is("Ottawa", 	opmlStore.getValues(children[0],"text")[0]);
				t.is("Toronto", opmlStore.getValues(children[1],"text")[0]);
								
				d.callback(true);
			}

			//Get one item...
			opmlStore.fetch({	query: {text: "North America"},
								onComplete: completed,
								onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_isItem(t){
			// summary:
			//		Simple test of the isItem function of the store
			// description:
			//		Simple test of the isItem function of the store

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);

			var d = new doh.Deferred();
			function completedAll(items){
				t.is(6, items.length);
				for(var i=0; i<6; i++){
					t.assertTrue(opmlStore.isItem(items[i]));
				}
				t.assertTrue(!opmlStore.isItem({}));
				t.assertTrue(!opmlStore.isItem({ item: "not an item" }));
				t.assertTrue(!opmlStore.isItem("not an item"));
				t.assertTrue(!opmlStore.isItem(["not an item"]));
				
				d.callback(true);
			}

			//Get everything...
			opmlStore.fetch({ onComplete: completedAll, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_hasAttribute(t){
			// summary:
			//		Simple test of the hasAttribute function of the store
			// description:
			//		Simple test of the hasAttribute function of the store

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);

			var d = new doh.Deferred();
			function onComplete(items){
				t.is(1, items.length);
				t.assertTrue(items[0] !== null);
				t.assertTrue(opmlStore.hasAttribute(items[0], "text"));
				t.assertTrue(opmlStore.hasAttribute(items[0], "type"));
				t.assertTrue(!opmlStore.hasAttribute(items[0], "population"));
				t.assertTrue(!opmlStore.hasAttribute(items[0], "Nothing"));
				t.assertTrue(!opmlStore.hasAttribute(items[0], "Text"));
				
				//Test that null attributes throw an exception
				var passed = false;
				try{
					opmlStore.hasAttribute(items[0], null);
				}catch (e){
					passed = true;
				}
				t.assertTrue(passed);
				
				d.callback(true);
			}

			//Get one item...
			opmlStore.fetch({ 	query: {text: "Asia"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});
			return d; //Object
		},
		function testReadAPI_containsValue(t){
			// summary:
			//		Simple test of the containsValue function of the store
			// description:
			//		Simple test of the containsValue function of the store

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
 			
			var d = new doh.Deferred();
			function onComplete(items){
				t.is(1, items.length);
				t.assertTrue(items[0] !== null);
				t.assertTrue(opmlStore.containsValue(items[0], "text", "North America"));
				t.assertTrue(opmlStore.containsValue(items[0], "type", "continent"));
				t.assertTrue(!opmlStore.containsValue(items[0], "text", "America"));
				t.assertTrue(!opmlStore.containsValue(items[0], "Type", "continent"));
				t.assertTrue(!opmlStore.containsValue(items[0], "text", null));
								
				var children = opmlStore.getValues(items[0], "children");
				t.assertTrue(opmlStore.containsValue(items[0], "children", children[0]));
				t.assertTrue(opmlStore.containsValue(items[0], "children", children[1]));
				t.assertTrue(opmlStore.containsValue(items[0], "children", children[2]));
	
				//Test that null attributes throw an exception
				var passed = false;
				try{
					opmlStore.containsValue(items[0], null, "foo");
				}catch (e){
					passed = true;
				}
				t.assertTrue(passed);
				
				d.callback(true);
			}

			//Get one item...
			opmlStore.fetch({ 	query: {text: "North America"},
								onComplete: onComplete,
								onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)
							});
			return d; //Object
		},
		function testReadAPI_getAttributes(t){
			// summary:
			//		Simple test of the getAttributes function of the store
			// description:
			//		Simple test of the getAttributes function of the store

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);

			var d = new doh.Deferred();
			function onComplete(items){
				t.is(6, items.length);
				t.assertTrue(opmlStore.isItem(items[0]));
	
				var attributes = opmlStore.getAttributes(items[0]);
				t.is(3, attributes.length);
				for(var i = 0; i < attributes.length; i++){
					t.assertTrue((attributes[i] === "text" || attributes[i] === "type" || attributes[i] === "children"));
				}
				
				d.callback(true);
			}

			//Get everything...
			opmlStore.fetch({ onComplete: onComplete, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_getFeatures(t){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);

			var features = opmlStore.getFeatures();
			var count = 0;
			for(i in features){
				t.assertTrue((i === "dojo.data.api.Read") || (i === "dojo.data.api.Identity"));
				count++;
			}
			t.assertTrue(count === 2);
		},
		function testReadAPI_fetch_patternMatch0(t){
			// summary:
			//		Function to test pattern matching of everything starting with Capital A
			// description:
			//		Function to test pattern matching of everything starting with Capital A

			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);

			var d = new doh.Deferred();
			function completed(items, request){
				t.is(3, items.length);
				var valueArray = [ "Africa", "Asia", "Australia"];
				t.assertTrue(dojox.data.tests.stores.OpmlStore.verifyItems(opmlStore, items, "text", valueArray));
				d.callback(true);
			}
			
			opmlStore.fetch({query: {text: "A*"}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch1(t){
			// summary:
			//		Function to test pattern matching of everything with America in it.
			// description:
			//		Function to test pattern matching of everything with America in it.
			
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.assertTrue(items.length === 2);
				var valueArray = [ "North America", "South America"];
				t.assertTrue(dojox.data.tests.stores.OpmlStore.verifyItems(opmlStore, items, "text", valueArray));
				d.callback(true);
			}
			
			opmlStore.fetch({query: {text: "*America*"}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch2(t){
			// summary:
			//		Function to test exact pattern match
			// description:
			//		Function to test exact pattern match
			
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(1, items.length);
				t.assertTrue(opmlStore.getValue(items[0], "text") === "Europe");
				d.callback(true);
			}
			
			opmlStore.fetch({query: {text: "Europe"}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch_caseInsensitive(t){
			// summary:
			//		Function to test exact pattern match with case insensitivity set.
			// description:
			//		Function to test exact pattern match with case insensitivity set.
			
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(1, items.length);
				t.assertTrue(opmlStore.getValue(items[0], "text") === "Asia");
				d.callback(true);
			}
			
			opmlStore.fetch({query: {text: "asia"}, queryOptions: {ignoreCase: true}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_patternMatch_caseSensitive(t){
			// summary:
			//		Function to test exact pattern match with case sensitivity set.
			// description:
			//		Function to test exact pattern match with case sensitivity set.
			
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				t.is(0, items.length);
				d.callback(true);
			}
			
			opmlStore.fetch({query: {text: "ASIA"}, queryOptions: {ignoreCase: false}, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabetic(t){
			// summary:
			//		Function to test sorting alphabetic ordering.
			// description:
			//		Function to test sorting alphabetic ordering.
		
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ "Africa", "Asia", "Australia", "Europe", "North America", "South America"];
				t.is(6, items.length);
				t.assertTrue(dojox.data.tests.stores.OpmlStore.verifyItems(opmlStore, items, "text", orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "text"}];
			opmlStore.fetch({sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabeticDescending(t){
			// summary:
			//		Function to test sorting alphabetic ordering in descending mode.
			// description:
			//		Function to test sorting alphabetic ordering in descending mode.
		
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ "South America", "North America", "Europe", "Australia", "Asia", "Africa"
					];
				t.is(6, items.length);
				t.assertTrue(dojox.data.tests.stores.OpmlStore.verifyItems(opmlStore, items, "text", orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "text", descending: true}];
			opmlStore.fetch({sort: sortAttributes, onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_fetch_sortAlphabeticWithCount(t){
			// summary:
			//		Function to test sorting numerically in descending order, returning only a specified number of them.
			// description:
			//		Function to test sorting numerically in descending order, returning only a specified number of them.
		
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				//Output should be in this order...
				var orderedArray = [ "South America", "North America", "Europe", "Australia"
					];
				t.is(4, items.length);
				t.assertTrue(dojox.data.tests.stores.OpmlStore.verifyItems(opmlStore, items, "text", orderedArray));
				d.callback(true);
			}
			
			var sortAttributes = [{attribute: "text", descending: true}];
			opmlStore.fetch({sort: sortAttributes,
							count: 4,
							onComplete: completed,
							onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d; //Object
		},
		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = new dojox.data.OpmlStore(dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml"));
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
			t.assertTrue(passed);
		},
		function testIdentityAPI_fetchItemByIdentity(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item !== null);
				d.callback(true);
			}
            opmlStore.fetchItemByIdentity({identity: "1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d;
		},

		function testIdentityAPI_fetchItemByIdentity_bad1(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
            opmlStore.fetchItemByIdentity({identity: "200", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity_bad2(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
            opmlStore.fetchItemByIdentity({identity: "-1", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_fetchItemByIdentity_bad3(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			var d = new doh.Deferred();
			function onItem(item){
				t.assertTrue(item === null);
				d.callback(true);
			}
            opmlStore.fetchItemByIdentity({identity: "999999", onItem: onItem, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d)});
			return d;
		},
		function testIdentityAPI_getIdentity(t){
			// summary:
			//		Simple test of the fetchItemByIdentity function of the store.
			// description:
			//		Simple test of the fetchItemByIdentity function of the store.
			
			var args = dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml");
			var opmlStore = new dojox.data.OpmlStore(args);
			
			var d = new doh.Deferred();
			function completed(items, request){
				var passed = true;
				for(var i = 0; i < items.length; i++){
					console.log("Identity is: " + opmlStore.getIdentity(items[i]) + " count is : "+ i);
					if(!(opmlStore.getIdentity(items[i]) == i)){
						passed=false;
						break;
					}
				}
				t.assertTrue(passed);
				d.callback(true);
			}
			
			//Get everything...
			opmlStore.fetch({ onComplete: completed, onError: dojo.partial(dojox.data.tests.stores.OpmlStore.error, t, d), queryOptions: {deep: true}});
			return d; //Object
		},
		function testIdentityAPI_functionConformance(t){
			// summary:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test identity API conformance.  Checks to see all declared functions are actual functions on the instances.

			var testStore = new dojox.data.OpmlStore(dojox.data.tests.stores.OpmlStore.getDatasource("stores/geography.xml"));
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


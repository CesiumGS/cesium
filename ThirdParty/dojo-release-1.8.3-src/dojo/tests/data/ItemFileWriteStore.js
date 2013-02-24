// FIXME: this test assumes the existence of the global object "tests"
define([
  "dojo/main",
  "doh/main",
  "require",
  "./readOnlyItemFileTestTemplates",
  "dojo/data/ItemFileWriteStore",
  "dojo/data/api/Read",
  "dojo/data/api/Identity",
  "dojo/data/api/Write",
  "dojo/data/api/Notification"], function(dojo, doh, require){

dojo.getObject("data.ItemFileWriteStore", true, tests);

// First, make sure ItemFileWriteStore can still pass all the same unit tests
// that we use for its superclass, ItemFileReadStore:
tests.data.readOnlyItemFileTestTemplates.registerTestsForDatastore("dojo.data.ItemFileWriteStore");

tests.data.ItemFileWriteStore.getTestData = function(name){
	var data = {};
	if(name === "reference_integrity"){
		if(dojo.isBrowser){
			data = {url: require.toUrl("./reference_integrity.json")};
		}else{
			data =
				{ data: {
					"identifier": "id",
					"label": "name",
					"items": [
						{"id": 1, "name": "Item 1"},
						{"id": 2, "name": "Item 2"},
						{"id": 3, "name": "Item 3"},
						{"id": 4, "name": "Item 4"},
						{"id": 5, "name": "Item 5"},
						{"id": 6, "name": "Item 6"},
						{"id": 7, "name": "Item 7"},
						{"id": 8, "name": "Item 8"},
						{"id": 9, "name": "Item 9"},
						{"id": 10, "name": "Item 10", "friends": [{"_reference": 1},{"_reference": 3},{"_reference": 5}]},
						{"id": 11, "name": "Item 11", "friends": [{"_reference": 10}], "siblings": [{"_reference": 10}]},
						{"id": 12, "name": "Item 12", "friends": [{"_reference": 3},{"_reference": 7}], "enemies": [{"_reference": 10}]},
						{"id": 13, "name": "Item 13", "friends": [{"_reference": 10}]},
						{"id": 14, "name": "Item 14", "friends": [{"_reference": 11}]},
						{"id": 15, "name": "item 15", "friends": [{"id": 16, "name": "Item 16"}]}
					]
				}
			};
		}
	}
	return data;
};


// Now run some tests that are specific to the write-access features:
doh.register("tests.data.ItemFileWriteStore",
	[
		function test_getFeatures(){
			// summary:
			//		Simple test of the getFeatures function of the store
			// description:
			//		Simple test of the getFeatures function of the store
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var features = store.getFeatures();

			// make sure we have the expected features:
			doh.assertTrue(features["dojo.data.api.Read"] !== null);
			doh.assertTrue(features["dojo.data.api.Identity"] !== null);
			doh.assertTrue(features["dojo.data.api.Write"] !== null);
			doh.assertTrue(features["dojo.data.api.Notification"] !== null);
			doh.assertFalse(features["iggy"]);

			// and only the expected features:
			var count = 0;
			for(var i in features){
				doh.assertTrue((i === "dojo.data.api.Read" ||
					i === "dojo.data.api.Identity" ||
					i === "dojo.data.api.Write" ||
					i === "dojo.data.api.Notification"));
				count++;
			}
			doh.assertEqual(count, 4);
		},
		function testWriteAPI_setValue(){
			// summary:
			//		Simple test of the setValue API
			// description:
			//		Simple test of the setValue API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			var onComplete = function(items, request){
				doh.assertEqual(1, items.length);
				var item = items[0];
				doh.assertTrue(store.containsValue(item, "capital", "Cairo"));

				// FIXME:
				//	  Okay, so this seems very odd.  Maybe I'm just being dense.
				//	  These tests works:
				doh.assertEqual(store.isDirty(item), false);
				doh.assertTrue(store.isDirty(item) === false);
				//	  But these seemingly equivalent tests will not work:
				// doh.assertFalse(store.isDirty(item));
				// doh.assertTrue(!(store.isDirty(item)));
				//
				//	  All of which seems especially weird, given that this *does* work:
				doh.assertFalse(store.isDirty());

				doh.assertTrue(store.isDirty(item) === false);
				doh.assertTrue(!store.isDirty());
				store.setValue(item, "capital", "New Cairo");
				doh.assertTrue(store.isDirty(item));
				doh.assertTrue(store.isDirty());
				doh.assertEqual(store.getValue(item, "capital").toString(), "New Cairo");
				deferred.callback(true);
			};
			var onError = function(error, request){
				deferred.errback(error);
			};
			store.fetch({query:{name:"Egypt"}, onComplete: onComplete, onError: onError});
			return deferred; //Object
		},
		function testWriteAPI_setValues(){
			// summary:
			//		Simple test of the setValues API
			// description:
			//		Simple test of the setValues API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			function onComplete(items, request){
				doh.assertEqual(1, items.length);
				var item = items[0];
				doh.assertTrue(store.containsValue(item, "name", "Egypt"));
				doh.assertTrue(store.isDirty(item) === false);
				doh.assertTrue(!store.isDirty());
				store.setValues(item, "name", ["Egypt 1", "Egypt 2"]);
				doh.assertTrue(store.isDirty(item));
				doh.assertTrue(store.isDirty());
				var values = store.getValues(item, "name");
				doh.assertTrue(values[0] == "Egypt 1");
				doh.assertTrue(values[1] == "Egypt 2");
				deferred.callback(true);
			}
			function onError(error, request){
				deferred.errback(error);
			}
			store.fetch({query:{name:"Egypt"}, onComplete: onComplete, onError: onError});
			return deferred; //Object
		},
		function testWriteAPI_unsetAttribute(){
			// summary:
			//		Simple test of the unsetAttribute API
			// description:
			//		Simple test of the unsetAttribute API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			function onComplete(items, request){
				doh.assertEqual(1, items.length);
				var item = items[0];
				doh.assertTrue(store.containsValue(item, "name", "Egypt"));
				doh.assertTrue(store.isDirty(item) === false);
				doh.assertTrue(!store.isDirty());
				store.unsetAttribute(item, "name");
				doh.assertTrue(store.isDirty(item));
				doh.assertTrue(store.isDirty());
				doh.assertTrue(!store.hasAttribute(item, "name"));
				deferred.callback(true);
			}
			function onError(error, request){
				deferred.errback(error);
			}
			store.fetch({query:{name:"Egypt"}, onComplete: onComplete, onError: onError});
			return deferred; //Object
		},
		function testWriteAPI_newItem(){
			// summary:
			//		Simple test of the newItem API
			// description:
			//		Simple test of the newItem API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			doh.assertTrue(!store.isDirty());

			var onNewInvoked = false;
			store.onNew = function(newItem, parentInfo){

				doh.assertTrue(newItem !== null);
				doh.assertTrue(parentInfo === null);
				doh.assertTrue(store.isItem(newItem));
				onNewInvoked = true;
			};
			var canada = store.newItem({name: "Canada", abbr:"ca", capital:"Ottawa"});
			doh.assertTrue(onNewInvoked);

			doh.assertTrue(store.isDirty(canada));
			doh.assertTrue(store.isDirty());
			doh.assertTrue(store.getValues(canada, "name") == "Canada");
			function onComplete(items, request){
				doh.assertEqual(1, items.length);
				var item = items[0];
				doh.assertTrue(store.containsValue(item, "name", "Canada"));
				deferred.callback(true);
			}
			function onError(error, request){
				deferred.errback(error);
			}
			store.fetch({query:{name:"Canada"}, onComplete: onComplete, onError: onError});
			return deferred; //Object
		},
		function testWriteAPI_newItem_withParent(){
			// summary:
			//		Simple test of the newItem API with a parent assignment
			// description:
			//		Simple test of the newItem API with a parent assignment
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			doh.assertTrue(!store.isDirty());

			var onError = function(error, request){
				deferred.errback(error);
			};

			var onComplete = function(items, request){
				doh.assertEqual(1, items.length);
				var item = items[0];
				doh.assertTrue(store.containsValue(item, "name", "Egypt"));

				//Attach an onNew to validate we get expected values.
				var onNewInvoked = false;
				store.onNew = function(newItem, parentInfo){
					doh.assertEqual(item, parentInfo.item);
					doh.assertEqual("cities", parentInfo.attribute);
					doh.assertTrue(parentInfo.oldValue === undefined);
					doh.assertTrue(parentInfo.newValue === newItem);
					onNewInvoked = true;
				};

				//Attach an onSet and verify onSet is NOT called in this case.
				store.onSet = function(item, attribute, oldValue, newValue){
					doh.assertTrue(false);
				};



				//See if we can add in a new item representing the city of Cairo.
				//This should also call the onNew set above....
				var newItem = store.newItem({name: "Cairo", abbr: "Cairo"}, {parent: item, attribute: "cities"});
				doh.assertTrue(onNewInvoked);

				function onCompleteNewItemShallow(items, request){
					doh.assertEqual(0, items.length);
					function onCompleteNewItemDeep(items, request){
						doh.assertEqual(1, items.length);
						var item = items[0];
						doh.assertEqual("Cairo", store.getValue(item, "name"));
						deferred.callback(true);
					}
					//Do a deep search now, should find the new item of the city with name attribute Cairo.
					store.fetch({query:{name:"Cairo"}, onComplete: onCompleteNewItemDeep, onError: onError, queryOptions: {deep:true}});
				}
				//Do a shallow search first, should find nothing.
				store.fetch({query:{name:"Cairo"}, onComplete: onCompleteNewItemShallow, onError: onError});
			};
			store.fetch({query:{name:"Egypt"}, onComplete: onComplete, onError: onError});
			return deferred; //Object
		},

		function testWriteAPI_newItem_multiple_withParent(){
			// summary:
			//		Simple test of the newItem API with a parent assignment multiple times.
			// description:
			//		Simple test of the newItem API with a parent assignment multiple times.
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();

			doh.assertTrue(!store.isDirty());

			function onComplete(items, request){
				doh.assertEqual(1, items.length);
				var item = items[0];
				doh.assertTrue(store.containsValue(item, "name", "Egypt"));

				//Attach an onNew to validate we get expected values.
				store.onNew = function(newItem, parentInfo){
					doh.assertEqual(item, parentInfo.item);
					doh.assertEqual("cities", parentInfo.attribute);

					doh.assertTrue(parentInfo.oldValue === undefined);

					doh.assertTrue(parentInfo.newValue === newItem);
				};

				//See if we can add in a new item representing the city of Cairo.
				//This should also call the onNew set above....
				var newItem1 = store.newItem({name: "Cairo", abbr: "Cairo"}, {parent: item, attribute: "cities"});

				//Attach a new onNew to validate we get expected values.
				store.onNew = function(newItem, parentInfo){
					doh.assertEqual(item, parentInfo.item);
					doh.assertEqual("cities", parentInfo.attribute);

					console.log(parentInfo.oldValue);
					doh.assertTrue(parentInfo.oldValue == newItem1);

					doh.assertTrue(parentInfo.newValue[0] == newItem1);
					doh.assertTrue(parentInfo.newValue[1] == newItem);
				};
				var newItem2 = store.newItem({name: "Banha", abbr: "Banha"}, {parent: item, attribute: "cities"});

				//Attach a new onNew to validate we get expected values.
				store.onNew = function(newItem, parentInfo){
					doh.assertEqual(item, parentInfo.item);
					doh.assertEqual("cities", parentInfo.attribute);

					doh.assertTrue(parentInfo.oldValue[0] == newItem1);
					doh.assertTrue(parentInfo.oldValue[1] == newItem2);

					doh.assertTrue(parentInfo.newValue[0] == newItem1);
					doh.assertTrue(parentInfo.newValue[1] == newItem2);
					doh.assertTrue(parentInfo.newValue[2] == newItem);
				};
				var newItem3 = store.newItem({name: "Damanhur", abbr: "Damanhur"}, {parent: item, attribute: "cities"});
				deferred.callback(true);
			}
			function onError(error, request){
				deferred.errback(error);
			}
			store.fetch({query:{name:"Egypt"}, onComplete: onComplete, onError: onError});
			return deferred; //Object
		},

		function testWriteAPI_deleteItem(){
			// summary:
			//		Simple test of the deleteItem API
			// description:
			//		Simple test of the deleteItem API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();

			var onError = function(error, request){
				deferred.errback(error);
			};

			var onComplete = function(items, request){
				doh.assertEqual(1, items.length);
				var item = items[0];
				doh.assertTrue(store.containsValue(item, "name", "Egypt"));
				doh.assertTrue(store.isDirty(item) === false);
				doh.assertTrue(!store.isDirty());
				store.deleteItem(item);
				doh.assertTrue(store.isDirty(item));
				doh.assertTrue(store.isDirty());
				var onCompleteToo = function(itemsToo, requestToo){
					doh.assertEqual(0, itemsToo.length);
					deferred.callback(true);
				};
				store.fetch({query:{name:"Egypt"}, onComplete: onCompleteToo, onError: onError});
			};
			store.fetch({query:{name:"Egypt"}, onComplete: onComplete, onError: onError});
			return deferred; //Object
		},
		function testWriteAPI_isDirty(){
			// summary:
			//		Simple test of the isDirty API
			// description:
			//		Simple test of the isDirty API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			function onComplete(items, request){
				doh.assertEqual(1, items.length);
				var item = items[0];
				doh.assertTrue(store.containsValue(item, "name", "Egypt"));
				store.setValue(item, "name", "Egypt 2");
				doh.assertTrue(store.getValue(item, "name") == "Egypt 2");
				doh.assertTrue(store.isDirty(item));
				deferred.callback(true);
			}
			function onError(error, request){
				deferred.errback(error);
			}
			store.fetch({query:{name:"Egypt"}, onComplete: onComplete, onError: onError});
			return deferred; //Object
		},
		function testWriteAPI_revert(){
			// summary:
			//		Simple test of the revert API
			// description:
			//		Simple test of the revert API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();

			var onError = function(error, request){
				deferred.errback(error);
			};

			var onComplete = function(items, request){
				doh.assertEqual(1, items.length);
				var item = items[0];
				doh.assertTrue(store.containsValue(item, "name", "Egypt"));
				doh.assertTrue(store.isDirty(item) === false);
				doh.assertTrue(!store.isDirty());
				store.setValue(item, "name", "Egypt 2");
				doh.assertTrue(store.getValue(item, "name") == "Egypt 2");
				doh.assertTrue(store.isDirty(item));
				doh.assertTrue(store.isDirty());
				store.revert();

				//Fetch again to see if it reset the state.
				var onCompleteToo = function(itemsToo, requestToo){
					doh.assertEqual(1, itemsToo.length);
					var itemToo = itemsToo[0];
					doh.assertTrue(store.containsValue(itemToo, "name", "Egypt"));
					deferred.callback(true);
				};
				store.fetch({query:{name:"Egypt"}, onComplete: onCompleteToo, onError: onError});
			};
			store.fetch({query:{name:"Egypt"}, onComplete: onComplete, onError: onError});
			return deferred; //Object
		},
		function testWriteAPI_save(){
			// summary:
			//		Simple test of the save API
			// description:
			//		Simple test of the save API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			function onError(error){
				deferred.errback(error);
			}
			function onItem(item){
				store.setValue(item, "capital", "New Cairo");
				function onComplete(){
					deferred.callback(true);
				}
				store.save({onComplete:onComplete, onError:onError});
			}
			store.fetchItemByIdentity({identity:"eg", onItem:onItem, onError:onError});
			return deferred; //Object
		},
		function testWriteAPI_saveVerifyState(){
			// summary:
			//		Simple test of the save API
			// description:
			//		Simple test of the save API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			function onError(error){
				deferred.errback(error);
			}
			function onItem(item){
				store.setValue(item, "capital", "New Cairo");
				function onComplete(){
					//Check internal state.  Note:  Users should NOT do this, this is a UT verification
					//of internals in this case.  Ref tracker: #4394
					doh.assertTrue(!store._saveInProgress);
					deferred.callback(true);
				}
				store.save({onComplete:onComplete, onError:onError});
			}
			store.fetchItemByIdentity({identity:"eg", onItem:onItem, onError:onError});
			return deferred; //Object
		},
		function testWriteAPI_saveEverything(){
			// summary:
			//		Simple test of the save API
			// description:
			//		Simple test of the save API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));
			var egypt;

			var deferred = new doh.Deferred();
			var onError = function(error){
				deferred.errback(error);
			};

			store._saveEverything = function(saveCompleteCallback, saveFailedCallback, newFileContentString){
				var struct = dojo.fromJson(newFileContentString);
				doh.assertEqual(struct.identifier, store.getIdentityAttributes(egypt)[0]);
				doh.assertEqual(struct.label, store.getLabelAttributes(egypt)[0]);
				doh.assertEqual(struct.items.length, 7);

				var cloneStore = new dojo.data.ItemFileWriteStore({data:struct});
				var onItemClone = function(itemClone){
					var egyptClone = itemClone;
					doh.assertEqual(store.getIdentityAttributes(egypt)[0], cloneStore.getIdentityAttributes(egyptClone)[0]);
					doh.assertEqual(store.getLabelAttributes(egypt)[0], cloneStore.getLabelAttributes(egyptClone)[0]);
					doh.assertEqual(store.getValue(egypt, "name"), cloneStore.getValue(egyptClone, "name"));
				};
				cloneStore.fetchItemByIdentity({identity:"eg", onItem:onItemClone, onError:onError});
				saveCompleteCallback();
			};
			var onItem = function(item){
				egypt = item;
				var onComplete = function(){
					deferred.callback(true);
				};
				store.setValue(egypt, "capital", "New Cairo");
				store.save({onComplete:onComplete, onError:onError});
			};
			store.fetchItemByIdentity({identity:"eg", onItem:onItem, onError:onError});
			return deferred; //Object
		},
		function testWriteAPI_saveEverything_HierarchyOff(){
			// summary:
			//		Simple test of the save API
			// description:
			//		Simple test of the save API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("geography_hierarchy_small"));
			store.hierarchical = false;
			var africa;

			var deferred = new doh.Deferred();
			var onError = function(error){
				deferred.errback(error);
			};

			store._saveEverything = function(saveCompleteCallback, saveFailedCallback, newFileContentString){
				var struct = dojo.fromJson(newFileContentString);
				doh.assertEqual(struct.items.length, 3);
				var cloneStore = new dojo.data.ItemFileWriteStore({data:struct, hierarchical: false});
				var onItemClone = function(items, request){
					var africaClone = items[0];
					doh.assertEqual(store.getValue(africa, "name"), cloneStore.getValue(africaClone, "name"));
				};
				cloneStore.fetch({query: {name:"Africa"}, onComplete:onItemClone, onError:onError, queryOptions: {deep: true}});
				saveCompleteCallback();
			};
			var onComplete = function(items, request){
				africa = items[0];
				var onComplete = function(){
					deferred.callback(true);
				};
				store.setValue(africa, "size", "HUGE!");
				store.save({onComplete:onComplete, onError:onError});
			};
			store.fetch({query: {name:"Africa"}, onComplete:onComplete, onError:onError, queryOptions: {deep: true}});
			return deferred; //Object
		},
		function testWriteAPI_saveEverything_withDateType(){
			// summary:
			//		Simple test of the save API	with a non-atomic type (Date) that has a type mapping.
			// description:
			//		Simple test of the save API	with a non-atomic type (Date) that has a type mapping.
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			store._saveEverything = function(saveCompleteCallback, saveFailedCallback, newFileContentString){

				//Now load the new data into a datastore and validate that it stored the date right.
				var dataset = dojo.fromJson(newFileContentString);
				var newStore = new dojo.data.ItemFileWriteStore({data: dataset});

				function gotItem(item){
					var independenceDate = newStore.getValue(item,"independence");
					doh.assertTrue(independenceDate instanceof Date);
					doh.assertTrue(dojo.date.compare(new Date(1993,4,24), independenceDate, "date") === 0);
					saveCompleteCallback();
				}
				function failed(error, request){
					deferred.errback(error);
					saveFailedCallback();
				}
				newStore.fetchItemByIdentity({identity:"eg", onItem:gotItem, onError:failed});
			};

			var onError = function(error){
				deferred.errback(error);
			};
			var onItem = function(item){
				var onComplete = function(){
					deferred.callback(true);
				};
				store.setValue(item, "independence", new Date(1993,4,24));
				store.save({onComplete:onComplete, onError:onError});
			};
			store.fetchItemByIdentity({identity:"eg", onItem:onItem, onError:onError});
			return deferred; //Object
		},
		function testWriteAPI_saveEverything_withCustomColorTypeSimple(){
			// summary:
			//		Simple test of the save API	with a non-atomic type (dojo.Color) that has a type mapping.
			// description:
			//		Simple test of the save API	with a non-atomic type (dojo.Color) that has a type mapping.

			//Set up the store basics:  What data it has, and what to do when save is called for saveEverything
			//And how to map the 'Color' type in and out of the format.
			//(Test of saving all to a some location...)
			var dataset = {
				identifier:'name',
				items: [
					{ name:'Kermit', species:'frog', color:{_type:'Color', _value:'green'} },
					{ name:'Beaker', hairColor:{_type:'Color', _value:'red'} }
				]
			};

			var customTypeMap = {'Color': dojo.Color };

			var store = new dojo.data.ItemFileWriteStore({
					data:dataset,
					typeMap: customTypeMap
			});

			var deferred = new doh.Deferred();
			store._saveEverything = function(saveCompleteCallback, saveFailedCallback, newFileContentString){
				//Now load the new data into a datastore and validate that it stored the Color right.
				var dataset = dojo.fromJson(newFileContentString);
				var newStore = new dojo.data.ItemFileWriteStore({data: dataset, typeMap: customTypeMap});

				var deferred = new doh.Deferred();
				function gotItem(item){
					var hairColor = newStore.getValue(item,"hairColor");
					doh.assertTrue(hairColor instanceof dojo.Color);
					doh.assertEqual("rgba(255, 255, 0, 1)", hairColor.toString());
					saveCompleteCallback();
				}
				function failed(error, request){
					deferred.errback(error);
					saveFailedCallback();
				}
				newStore.fetchItemByIdentity({identity:"Animal", onItem:gotItem, onError:failed});
			};

			//Add a new item with a color type, then save it.
            var onError = function(error){
				deferred.errback(error);
			};
			var onComplete = function(){
				deferred.callback(true);
			};

			var animal = store.newItem({name: "Animal", hairColor: new dojo.Color("yellow")});
			store.save({onComplete:onComplete, onError:onError});
			return deferred; //Object
		},
		function testWriteAPI_saveEverything_withCustomColorTypeGeneral(){
			// summary:
			//		Simple test of the save API	with a non-atomic type (dojo.Color) that has a type mapping.
			// description:
			//		Simple test of the save API	with a non-atomic type (dojo.Color) that has a type mapping.

			//Set up the store basics:  What data it has, and what to do when save is called for saveEverything
			//And how to map the 'Color' type in and out of the format.
			//(Test of saving all to a some location...)
			var dataset = {
				identifier:'name',
				items: [
					{ name:'Kermit', species:'frog', color:{_type:'Color', _value:'green'} },
					{ name:'Beaker', hairColor:{_type:'Color', _value:'red'} }
				]
			};

			var customTypeMap = {'Color': 	{
												type: dojo.Color,
												deserialize: function(value){
													return new dojo.Color(value);
												},
												serialize: function(obj){
													return obj.toString();
												}
											}
								};
			var store = new dojo.data.ItemFileWriteStore({
					data:dataset,
					typeMap: customTypeMap
			});

			var deferred = new doh.Deferred();
			store._saveEverything = function(saveCompleteCallback, saveFailedCallback, newFileContentString){
				//Now load the new data into a datastore and validate that it stored the Color right.
				var dataset = dojo.fromJson(newFileContentString);
				var newStore = new dojo.data.ItemFileWriteStore({data: dataset, typeMap: customTypeMap});

				var gotItem = function(item){
					var hairColor = newStore.getValue(item,"hairColor");
					doh.assertTrue(hairColor instanceof dojo.Color);
					doh.assertEqual("rgba(255, 255, 0, 1)", hairColor.toString());
					saveCompleteCallback();
				};
				var failed = function(error, request){
					deferred.errback(error);
					saveFailedCallback();
				};
				newStore.fetchItemByIdentity({identity:"Animal", onItem:gotItem, onError:failed});
			};

			//Add a new item with a color type, then save it.
            var onError = function(error){
				deferred.errback(error);
			};
			var onComplete = function(){
				deferred.callback(true);
			};

			var animal = store.newItem({name: "Animal", hairColor: new dojo.Color("yellow")});
			store.save({onComplete:onComplete, onError:onError});
			return deferred; //Object
		},
		function testWriteAPI_newItem_revert(){
			// summary:
			//		Test for bug #5357.  Ensure that the revert properly nulls the identity position
			//		for a new item after revert.
			var args = {data: {
				label:"name",
				items:[
					{name:'Ecuador', capital:'Quito'},
					{name:'Egypt', capital:'Cairo'},
					{name:'El Salvador', capital:'San Salvador'},
					{name:'Equatorial Guinea', capital:'Malabo'},
					{name:'Eritrea', capital:'Asmara'},
					{name:'Estonia', capital:'Tallinn'},
					{name:'Ethiopia', capital:'Addis Ababa'}
				]
			} };
			var store = new dojo.data.ItemFileWriteStore(args);

			var newCountry = store.newItem({name: "Utopia", capitol: "Perfect"});

			//DO NOT ACCESS THIS WAY.  THESE ARE INTERNAL VARIABLES.  DOING THIS FOR TEST PURPOSES.
			var itemEntryNum = newCountry[store._itemNumPropName];
			doh.assertTrue(store._arrayOfAllItems[itemEntryNum] === newCountry);
			store.revert();
			doh.assertTrue(store._arrayOfAllItems[itemEntryNum] === null);
		},
		function testWriteAPI_new_modify_revert(){
			// summary:
			//		Test of a new item, modify it, then revert, to ensure the state remains consistent.  Added due to #9022.
			// description:
			//		Test of a new item, modify it, then revert, to ensure the state remains consistent.  Added due to #9022.
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			doh.assertTrue(!store.isDirty());

			var onError = function(error, request){
				deferred.errback(error);
			};

			var intialFetch = function(items, request){
				var initialCount = items.length;
				var canada = store.newItem({name: "Canada", abbr:"ca", capital:"Ottawa"});
				store.setValue(canada, "someattribute", "modified a new item!");
				var afterNewFetch = function(items, request){
					var afterNewCount = items.length;
					doh.assertEqual(afterNewCount, (initialCount + 1));
					store.revert();
					var afterRevertFetch = function(items, request){
						var afterRevertCount = items.length;
						doh.assertEqual(afterRevertCount, initialCount);
						deferred.callback(true);
					};
					store.fetch({onComplete: afterRevertFetch, onError: onError});
				};
				store.fetch({onComplete: afterNewFetch, onError: onError});
			};
			store.fetch({onComplete: intialFetch, onError: onError});
			return deferred; //Object
		},
		function testWriteAPI_new_modify_delete_revert(){
			// summary:
			//		Test of a new item, modify it, delete it, then revert, to ensure the state remains consistent.  Added due to #9022.
			// description:
			//		Test of a new item, modify it, delete it, then revert, to ensure the state remains consistent.  Added due to #9022.
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));
			var i;
			var found = false;

			var deferred = new doh.Deferred();
			doh.assertTrue(!store.isDirty());

			var onError = function(error, request){
				deferred.errback(error);
			};

			var intialFetch = function(items, request){
				var initialCount = items.length;
				var canada = store.newItem({name: "Canada", abbr:"ca", capital:"Ottawa"});
				store.setValue(canada, "someattribute", "modified a new item!");

				// check that after new and modify, the total items count goes up by one.
				var afterNewFetch = function(items, request){
					var afterNewCount = items.length;
					doh.assertEqual(afterNewCount, (initialCount + 1));
					store.deleteItem(canada);

					//Check that after delete, the total items count goes back to initial count.
					//Also verify the item with abbr of ca is gone.
					var afterDeleteFetch = function(items, request){
						var afterDeleteCount = items.length;
						doh.assertEqual(initialCount, afterDeleteCount);

						for(i=0; i < items.length; i++){
							found = (store.getIdentity(items[i]) === "ca");
							if(found){
								break;
							}
						}
						if(found){
							deferred.errback(new Error("Error: Found the supposedly deleted item!"));
						}else{
							store.revert();
							//Check that after revert, we still have the same item count as the
							//original fetch.  Also verify the item with abbr of ca is gone.
							var afterRevertFetch = function(items, request){
								var afterRevertCount = items.length;
								doh.assertEqual(afterRevertCount, initialCount);
								for(i=0; i < items.length; i++){
									found = (store.getIdentity(items[i]) === "ca");
									if(found){
										break;
									}
								}
								if(found){
									deferred.errback(new Error("Error: Found the 'new' item after revert!"));
								}else{
									deferred.callback(true);
								}
							};
							store.fetch({onComplete: afterRevertFetch, onError: onError});
						}
					};
					store.fetch({onComplete: afterDeleteFetch, onError: onError});
				};
				store.fetch({onComplete: afterNewFetch, onError: onError});
			};
			store.fetch({onComplete: intialFetch, onError: onError});
			return deferred; //Object
		},
		function testNotificationAPI_onSet(){
			// summary:
			//		Simple test of the onSet API
			// description:
			//		Simple test of the onSet API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			function onError(error){
				deferred.errback(error);
			}
			function onItem(fetchedItem){
				var egypt = fetchedItem;
				var connectHandle = null;
				function setValueHandler(item, attribute, oldValue, newValue){
					doh.assertTrue(store.isItem(item));
					doh.assertTrue(item == egypt);
					doh.assertTrue(attribute == "capital");
					doh.assertTrue(oldValue == "Cairo");
					doh.assertTrue(newValue == "New Cairo");
					deferred.callback(true);
					dojo.disconnect(connectHandle);
				}
				connectHandle = dojo.connect(store, "onSet", setValueHandler);
				store.setValue(egypt, "capital", "New Cairo");
			}
			store.fetchItemByIdentity({identity:"eg", onItem:onItem, onError:onError});
		},
		function testNotificationAPI_onNew(){
			// summary:
			//		Simple test of the onNew API
			// description:
			//		Simple test of the onNew API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			var connectHandle = null;
			function newItemHandler(item){
				doh.assertTrue(store.isItem(item));
				doh.assertTrue(store.getValue(item, "name") == "Canada");
				deferred.callback(true);
				dojo.disconnect(connectHandle);
			}
			connectHandle = dojo.connect(store, "onNew", newItemHandler);
			var canada = store.newItem({name:"Canada", abbr:"ca", capital:"Ottawa"});
		},
		function testNotificationAPI_onDelete(){
			// summary:
			//		Simple test of the onDelete API
			// description:
			//		Simple test of the onDelete API
			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));

			var deferred = new doh.Deferred();
			function onError(error){
				deferred.errback(error);
			}
			function onItem(fetchedItem){
				var egypt = fetchedItem;
				var connectHandle = null;
				function deleteItemHandler(item){
					doh.assertTrue(store.isItem(item) === false);
					doh.assertTrue(item == egypt);
					deferred.callback(true);
					dojo.disconnect(connectHandle);
				}
				connectHandle = dojo.connect(store, "onDelete", deleteItemHandler);
				store.deleteItem(egypt);
			}
			store.fetchItemByIdentity({identity:"eg", onItem:onItem, onError:onError});
		},
		function testReadAPI_functionConformanceToo(){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			var testStore = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));
			var readApi = new dojo.data.api.Read();
			var passed = true;

			for(var functionName in readApi){
				var member = readApi[functionName];
				//Check that all the 'Read' defined functions exist on the test store.
				if(typeof member === "function"){
					var testStoreMember = testStore[functionName];
					if(!(typeof testStoreMember === "function")){
						passed = false;
						break;
					}
				}
			}
			doh.assertTrue(passed);
		},
		function testWriteAPI_functionConformance(){
			// summary:
			//		Simple test write API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test write API conformance.  Checks to see all declared functions are actual functions on the instances.
			var testStore = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));
			var writeApi = new dojo.data.api.Write();
			var passed = true;

			for(var functionName in writeApi){
				var member = writeApi[functionName];
				//Check that all the 'Write' defined functions exist on the test store.
				if(typeof member === "function"){
					var testStoreMember = testStore[functionName];
					if(!(typeof testStoreMember === "function")){
						passed = false;
						break;
					}
				}
			}
			doh.assertTrue(passed);
		},
		function testNotificationAPI_functionConformance(){
			// summary:
			//		Simple test Notification API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test Notification API conformance.  Checks to see all declared functions are actual functions on the instances.
			var testStore = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries"));
			var api = new dojo.data.api.Notification();
			var passed = true;

			for(var functionName in api){
				var member = api[functionName];
				//Check that all the 'Write' defined functions exist on the test store.
				if(typeof member === "function"){
					var testStoreMember = testStore[functionName];
					if(!(typeof testStoreMember === "function")){
						passed = false;
						break;
					}
				}
			}
			doh.assertTrue(passed);
		},
		function testIdentityAPI_noIdentifierSpecified(){
			// summary:
			//		Test for bug #3873. Given a datafile that does not specify an
			//		identifier, make sure ItemFileWriteStore auto-creates identities
			//		that are unique even after calls to deleteItem() and newItem()
			var args = {data: {
				label:"name",
				items:[
					{name:'Ecuador', capital:'Quito'},
					{name:'Egypt', capital:'Cairo'},
					{name:'El Salvador', capital:'San Salvador'},
					{name:'Equatorial Guinea', capital:'Malabo'},
					{name:'Eritrea', capital:'Asmara'},
					{name:'Estonia', capital:'Tallinn'},
					{name:'Ethiopia', capital:'Addis Ababa'}
				]
			} };
			var store = new dojo.data.ItemFileWriteStore(args);
			var deferred = new doh.Deferred();

			var onError = function(error, request){
				deferred.errback(error);
			};
			var onComplete = function(items, request){
				doh.assertEqual(7, items.length);

				var lastItem = items[(items.length - 1)];
				var idOfLastItem = store.getIdentity(lastItem);
				store.deleteItem(lastItem);
				store.newItem({name:'Canada', capital:'Ottawa'});

				var onCompleteAgain = function(itemsAgain, requestAgain){
					doh.assertEqual(7, itemsAgain.length);
					var identitiesInUse = {};
					for(var i = 0; i < itemsAgain.length; ++i){
						var item = itemsAgain[i];
						var id = store.getIdentity(item);
						if(identitiesInUse.hasOwnProperty(id)){
							// there should not already be an entry for this id
							doh.assertTrue(false);
						}else{
							// we want to add the entry now
							identitiesInUse[id] = item;
						}
					}
					deferred.callback(true);
				};
				store.fetch({onComplete:onCompleteAgain, onError:onError});
			};

			store.fetch({onComplete:onComplete, onError:onError});
			return deferred;
		},
		function testIdentityAPI_noIdentifierSpecified_revert(){
			// summary:
			//		Test for bug #4691  Given a datafile that does not specify an
			//		identifier, make sure ItemFileWriteStore auto-creates identities
			//		that are unique even after calls to deleteItem() and newItem()
			var args = {data: {
				label:"name",
				items:[
					{name:'Ecuador', capital:'Quito'},
					{name:'Egypt', capital:'Cairo'},
					{name:'El Salvador', capital:'San Salvador'},
					{name:'Equatorial Guinea', capital:'Malabo'},
					{name:'Eritrea', capital:'Asmara'},
					{name:'Estonia', capital:'Tallinn'},
					{name:'Ethiopia', capital:'Addis Ababa'}
				]
			} };
			var store = new dojo.data.ItemFileWriteStore(args);
			var deferred = new doh.Deferred();

			var onError = function(error, request){
				deferred.errback(error);
			};
			var onComplete = function(items, request){
				doh.assertEqual(7, items.length);

				var lastItem = items[(items.length - 1)];
				var idOfLastItem = store.getIdentity(lastItem);
				store.deleteItem(lastItem);
				store.newItem({name:'Canada', capital:'Ottawa'});

				var onCompleteAgain = function(itemsAgain, requestAgain){
					doh.assertEqual(7, itemsAgain.length);
					var identitiesInUse = {};
					for(var i = 0; i < itemsAgain.length; ++i){
						var item = itemsAgain[i];
						var id = store.getIdentity(item);
						if(identitiesInUse.hasOwnProperty(id)){
							// there should not already be an entry for this id
							doh.assertTrue(false);
						}else{
							// we want to add the entry now
							identitiesInUse[id] = item;
						}
					}
					//Last test, revert everything and check item sizes.
					store.revert();

					//Now call fetch again and verify store state.
					var revertComplete = function(itemsReverted, request){
						doh.assertEqual(7, itemsReverted.length);
						deferred.callback(true);
					};
					store.fetch({onComplete:revertComplete, onError:onError});
				};
				store.fetch({onComplete:onCompleteAgain, onError:onError});
			};
			store.fetch({onComplete:onComplete, onError:onError});
			return deferred;
		},
		function testReferenceIntegrity_checkReferences(){
			// summary:
			//		Simple test to verify the references were properly resolved.
			// description:
			//		Simple test to verify the references were properly resolved.

			var store = new dojo.data.ItemFileWriteStore(tests.data.ItemFileWriteStore.getTestData("reference_integrity"));

			var deferred = new doh.Deferred();
			var onError = function(error, request){
				deferred.errback(error);
			};
			var onComplete = function(items, request){

				var item10 = null;
				var item1  = null;
				var item3  = null;
				var item5  = null;

				var i;
				for (i = 0; i < items.length; i++){
					var ident = store.getIdentity(items[i]);
					if (ident === 10){
						item10 = items[i];
					}else if (ident === 1){
						item1 = items[i];
					}else if (ident === 3){
						item3 = items[i];
					}else if (ident === 5){
						item5 = items[i];
					}
				}
				var friends = store.getValues(item10, "friends");
				doh.assertTrue(friends !== null);
				doh.assertTrue(friends !== undefined);

				doh.assertTrue(store.isItem(item10));
				doh.assertTrue(store.isItem(item1));
				doh.assertTrue(store.isItem(item3));
				doh.assertTrue(store.isItem(item5));
				var found = 0;
				try{
					for (i = 0; i < friends.length; i++){
						if (i === 0){
							doh.assertTrue(store.isItem(friends[i]));
							doh.assertEqual(friends[i], item1);
							doh.assertEqual(store.getIdentity(friends[i]), 1);
							found++;
						}else if (i === 1){
							doh.assertTrue(store.isItem(friends[i]));
							doh.assertEqual(friends[i], item3);
							doh.assertEqual(store.getIdentity(friends[i]), 3);
							found++;
						}else if (i === 2){
							doh.assertTrue(store.isItem(friends[i]));
							doh.assertEqual(friends[i], item5);
							doh.assertEqual(store.getIdentity(friends[i]), 5);
							found++;
						}
					}
				}catch(e){
					doh.errback(e);
				}
				doh.assertEqual(3, found);
				deferred.callback(true);
			};
			store.fetch({onError: onError, onComplete: onComplete});
			return deferred;
		},
		function testReferenceIntegrity_deleteReferencedItem(){
			// summary:
			//		Simple test to verify the references were properly deleted.
			// description:
			//		Simple test to verify the references were properly deleted.

			var store = new dojo.data.ItemFileWriteStore(tests.data.ItemFileWriteStore.getTestData("reference_integrity"));

			var deferred = new doh.Deferred();
			var passed = true;
			function onError(error, request){
				deferred.errback(error);
			}
			function onItem(item, request){
				try{
					console.log("Before delete map state is: " + dojo.toJson(item[store._reverseRefMap]));
					store.deleteItem(item);
					console.log("After delete map state is: " + dojo.toJson(item[store._reverseRefMap]));
					function verifyRefDelete(items, request){
						var passed = true;
						for(var i = 0; i < items.length; i++){
							var curItem = items[i];
							var attributes = store.getAttributes(curItem);
							for(var j = 0; j < attributes.length; j++){
								var values = store.getValues(curItem, attributes[j]);
								var badRef = false;
								for(var k = 0; k < values.length; k++){
									var value = values[k];
									try{
										var id = store.getIdentity(value);
										if(id == 10){
											badRef = true;
											break;
										}
									}catch(e){/*Not an item, even a dead one, just eat it.*/}
								}
								if(badRef){
									deferred.errback(new Error("Found a reference remaining to a deleted item.  Failure."));
									passed = false;
									break;
								}
							}
						}
						if(passed){
							deferred.callback(true);
						}
					}
					store.fetch({onComplete: verifyRefDelete, onError: onError});
				}catch(error){
					deferred.errback(error);
				}
			}
			store.fetchItemByIdentity({identity: 10, onError: onError, onItem: onItem});
			return deferred;
		},
		function testReferenceIntegrity_deleteReferencedItemThenRevert(){
			// summary:
			//		Simple test to verify the references were properly deleted.
			// description:
			//		Simple test to verify the references were properly deleted.

			var store = new dojo.data.ItemFileWriteStore(tests.data.ItemFileWriteStore.getTestData("reference_integrity"));

			var deferred = new doh.Deferred();
			var passed = true;
			function onError(error, request){
				deferred.errback(error);
			}
			function onItem(item, request){
				try{
					//DO NOT EVER ACCESS THESE VARIABLES LIKE THIS!
					//THIS IS FOR TESTING INTERNAL STATE!
					console.log("Map before delete:");
					store._dumpReferenceMap();
					var beforeDelete = dojo.toJson(item[store._reverseRefMap]);
					store.deleteItem(item);
					console.log("Map after delete:");
					store._dumpReferenceMap();
					var afterDelete = dojo.toJson(item[store._reverseRefMap]);
					store.revert();
					console.log("Map after revert:");
					store._dumpReferenceMap();
					var afterRevert = dojo.toJson(item[store._reverseRefMap]);
					doh.assertTrue(afterRevert === beforeDelete);
				}catch(e){
					deferred.errback(e);
					passed = false;
				}
				if(passed){
					deferred.callback(true);
				}
			}
			store.fetchItemByIdentity({identity: 10, onError: onError, onItem: onItem});
			return deferred;
		},
		function testReferenceIntegrity_deleteMultipleItemsWithReferencesAndRevert(){
			// summary:
			//		Simple test to verify that a flow of deleting items with references and reverting does not damage the internal structure.
			//		Created for tracker bug: #5743
			// description:
			//		Simple test to verify that a flow of deleting items with references and reverting does not damage the internal structure.
			//		Created for tracker bug: #5743

			var store = new dojo.data.ItemFileWriteStore(tests.data.readOnlyItemFileTestTemplates.getTestData("countries_references"));

			var deferred = new doh.Deferred();
			var passed = true;
			function onError(error, request){
				deferred.errback(error);
				doh.assertTrue(false);
			}
			function onItem(item, request){
				//Save off the located item, then locate another one (peer to Egypt)
				doh.assertTrue(store.isItem(item));
				var egypt = item;

				function onItem2(item, request){
					doh.assertTrue(store.isItem(item));
					var nairobi = item;

					//Delete them
					store.deleteItem(egypt);
					store.deleteItem(nairobi);
					try{
						//Revert, then do a fetch.  If the internals have been damaged, this will generally
						//cause onError to fire instead of onComplete.
						store.revert();
						function onComplete(items, request){
							deferred.callback(true);
						}
						store.fetch({query: {name: "*"}, start: 0, count: 20, onComplete: onComplete, onError: onError});
					}catch(e){
						deferred.errback(e);
					}
				}
				store.fetchItemByIdentity({identity: "Nairobi", onError: onError, onItem: onItem2});
			}
			store.fetchItemByIdentity({identity: "Egypt", onError: onError, onItem: onItem});
			return deferred;
		},
		function testReferenceIntegrity_removeReferenceFromAttribute(){
			// summary:
			//		Simple test to verify the reference removal updates the internal map.
			// description:
			//		Simple test to verify the reference removal updates the internal map.

			var store = new dojo.data.ItemFileWriteStore(tests.data.ItemFileWriteStore.getTestData("reference_integrity"));

			var deferred = new doh.Deferred();
			var passed = true;
			function onError(error, request){
				deferred.errback(error);
				doh.assertTrue(false);
			}
			function onItem(item, request){
				try{
					store.setValues(item, "friends", [null]);

					function onItem2(item10, request){
						//DO NOT EVER ACCESS THESE VARIABLES LIKE THIS!
						//THIS IS FOR TESTING INTERNAL STATE!
						var refMap = item10[store._reverseRefMap];
						store._dumpReferenceMap();

						console.log("MAP for Item 10 is: " + dojo.toJson(refMap));

						//Assert there is no reference to item 10 in item 11's attribute 'friends'.
						doh.assertTrue(!refMap["11"]["friends"]);
						store.setValues(item, "siblings", [0, 1, 2]);
						//Assert there are no more references to 10 in 11.  Ergo, "11"  should be a 'undefined' attribute for the map of items referencing '10'..
						doh.assertTrue(!refMap["11"]);
						deferred.callback(true);
					}
					store.fetchItemByIdentity({identity: 10, onError: onError, onItem: onItem2});

				}catch(e){
					console.debug(e);
					deferred.errback(e);
					doh.assertTrue(false);
				}
			}
			store.fetchItemByIdentity({identity: 11, onError: onError, onItem: onItem});
			return deferred;
		},
		function testReferenceIntegrity_deleteReferencedItemNonParent(){
			// summary:
			//		Simple test to verify the references to a non-parent item was properly deleted.
			// description:
			//		Simple test to verify the references to a non-parent item was properly deleted.

			var store = new dojo.data.ItemFileWriteStore(tests.data.ItemFileWriteStore.getTestData("reference_integrity"));

			var deferred = new doh.Deferred();
			var passed = true;
			function onError(error, request){
				deferred.errback(error);
			}
			function onItem(item, request){
				try{
					console.log("Reference state for item 16 is: " + dojo.toJson(item[store._reverseRefMap]));
					store.deleteItem(item);
					function verifyRefDelete(items, request){
						var passed = true;
						for(var i = 0; i < items.length; i++){
							var curItem = items[i];
							var attributes = store.getAttributes(curItem);
							for(var j = 0; j < attributes.length; j++){
								var values = store.getValues(curItem, attributes[j]);
								var badRef = false;
								for(var k = 0; k < values.length; k++){
									var value = values[k];
									try{
										var id = store.getIdentity(value);
										if(id == 16){
											badRef = true;
											break;
										}
									}catch(e){/*Not an item, even a dead one, just eat it.*/}
								}
								if(badRef){
									deferred.errback(new Error("Found a reference remaining to a deleted item.  Failure."));
									passed = false;
									break;
								}
							}
						}
						if(passed){
							deferred.callback(true);
						}
					}
					store.fetch({onComplete: verifyRefDelete, onError: onError});
				}catch(error){
					deferred.errback(error);
				}
			}
			store.fetchItemByIdentity({identity: 16, onError: onError, onItem: onItem});
			return deferred;
		},
		function testReferenceIntegrity_addReferenceToAttribute(){
			// summary:
			//		Simple test to verify the reference additions can happen.
			// description:
			//		Simple test to verify the reference additions can happen.

			var store = new dojo.data.ItemFileWriteStore(tests.data.ItemFileWriteStore.getTestData("reference_integrity"));

			var deferred = new doh.Deferred();
			var passed = true;
			function onError(error, request){
				deferred.errback(error);
				doh.assertTrue(false);
			}
			function onComplete(items, request){

				doh.assertTrue(items.length > 2);

				var item1 = items[0];
				var item2 = items[1];

				//DO NOT EVER ACCESS THESE VARIABLES LIKE THIS!
				//THIS IS FOR TESTING INTERNAL STATE!
				console.log("Map state for Item 1 is: " + dojo.toJson(item1[store._reverseRefMap]));
				console.log("Map state for Item 2 is: " + dojo.toJson(item2[store._reverseRefMap]));

				store.setValue(item1, "siblings", item2);

				//Emit the current map state for inspection.
				console.log("Map state for Item 1 is: " + dojo.toJson(item1[store._reverseRefMap]));
				console.log("Map state for Item 2 is: " + dojo.toJson(item2[store._reverseRefMap]));

				doh.assertTrue(item2[store._reverseRefMap] !== null);

				//Assert there is a recorded reference to item 2 in item 1's attribute 'sibling'.
				doh.assertTrue(item2[store._reverseRefMap][store.getIdentity(item1)]["siblings"]);

				deferred.callback(true);
			}
			store.fetch({onError: onError, onComplete: onComplete});
			return deferred;
		},
		function testReferenceIntegrity_newItemWithParentReference(){
			// summary:
			//		Simple test to verify that newItems with a parent properly record the parent's reference in the map.
			// description:
			//		Simple test to verify that newItems with a parent properly record the parent's reference in the map.

			var store = new dojo.data.ItemFileWriteStore(tests.data.ItemFileWriteStore.getTestData("reference_integrity"));

			var deferred = new doh.Deferred();
			var passed = true;
			function onError(error, request){
				deferred.errback(error);
				doh.assertTrue(false);
			}
			function onItem(item, request){
				try{
					//Create a new item and set its parent to item 10's uncle attribute.
					var newItem = store.newItem({id: 17, name: "Item 17"}, {parent: item, attribute: "uncles"});

					//DO NOT EVER ACCESS THESE VARIABLES LIKE THIS!
					//THIS IS FOR TESTING INTERNAL STATE!
					//Look up the references to 17, as item 10 has one now on attribute 'uncles'
					var refs = newItem[store._reverseRefMap];

					//Assert there is a reference from 10 to item 17, on attribute uncle
					doh.assertTrue(refs["10"]["uncles"]);

					console.log("State of map of item 17 after newItem: " + dojo.toJson(refs));
				}catch(e){
					console.debug(e);
					deferred.errback(e);
					doh.assertTrue(false);
					passed = false;
				}
				if(passed){
					deferred.callback(true);
				}
			}
			store.fetchItemByIdentity({identity: 10, onError: onError, onItem: onItem});
			return deferred;
		},
		function testReferenceIntegrity_newItemWithReferenceToExistingItem(){
			// summary:
			//		Simple test to verify that a new item with references to existing items properly record the references in the map.
			// description:
			//		Simple test to verify that a new item with references to existing items properly record the references in the map.

			var store = new dojo.data.ItemFileWriteStore(tests.data.ItemFileWriteStore.getTestData("reference_integrity"));

			var deferred = new doh.Deferred();
			var passed = true;
			function onError(error, request){
				deferred.errback(error);
				doh.assertTrue(false);
			}
			function onItem(item, request){
				try{
					//DO NOT EVER ACCESS THESE VARIABLES LIKE THIS!
					//THIS IS FOR TESTING INTERNAL STATE!
					console.log("State of reference map to item 10 before newItem: " + dojo.toJson(item[store._reverseRefMap]));

					//Create a new item and set its parent to item 10's uncle attribute.
					var newItem = store.newItem({id: 17, name: "Item 17", friends: [item]});

					//DO NOT EVER ACCESS THESE VARIABLES LIKE THIS!
					//THIS IS FOR TESTING INTERNAL STATE!
					//Look up the references to 10, as item 17 has one on friends now.
					var refs = item[store._reverseRefMap];

					//Assert there is a reference from 15 to item 10, on attribute friends
					doh.assertTrue(refs["17"]["friends"]);

					console.log("State of reference map to item 10 after newItem: " + dojo.toJson(refs));
				}catch(e){
					console.debug(e);
					deferred.errback(e);
					doh.assertTrue(false);
					passed = false;
				}
				if(passed){
					deferred.callback(true);
				}
			}
			store.fetchItemByIdentity({identity: 10, onError: onError, onItem: onItem});
			return deferred;
		},
		function testReferenceIntegrity_disableReferenceIntegrity(){
			// summary:
			//		Simple test to verify reference integrity can be disabled.
			// description:
			//		Simple test to verify reference integrity can be disabled.

			var params = tests.data.ItemFileWriteStore.getTestData("reference_integrity");
			params.referenceIntegrity = false;
			var store = new dojo.data.ItemFileWriteStore(params);

			var deferred = new doh.Deferred();
			function onError(error, request){
				deferred.errback(error);
				doh.assertTrue(false);
			}
			function onItem(item, request){
				//DO NOT EVER ACCESS THESE VARIABLES LIKE THIS!
				//THIS IS FOR TESTING INTERNAL STATE!
				if(item[store._reverseRefMap] === undefined){
					deferred.callback(true);
				}else{
					deferred.errback(new Error("Disabling of reference integrity failed."));
				}
			}
			store.fetchItemByIdentity({identity: 10, onError: onError, onItem: onItem});
			return deferred;
		},
		function testReadAPI_close_dirty_failure(){
			// summary:
			//		Function to test the close api properly clears the store for reload when clearOnClose is set.
			if (dojo.isBrowser){
				var params = tests.data.readOnlyItemFileTestTemplates.getTestData("countries");
				params.clearOnClose = true;
				params.urlPreventCache = true;
				var store = new dojo.data.ItemFileWriteStore(params);

				var d = new doh.Deferred();
				var onItem = function(item){
					var error = null;
					try {
						doh.assertTrue(item !== null);
						var ec = item;
						var val = store.getValue(ec, "name");
						doh.assertEqual("Ecuador", val);
						var newItem = store.newItem({abbr: "foo", name: "bar"});

						//Should throw an error...
						store.close();
					}catch (e){
						error = e;
					}
					if (error === null){
						d.errback(new Error("Store was dirty, should have thrown an error on close!"));
					}else{
						d.callback(true);
					}
				};
				var onError = function(errData){
					d.errback(errData);
				};
				store.fetchItemByIdentity({identity:"ec", onItem:onItem, onError:onError});
				return d; // Deferred
			}
		}
	]
);


});
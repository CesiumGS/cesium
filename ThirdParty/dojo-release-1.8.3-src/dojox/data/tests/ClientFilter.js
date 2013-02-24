dojo.provide("dojox.data.tests.ClientFilter");
dojo.require("dojox.data.ClientFilter");
dojo.require("dojox.data.JsonRestStore");


mockService = function(query){
	var dfd = new dojo.Deferred();
	setTimeout(function(){
		dfd.callback([{firstName:"John",lastName:"Smith",__id:"mock/1"},
				{firstName:"Jim",lastName:"Smith",__id:"mock/2"},
				{firstName:"Jill",lastName:"Smith",__id:"mock/3"},
				{firstName:"Jerry",lastName:"Smith",__id:"mock/4"}]);
	},10);
	return dfd;
};
mockService.servicePath = "mock/";
jsonStore = new dojox.data.JsonRestStore({service:mockService});

doh.register("dojox.data.tests.ClientFilter",
	[
		function updateWhileLoading(t) {
			var d = new doh.Deferred();
			jsonStore.fetch({query:{lastName:"Smith",firstName:"*"},sort:[{attribute:"firstName",descending:true}],
				onComplete: function(items, request){
					t.is(5, items.length); // make sure it was added
					t.is(newJack,items[4]); // make sure it is in the right location
					console.log("updateWhileLoading",items[4],newJack);
					d.callback(true);
				}
			});
			newJack = jsonStore.newItem({firstName:"Jack",lastName:"Smith"}); // this should fire while we are waiting for the fetch response
			return d;
		},
		function makeChanges(t) {
			// summary:
			//		Simple test of a basic fetch on JsonRestStore of a simple query.
			var d = new doh.Deferred();
			jsonStore.fetch({queryOptions:{cache:true},query:{lastName:"Smith",firstName:"*"},sort:[{attribute:"firstName",descending:true}],
				onComplete: function(items, request){
					t.is(5, items.length); // make sure it was added
					t.is(newJack,items[4]); // make sure it is in the right location
					console.log("items[4]",items[4]);
					var newJoe = jsonStore.newItem({firstName:"Joe",lastName:"Smith"});
					t.is(5, items.length); // make sure it was not added yet
					jsonStore.updateResultSet(items, request);
					t.is(6, items.length); // make sure it was added
					t.is(newJoe,items[1]); // make sure it is in the right location
					var jackJones = jsonStore.newItem({firstName:"Jack",lastName:"Jones"});
					jsonStore.updateResultSet(items, request);
					t.is(6, items.length); // make sure it is not added
					jsonStore.setValue(newJoe,"firstName","Jesse");
					jsonStore.updateResultSet(items, request);
					t.is(6, items.length); // make sure it is the same
					t.is(newJoe,items[3]); // make sure it is in the new right location
					t.f(newJoe==items[1]); // make sure it is not in the old location
					jsonStore.deleteItem(newJack);
					jsonStore.updateResultSet(items, request);
					t.is(5, items.length); // make sure it is has been removed
					jsonStore.setValue(newJoe,"lastName","Baker");
					jsonStore.updateResultSet(items, request);
					t.is(4, items.length); // make sure it is has been removed
					jsonStore.setValue(jackJones,"lastName","Smith");
					jsonStore.updateResultSet(items, request);
					t.is(5, items.length); // make sure it is has been added
				}
			});
			console.log("sent first");
			var finished;
			jsonStore.fetch({query:{lastName:"Smith",firstName:"Jack"},sort:[{attribute:"firstName",descending:true}],
				onComplete: function(items, request){
					console.log("items first",items);
					finished = true;
					t.is(1, items.length); // make sure we get the correct number of items
					d.callback(true);
				}
			});
			console.log("sent seconds");
			t.f(finished); // this should finish synchronously, because we should have it in the cache
			return d; //Object
		},
		function cachedResults(t) {
			var d = new doh.Deferred();
			var finished;
			jsonStore.fetch({query:{lastName:"Smith",firstName:"Jack"},sort:[{attribute:"firstName",descending:true}],
				onComplete: function(items, request){
					console.log("items",items);
					finished = true;
					t.is(1, items.length); // make sure we get the correct number of items
					d.callback(true);
				}
			});
			t.t(finished); // this should finish synchronously, because we should have it in the cache
			return d;
		},
		function repeatedQueries(t) {
			var d = new doh.Deferred();
			var finished;
			jsonStore.fetch({queryOptions:{cache:true},query:{},
				onComplete: function(items, request){
					console.log("items",items);
					t.is(6, items.length); // make sure we get the correct number of items
					jsonStore.newItem({firstName:"Jack",lastName:"Jones"});
					jsonStore.fetch({query:{},
						onComplete: function(items, request){
							t.is(7, items.length); // make sure we get the correct number of items
						}
					});
					jsonStore.serverVersion = jsonStore._updates.length;
					jsonStore.newItem({firstName:"Jack",lastName:"Jones"});
					jsonStore.fetch({query:{},
						onComplete: function(items, request){
							finished = true;
							t.is(8, items.length); // make sure we get the correct number of items
							d.callback(true);
						}
					});
				}
			});
			return d;
		},
		
		function sorting(t) {
			var d = new doh.Deferred();
			var finished;
			// test sorting. Descending order should be John,Jim,Jill,Jerry,Jack
			jsonStore.fetch({query:{lastName:"Smith",firstName:"*"},sort:[{attribute:"firstName",descending:true}],
				onComplete: function(items, request){
					var last = jsonStore.getValue(items[0], "firstName");
					console.log("last name: ",last, items[0]);

					t.is("John", last); // make sure we get the correct number of items

					jsonStore.fetch({query:{lastName:"Smith",firstName:"*"},sort:[{attribute:"firstName"}],
						onComplete: function(items, request){
							var first = jsonStore.getValue(items[0], "firstName");
							console.log("first name",first, items[0]);
							finished = true;
							t.is("Jack", first); // make sure we get the correct number of items

							d.callback(true);
						}
					});
				}
			});
			t.t(finished); // this should finish synchronously, because we should have it in the cache
			return d;
		}
		
	]
);

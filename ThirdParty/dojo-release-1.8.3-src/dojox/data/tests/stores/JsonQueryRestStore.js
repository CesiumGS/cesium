dojo.provide("dojox.data.tests.stores.JsonQueryRestStore");
dojo.require("dojox.data.ClientFilter");
dojo.require("dojox.data.JsonQueryRestStore");

dojox.data.tests.stores.JsonQueryRestStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	d.errback(errData);
};
testService = function(query){
	lastQuery = query;
	var deferred = new dojo.Deferred();
	deferred.callback([
		{id:1, name:"Ball", price: 5},
		{id:2, name:"Car", price: 15},
		{id:3, name:"Truck", price: 25},
		{id:4, name:"Hula Hoop", price: 55}
	]);
	return deferred;
	
};
testService.servicePath = "/testing";
jsonStore = new dojox.data.JsonQueryRestStore({service:testService});

doh.register("dojox.data.tests.stores.JsonQueryRestStore",
	[
		{
			name: "Fetch using a query object",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonQueryRestStore of a simple query.
				var d = new doh.Deferred();
				jsonStore.fetch({query:{name:"Car"},
					onComplete: function(items, request){
						t.is(lastQuery,"[?(@.name='Car')]");
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonQueryRestStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "Fetch+Sorting using a query object",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonQueryRestStore of a simple query.
				var d = new doh.Deferred();
				jsonStore.fetch({query:{name:"Car"},
					sort:[{attribute:"price"}],
					onComplete: function(items, request){
						t.is(lastQuery,"[?(@.name='Car')][/@['price']]");
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonQueryRestStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "Fetch all items (and cache for the next tests)",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonQueryRestStore of a simple query.
				var d = new doh.Deferred();
				jsonStore.fetch({query:"",
					onComplete: function(items, request){
						testItems = items;
						console.log(items.length, items);
						t.is(4, items.length);
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonQueryRestStore.error, doh, d),
					queryOptions:{cache:true}
				});
				return d; //Object
			}
		},
		{
			name: "Fetch using a query object",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonQueryRestStore of a simple query.
				var d = new doh.Deferred();
				lastQuery = null;
				jsonStore.fetch({query:{name:"Car"},
					onComplete: function(items, request){
						t.is(1, items.length);
						t.is(lastQuery, null); // should not be sent to the service
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonQueryRestStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "Fetch using a JSONQuery",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonQueryRestStore of a simple query.
				var d = new doh.Deferred();
				lastQuery = null;
				jsonStore.fetch({query:"?name='Car'",
					onComplete: function(items, request){
						t.is(1, items.length);
						t.is(lastQuery, null); // should not be sent to the service
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonQueryRestStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "Fetch using a JSONQuery with operator",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonQueryRestStore of a simple query.
				var d = new doh.Deferred();
				lastQuery = null;
				jsonStore.fetch({query:"[?price<20]",
					onComplete: function(items, request){
						t.is(2, items.length);
						t.is(lastQuery, null); // should not be sent to the service
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonQueryRestStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "Fetch using a JSONQuery with operator and paging",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonQueryRestStore of a simple query.
				var d = new doh.Deferred();
				lastQuery = null;
				jsonStore.fetch({query:"?price<20",start:1, count:1,
					onComplete: function(items, request){
						t.is(1, items.length);
						t.is(lastQuery, null); // should not be sent to the service
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonQueryRestStore.error, doh, d),
					queryOptions:{cache:true}
				});
				return d; //Object
			}
		},
		{
			name: "Sorting",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonQueryRestStore of a simple query.
				var d = new doh.Deferred();
				lastQuery = null;
				jsonStore.fetch({sort:[{attribute:"name", descending: true}],
					onComplete: function(items, request){
						t.is("Truck", items[0].name);
						t.is("Ball", items[3].name);
						t.is(lastQuery, null); // should not be sent to the service
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonQueryRestStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "Sorting + Paging",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonQueryRestStore of a simple query.
				jsonStore.jsonQueryPagination = true;
				var d = new doh.Deferred();
				lastQuery = null;
				jsonStore.fetch({sort:[{attribute:"name", descending: true}],start:1, count:2,
					onBegin: function(count){
						t.is(count,4);
					},
					onComplete: function(items, request){
						t.is("Hula Hoop", items[0].name);
						t.is("Car", items[1].name);
						t.is(items.length, 2);
						t.is(lastQuery, null); // should not be sent to the service
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonQueryRestStore.error, doh, d)
				});
				return d; //Object
			}
		}
	]
);

dojo.provide("dojox.rpc.tests.stores.JsonRestStore");

dojo.require("dojox.data.JsonRestStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojox.rpc.Service");

dojox.rpc.tests.stores.JsonRestStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	d.errback(errData);
}
var testServices = new dojox.rpc.Service(dojo.moduleUrl("dojox.rpc.tests.resources", "test.smd"));
var jsonStore = new dojox.data.JsonRestStore({service:testServices.jsonRestStore});

doh.register("dojox.rpc.tests.stores.JsonRestStore",
	[
		{
			name: "Fetch some items",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonRestStore of a simple query.
				var d = new doh.Deferred();
				jsonStore.fetch({query:"query",
					onComplete: function(items, request){
						t.is(4, items.length);
						d.callback(true);
					},
					onError: dojo.partial(dojox.rpc.tests.stores.JsonRestStore.error, doh, d)});
				return d; //Object
			}
		},
		{
			name: "fetch by id",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on JsonRestStore of a single item.
				var d = new doh.Deferred();
				jsonStore.fetch({query:"obj1",
					onComplete: function(item, request){
						t.is("Object 1", item.name);
						t.t(jsonStore.hasAttribute(item,"name"));
						t.is(jsonStore.getValues(item,"name").length,1);
						t.t(jsonStore.isItem(item));
						d.callback(true);
					},
					onError: dojo.partial(dojox.rpc.tests.stores.JsonRestStore.error, doh, d)});
				return d; //Object
			}
		},
		{
			name: "Modify,save, check by id",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Fetch an item from a query, modify and save it, and check to see if it was modified correctly
				var d = new doh.Deferred();
				jsonStore.fetch({query:"query",
					onComplete: function(items, request){
						var now = new Date().getTime();
						jsonStore.setValue(items[0],"updated",now);
						jsonStore.setValue(items[0],"obj",{foo:'bar'});
						jsonStore.setValue(items[0],"obj dup",items[0].obj);
						jsonStore.setValue(items[0],"testArray",[1,2,3,4]);
						jsonStore.save();
						jsonStore.fetch({query:"obj1",
							onComplete: function(item, request){
								t.is("Object 1", item.name);
								t.is(now, item.updated);
								t.is("bar", item.obj.foo);
								t.is(item.obj, item['obj dup']);
								d.callback(true);
							},
							onError: dojo.partial(dojox.rpc.tests.stores.JsonRestStore.error, doh, d)});
					},
					onError: dojo.partial(dojox.rpc.tests.stores.JsonRestStore.error, doh, d)});
				return d; //Object
			}
		},
		{
			name: "Post, delete, and put",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		append/post an item, delete it, sort the lists, resort the list, saving each time.
				var d = new doh.Deferred();
				jsonStore.fetch({query:"obj1",
					onComplete: function(item, request){
						var now = new Date().getTime();
						var testArray = item.testArray;
						var newObject = {"name":"new object"};
						testArray.push(newObject);
						jsonStore.save();
						jsonStore.deleteItem(newObject,{parent:testArray});
						jsonStore.save();
						testArray.sort(function(obj1,obj2) { return obj1 < obj2; });
						jsonStore.save();
						testArray.sort(function(obj1,obj2) { return obj1 > obj2; });
						jsonStore.save();
						d.callback(true);
					},
					onError: dojo.partial(dojox.rpc.tests.stores.JsonRestStore.error, doh, d)});
				return d; //Object
			}
		},
		{
			name: "Revert",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		append/post an item, delete it, sort the lists, resort the list, saving each time.
				var d = new doh.Deferred();
				jsonStore.fetch({query:"obj1",
					onComplete: function(item, request){
						jsonStore.setValue(item,"name","new name");
						jsonStore.setValue(item,"newProp","new value");
						jsonStore.unsetAttribute(item,"updated");
						t.is(jsonStore.getValue(item,"name"),"new name");
						t.is(jsonStore.getValue(item,"newProp"),"new value");
						t.is(jsonStore.getValue(item,"updated"),undefined);
						jsonStore.revert();
						t.is(jsonStore.getValue(item,"name"),"Object 1");
						t.is(jsonStore.getValue(item,"newProp"),undefined);
						t.t(typeof jsonStore.getValue(item,"updated") == 'number');
						d.callback(true);
					},
					onError: dojo.partial(dojox.rpc.tests.stores.JsonRestStore.error, doh, d)});
				return d; //Object
			}
		},
		{
			name: "Lazy loading",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		test lazy loading
				var d = new doh.Deferred();
				jsonStore.fetch({query:"query",
					onComplete: function(items, request){
						/*var item = jsonStore.getValue(items,2); // sync lazy loading
						t.is(item.name == 'Object 3');*/
						jsonStore.getValue(items,3,function(item) { // async lazy loading
							t.is(item.name,'Object 4');
							d.callback(true);
						});
					},
					onError: dojo.partial(dojox.rpc.tests.stores.JsonRestStore.error, doh, d)});
				return d; //Object
			}
		},
		{
			name: "Array manipulation",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		test array manipulation
				var d = new doh.Deferred();
				jsonStore.fetch({query:"obj1",
					onComplete: function(item, request){
						var testArray = item.testArray;
						testArray.reverse();
						testArray.unshift(testArray.pop());
						jsonStore.onSave = function(data) {
							t.is(data.length,1);
							d.callback(true);
							jsonStore.onSave = function(){};
						};
						jsonStore.save();
					},
					onError: dojo.partial(dojox.rpc.tests.stores.JsonRestStore.error, doh, d)});
				return d; //Object
			}
		},
		
		{
			name: "ReadAPI:  Fetch_20_Streaming",
			timeout:	10000, //10 seconds.  Json can sometimes be slow.
			runTest: function(t) {
				// summary:
				//		fetching with paging

				var d = new doh.Deferred();
				var count = 0;

				function onItem(item, requestObj){
				  t.assertTrue(typeof item == 'number');
				  count++;
				}
				function onComplete(items, request){
					t.is(5, count);
					
					t.is(null, items);
					d.callback(true);
				}
				//Get everything...
				jsonStore.fetch({
					query: "bigQuery",
					onBegin: null,
					count: 5,
					onItem: onItem,
					onComplete: onComplete,
					onError: dojo.partial(dojox.rpc.tests.stores.JsonRestStore.error, t, d)
				});
				return d; //Object
			}
		},
		function testReadAPI_functionConformance(t){
			// summary:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.
			// description:
			//		Simple test read API conformance.  Checks to see all declared functions are actual functions on the instances.

			var readApi = new dojo.data.api.Read();
			var passed = true;

			for(i in readApi){
				if(i.toString().charAt(0) !== '_')
				{
					var member = readApi[i];
					//Check that all the 'Read' defined functions exist on the test store.
					if(typeof member === "function"){
						var testStoreMember = jsonStore	[i];
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


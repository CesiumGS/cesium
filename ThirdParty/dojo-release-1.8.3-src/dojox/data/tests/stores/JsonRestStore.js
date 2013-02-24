dojo.provide("dojox.data.tests.stores.JsonRestStore");
dojo.require("dojox.rpc.Service");
//dojo.require("dojox.data.ClientFilter");
dojo.require("dojox.data.JsonRestStore");
dojo.require("dojox.json.schema");
dojo.require("dojo.data.api.Read");

dojox.data.tests.stores.JsonRestStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	d.errback(errData);
};
testServices = new dojox.rpc.Service(require.toUrl("dojox/rpc/tests/resources/test.smd"));
testServices.jsonRestStore.servicePath = "/jsonRest.Store/"; // this makes the regex more challenging
jsonStore = new dojox.data.JsonRestStore({service:testServices.jsonRestStore});

doh.register("dojox.data.tests.stores.JsonRestStore",
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
					onError: dojo.partial(dojox.data.tests.stores.JsonRestStore.error, doh, d)
				});
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
					onError: dojo.partial(dojox.data.tests.stores.JsonRestStore.error, doh, d)
				});
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
						jsonStore.save({onComplete:function(){
							jsonStore.fetchItemByIdentity({identity:"obj1",
								onItem: function(item, request){
									t.is("Object 1", item.name);
									t.is(now, item.updated);
									t.is("bar", item.obj.foo);
									t.is(item.obj, item['obj dup']);
									d.callback(true);
								},
								onError: dojo.partial(dojox.data.tests.stores.JsonRestStore.error, doh, d)
							});
						}});
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonRestStore.error, doh, d)
				});
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
					onError: dojo.partial(dojox.data.tests.stores.JsonRestStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "Delete",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		append/post an item, delete it, sort the lists, resort the list, saving each time.
				var d = new doh.Deferred();
				jsonStore.fetchItemByIdentity({identity:"obj1",
					onItem: function(item, request){
						var newItem = jsonStore.newItem({directRef: item, name:"Foo"});
						jsonStore.setValue(newItem, "arrayRef", [1,{subobject:item},item]);
						jsonStore.deleteItem(item);
						t.is(jsonStore.getValue(newItem, "directRef"), undefined);
						t.is(jsonStore.getValue(newItem, "arrayRef").length, 2);
						t.is(jsonStore.getValue(newItem, "arrayRef")[1].subobject, undefined);
						jsonStore.revert();
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonRestStore.error, doh, d)
				});
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
						var item = items[2];
						t.f(jsonStore.isItemLoaded(item));
						jsonStore.getValue(item,"name"); // this should trigger the load
						t.is(items[2],item);
						t.is(item.name,'Object 3');
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonRestStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "Lazy loading 2",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		test lazy loading
				var d = new doh.Deferred();
				jsonStore.fetch({query:"query",
					onComplete: function(items, request){
						t.f(jsonStore.isItemLoaded(items[3]));
						jsonStore.loadItem({item:items[3],onItem:function(item){
							t.t(jsonStore.isItemLoaded(items[3]));
							t.is(item,items[3]);
							t.is(item.name,'Object 4');
							d.callback(true);
						}});
						
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonRestStore.error, doh, d)
				});
				return d; //Object
			}
		},
		/*{
			name: "Load Lazy Value",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on ServiceStore of a single item.
				var d = new doh.Deferred();
				jsonStore.fetchItemByIdentity({identity:"obj1",
					onItem: function(item, request){
						t.is("Object 1", item.name);
						t.f(jsonStore.isItemLoaded(item.lazyValue));
						var lazyValue = jsonStore.getValue(item,"lazyValue");
						t.is("Finally loaded",lazyValue);
						lazyValue = jsonStore.getValue(item,"lazyValue");
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.JsonRestStore.error, doh, d)
				});
				return d; //Object
			}
		},*/
		
		{
			name: "IdentityAPI: fetchItemByIdentity and getIdentity",
			timeout: 30000,
			runTest: function(t) {
				// summary:
				//		Verify the fetchItemByIdentity method works
				var d = new doh.Deferred();
		
				jsonStore.fetchItemByIdentity({identity:"obj3",
					onItem: function(item, request){
						t.t(jsonStore.isItemLoaded(item));
						t.is(jsonStore.getIdentity(item),"obj3");
					}
				});
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
					t.is(20, count);
					
					d.callback(true);
				}
				//Get everything...
				jsonStore.fetch({
					query: "bigQuery",
					onBegin: null,
					count: 20,
					onItem: onItem,
					onComplete: onComplete,
					onError: dojo.partial(dojox.data.tests.stores.JsonRestStore.error, t, d)
				});
				return d; //Object
			}
		},
		function testSchema(t){
			var d = new doh.Deferred();
			jsonStore.fetchItemByIdentity({identity:"obj3",
				onItem: function(item, request){
					var set = false;
					try{
						jsonStore.setValue(item,"name",333); // should only take a string, so it should throw an exception
						set = true;
					}catch(e){
						console.log("Correctly blocked invalid property change by schema:",e);
					}
					try{
						jsonStore.setValue(item,"name","a"); // should be at least three character, so it should throw an execption
						set = true;
					}catch(e){
						console.log("Correctly blocked invalid property change by schema:",e);
					}
					t.f(set);
					d.callback(true);
				}
			});
			
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
		},
		function tryToLoadSameTarget(t){
			t.is(
				dojox.data.JsonRestStore.getStore({target:"/something/"},dojox.data.JsonRestStore),
				dojox.data.JsonRestStore.getStore({target:"/something/"}));
			
		}
	]
);
performanceTest = function (){
	dojo.require("dojo.data.ItemFileReadStore");
	jsonStore.fetch({query:"obj1",
		onComplete: function(item){
			var now = new Date().getTime();
			var result;
			for(var i=0;i<100000;i++){
			}
			console.log("Just Loop",new Date().getTime()-now, result);
			now = new Date().getTime();
			for(i=0;i<100000;i++){
				result = item.name;
			}
			console.log("Direct Access",new Date().getTime()-now, result);
			
			now = new Date().getTime();
			for(i=0;i<100000;i++){
				result = jsonStore.getValue(item,"name");
			}
			console.log("getValue",new Date().getTime()-now);
			
			var ifrs = new dojo.data.ItemFileReadStore({data:{ identifier:'id',items: [
				{ id:'1',name:'Fozzie Bear', wears:['hat', 'tie']},
				{ id:'2',name:'Miss Piggy', pets:'Foo-Foo'}
			]}});
			ifrs.fetchItemByIdentity({identity:'1',onItem:function(result){
				item = result;
			}});
			
			now = new Date().getTime();
			for(i=0;i<100000;i++){
				result = ifrs.getValue(item,"name");
			}
			console.log("ifrs.getValue",new Date().getTime()-now,result);
			
		}
	});

}

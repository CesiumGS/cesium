dojo.provide("dojox.data.tests.stores.ServiceStore");
dojo.require("dojox.rpc.Service");
dojo.require("dojox.rpc.Rest");
//dojo.require("dojox.data.ClientFilter");
dojo.require("dojox.data.ServiceStore");
dojo.require("dojo.data.api.Read");
dojox.data.tests.stores.ServiceStore.error = function(t, d, errData){
	// summary:
	//		The error callback function to be used for all of the tests.
	d.errback(errData);
};
var testServices = new dojox.rpc.Service(require.toUrl("dojox/rpc/tests/resources/test.smd"));
var jsonStore = new dojox.data.ServiceStore({service:testServices.jsonRestStore});

doh.register("dojox.data.tests.stores.ServiceStore",
	[
		{
			name: "Fetch some items",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on ServiceStore of a simple query.
				var d = new doh.Deferred();
				jsonStore.fetch({query:"query",
					onComplete: function(items, request){
						t.is(4, items.length);
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.ServiceStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "fetchItemByIdentity, getValue, getValues, hasAttribute,containsValue, getAttributes, getIdentity",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on ServiceStore of a single item.
				var d = new doh.Deferred();
				jsonStore.fetchItemByIdentity({identity:1,
					onItem: function(item, request){
						t.is("Object 1", item.name);
						t.is("Object 1",jsonStore.getValue(item,"name"));
						t.t(jsonStore.hasAttribute(item,"name"));
						t.is(jsonStore.getValues(item,"name").length,1);
						t.t(jsonStore.isItem(item));
						t.t(jsonStore.isItemLoaded(item));
						t.t(jsonStore.containsValue(item,"name","Object 1"));
						t.f(jsonStore.containsValue(item,"name","Something Else"));
						t.is(jsonStore.getIdentity(item),1);
						t.t(dojo.indexOf(jsonStore.getAttributes(item),"name")>-1);
						t.is("default",jsonStore.getValue(item,"nothing","default"));
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.ServiceStore.error, doh, d)
				});
				return d; //Object
			}
		},
		{
			name: "createLazyItem",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				// summary:
				//		Simple test of a basic fetch on ServiceStore of a single item.
				var d = new doh.Deferred();
				var lazyItem = {
					_loadObject: function(callback){
						this.name="loaded";
						delete this._loadObject;
						callback(this);
					}
				};
				t.f(jsonStore.isItemLoaded(lazyItem));
				jsonStore.loadItem({item:lazyItem,onItem:function(){
					t.t(jsonStore.isItemLoaded(lazyItem));
					t.is(lazyItem.name,"loaded");
					d.callback(true);
				}});
				return d; //Object
			}
		},
		{
			name: "lazyItem With Fetch",
			timeout:	10000, //10 seconds.
			runTest: function(t) {
				var d = new doh.Deferred();
				jsonStore.idAttribute = "id";
				jsonStore.syncMode = true;
				jsonStore.fetch({query:"query",
					onComplete: function(items, request){
						items[0]._loadObject = function(callback){
							jsonStore.fetch({query:this.id,onComplete:callback});
						}
						t.t(jsonStore.getValue(items[0],"testArray").length);
						d.callback(true);
					},
					onError: dojo.partial(dojox.data.tests.stores.ServiceStore.error, doh, d)
				});
				return d;
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
					onError: dojo.partial(dojox.data.tests.stores.ServiceStore.error, t, d)
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


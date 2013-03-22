dojo.provide("dojox.data.tests.stores.WikipediaStore");

dojo.require("dojox.data.WikipediaStore");
dojo.require("dojo.data.api.Read");
dojo.require("dojo.data.api.Identity");

dojox.data.tests.stores.WikipediaStore.getStore = function(){
	return new dojox.data.WikipediaStore();
};

dojox.data.tests.stores.WikipediaStore.error = function(t, d, errData){
	// summary:
	//		Our shared error callback
	d.errback(errData);
};

doh.register("dojox.data.tests.stores.WikipediaStore",[
	{
		name: "ReadAPI: containsValue",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify the containsValue method functions correctly.
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			// hopefully Wikipedia doesn't rename the Main Page!
			ws.fetch({
				query: { title: "Main Page" },
				onComplete: function(items, length){
					t.is(1, items.length);
					t.t(ws.containsValue(items[0], "title", "Main Page"));
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: fetch (one)",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Test a single page fetch from Wikipedia
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { title: "Main Page" },
				onItem: function(item, request){
					t.t(item.title && item.title.length && item.title.length > 0);
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, doh, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: fetch (query 30)",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Test a full text search from Wikipedia
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { action: "query", text: "dojo" },
				count: 30,
				onComplete: function(items, request){
					t.is(30, items.length);
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: fetch (paged)",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Test multiple fetches on a single full text search.
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();
			var count = 0;

			ws.fetch({
				query: { action: "query", text: "dojo" },
				count: 15,
				onComplete: function(items, request){
					t.is(15, items.length);
					count = items.length;
					ws.fetch({
						query: { action: "query", text: "dojo" },
						start: count+1,
						count: 15,
						onComplete: function(items, request){
							t.is(30, count + items.length);
							d.callback(true);
						}
					});
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: getAttributes",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify the getAttributes method functions correctly
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { title: "Main Page" },
				onComplete: function(items, request){
					t.is(1, items.length);
					t.t(ws.isItem(items[0]));
					t.t(ws.getAttributes(items[0]).length > 0);
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: getLabel",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Test that the store correctly sets a label.
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { action: "query", text: "dojo" },
				count: 1,
				onComplete: function(items, request){
					t.is(1, items.length);
					t.t(ws.getLabel(items[0]) !== null);
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: getLabelAttributes",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Test that the store correctly enumerates the label attributes.
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { action: "query", text: "dojo" },
				count: 1,
				onComplete: function(items, request){
					t.is(1, items.length);
					var labels = ws.getLabelAttributes(items[0]);
					t.t(dojo.isArray(labels));
					t.is("title", labels[0]);
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: getValue",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify that getValue does what it should.
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { title: "Main Page" },
				onComplete: function(items, request){
					t.is(1, items.length);
					var i = items[0];
					t.t(ws.getValue(i, "text") !== null);
					t.t(ws.getValue(i, "links") !== null);
					t.t(ws.getValue(i, "categories") !== null);
					t.t(ws.getValue(i, "images") !== null);
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: getValues",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify that getValues does what it should
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { title: "Main Page" },
				onComplete: function(items, request){
					t.is(1, items.length);
					var i = items[0];
					t.t(dojo.isArray(ws.getValues(i, "text")));
					t.t(dojo.isArray(ws.getValues(i, "links")));
					t.t(dojo.isArray(ws.getValues(i, "categories")));
					t.t(dojo.isArray(ws.getValues(i, "images")));
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: hasAttribute",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify the hasAttribute method
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { title: "Main Page" },
				onComplete: function(items, request){
					t.is(1, items.length);
					var i = items[0];
					t.t(i !== null);
					t.t(ws.hasAttribute(i, "title"));
					t.t(ws.hasAttribute(i, "text"));
					t.t(ws.hasAttribute(i, "links"));
					t.t(ws.hasAttribute(i, "categories"));
					t.t(ws.hasAttribute(i, "images"));
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: isItem",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify the isItem method
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { action: "query", text: "dojo" },
				count: 10,
				onComplete: function(items, request){
					t.is(10, items.length);
					for(var i=0; i<items.length; i++){
						t.t(ws.isItem(items[i]));
					}
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: isItemLoaded",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify the isItemLoaded method
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { action: "query", text: "dojo" },
				count: 5,
				onComplete: function(items, request){
					t.is(5, items.length);
					ws.loadItem({
						item: items[0],
						onItem: function(loadedItem, loadedRequest){
							t.t(ws.isItemLoaded(loadedItem));
							t.f(ws.isItemLoaded(items[1])); // test an invalid item
							d.callback(true);
						}
					});
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "IdentityAPI: getIdentity",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify the getIdentity method returns the correct value
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { title: "Main Page" },
				onComplete: function(items, request){
					t.is(1, items.length);
					t.t(ws.isItem(items[0]));
					t.t(ws.getIdentity(items[0]) === "Main Page");
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "ReadAPI: loadItem",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify the loadItem method
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { action: "query", text: "dojo" },
				count: 5,
				onComplete: function(items, request){
					t.is(5, items.length);
					t.t(ws.isItem(items[0]));
					t.t(ws.getIdentityAttributes(items[0]).length > 0);
					ws.loadItem({
						item: items[0],
						onItem: function(item, request){
							t.t(ws.isItem(item));
							t.t(ws.isItemLoaded(item));
							d.callback(true);
						}
					});
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "IdentityAPI: getIdentityAttributes",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify the getIdentityAttributes method functions correctly
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { title: "Main Page" },
				onComplete: function(items, request){
					t.is(1, items.length);
					t.t(ws.isItem(items[0]));
					t.t(ws.getIdentityAttributes(items[0]).length > 0);
					d.callback(true);
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	{
		name: "IdentityAPI: fetchItemByIdentity",
		timeout: 30000,
		runTest: function(t) {
			// summary:
			//		Verify the fetchItemByIdentity method works
			var ws = dojox.data.tests.stores.WikipediaStore.getStore();
			var d = new doh.Deferred();

			ws.fetch({
				query: { title: "Main Page" },
				onComplete: function(items, request){
					var firstItem = items[0];
					t.is(1, items.length);
					t.t(ws.isItem(firstItem));
					ws.fetchItemByIdentity({
						identity: "Main Page",
						onItem: function(item, request){
							t.t(ws.isItem(item));
							t.t(ws.getValue(firstItem, "title") === ws.getValue(item, "title"));
							d.callback(true);
						}
					});
				},
				onError: dojo.partial(dojox.data.tests.stores.WikipediaStore.error, t, d)
			});
			return d;
		}
	},
	

	function testIdentityAPI_getFeatures(t){
		// summary:
		//		Test that the store correctly advertises its capabilities
		var ws = dojox.data.tests.stores.WikipediaStore.getStore();

		var features = ws.getFeatures();
		var count = 0;
		for(var i in features){
			if(i === "dojo.data.api.Read") count++;
			if(i === "dojo.data.api.Identity") count++;
		}
		t.assertTrue(count === 2);
	},

	function testIdentityAPI_functionConformance(t){
		// summary:
		//		Tests for Identity API conformance by checking to see that all declared functions are actual functions on the instances.
		var ws = dojox.data.tests.stores.WikipediaStore.getStore();
		var identityApi = new dojo.data.api.Identity();
		var passed = true;
		for(var i in identityApi){
			if(i.toString().charAt(0) === '_'){
				continue;
			}
			// check that every function defined in the Identity API is defined on the store
			if(typeof identityApi[i] === "function"){
				if(!(typeof ws[i] === "function")){
					console.log("Error:" + i + " should be a function but is: " + typeof ws[i]);
					passed = false;
					break;
				}
			}
		}
		t.assertTrue(passed);
	}
]);

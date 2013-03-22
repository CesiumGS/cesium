dojo.provide("dojo.tests.data.ObjectStore");
dojo.require("dojo.data.ObjectStore");
dojo.require("dojo.store.JsonRest");
dojo.require("dojo.store.Memory");

(function(){
var restStore = new dojo.store.JsonRest({target: dojo.moduleUrl("dojo.tests.store", "/")});
var memoryStore = new dojo.store.Memory({
	data: [
		{id: 1, name: "one", prime: false},
		{id: 2, name: "two", even: true, prime: true},
		{id: 3, name: "three", prime: true},
		{id: 4, name: "four", even: true, prime: false},
		{id: 5, name: "five", prime: true}
	]
});

var dataStore = new dojo.data.ObjectStore({objectStore: restStore});
var memoryDataStore = new dojo.data.ObjectStore({objectStore: memoryStore});
tests.register("tests.data.ObjectStore",
	[
		function testFetchByIdentity(t){
			var d = new doh.Deferred();
			dataStore.fetchItemByIdentity({identity: "node1.1", onItem: function(object){
				t.is(object.name, "node1.1");
				t.is(object.someProperty, "somePropertyA1");
				d.callback(true);
			}});
			return d;
		},
		function testQuery(t){
			var d = new doh.Deferred();
			dataStore.fetch({query:"treeTestRoot", onComplete: function(results){
				var object = results[0];
				t.is(object.name, "node1");
				t.is(object.someProperty, "somePropertyA");
				d.callback(true);
			}});
			return d;
		},
		function testNewItem(t){
			var newItem = memoryDataStore.newItem({
				foo: "bar",
				id: Math.random()
			});
			memoryDataStore.setValue(newItem, "prop1", 1);
			memoryDataStore.save();
			memoryDataStore.setValue(newItem, "prop1", 10);
			memoryDataStore.revert();
			t.is(memoryDataStore.getValue(newItem, "prop1"), 1);
			memoryDataStore.fetchItemByIdentity({
				identity: memoryDataStore.getIdentity(newItem),
				onItem: function(item){
					t.is(memoryDataStore.getValue(item, "foo"), "bar");
					memoryDataStore.setValue(newItem, "prop2", 2);
					t.is(memoryDataStore.getValue(item, "prop1"), 1);
					t.is(memoryDataStore.getValue(item, "prop2"), 2);
				}});
			var newItem = memoryDataStore.newItem({
				foo: "bar",
				id: Math.random()
			});
			memoryDataStore.deleteItem(newItem);
			memoryDataStore.save();
			memoryDataStore.fetchItemByIdentity({
				identity: memoryDataStore.getIdentity(newItem),
				onItem: function(item){
					t.is(item, null);
				}
			});
		},
		function testMemoryQuery(t){
			var d = new doh.Deferred();
			memoryDataStore.fetch({query:{name:"one"}, onComplete: function(results){
				var object = results[0];
				t.is(results.length, 1);
				t.is(object.name, "one");
				d.callback(true);
			}});
			return d;
		},
		function testMemoryQueryEmpty(t){
			var d = new doh.Deferred();
			memoryDataStore.fetch({query:{name:"o"}, onComplete: function(results){
				t.is(results.length, 0);
				d.callback(true);
			}});
			return d;
		},
		function testMemoryQueryWithWildcard(t){
			var d = new doh.Deferred();
			memoryDataStore.fetch({query:{name:"f*"}, onComplete: function(results){
				var object = results[0];
				t.is(results.length, 2);
				t.is(object.name, "four");
				d.callback(true);
			}});
			return d;
		},
		function testMemoryQueryWithEscapedWildcard(t){
			var d = new doh.Deferred();
			memoryDataStore.fetch({query:{name:"s\\*"}, onComplete: function(results){
				t.is(results.length, 0);
			}});
			var newItem = memoryDataStore.newItem({
				name: "s*",
				id: Math.random()
			});
			memoryDataStore.save();
			memoryDataStore.fetch({query:{name:"s\\*"}, onComplete: function(results){
				var object = results[0];
				t.is(results.length, 1);
				t.is(object.name, "s*");
				d.callback(true);
			}});
			return d;
		},
		function testMemoryQueryWithWildcardCaseInsensitive(t){
			var d = new doh.Deferred();
			memoryDataStore.fetch({query:{name:"F*"}, queryOptions: {ignoreCase: true}, onComplete: function(results){
				var object = results[0];
				t.is(results.length, 2);
				t.is(object.name, "four");
				d.callback(true);
			}});
			return d;
		}
	]
);

})();
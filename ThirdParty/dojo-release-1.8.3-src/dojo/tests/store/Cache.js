dojo.provide("dojo.tests.store.Cache");
dojo.require("dojo.store.Memory");
dojo.require("dojo.store.Cache");
(function(){
	var masterStore = new dojo.store.Memory({
		data: [
			{id: 1, name: "one", prime: false},
			{id: 2, name: "two", even: true, prime: true},
			{id: 3, name: "three", prime: true},
			{id: 4, name: "four", even: true, prime: false},
			{id: 5, name: "five", prime: true}
		]
	});
	var cachingStore = new dojo.store.Memory();
	var options = {};
	var store = dojo.store.Cache(masterStore, cachingStore, options);
	tests.register("dojo.tests.store.Cache",
		[
			function testGet(t){
				t.is(store.get(1).name, "one");
				t.is(cachingStore.get(1).name, "one"); // second one should be cached
				t.is(store.get(1).name, "one");
				t.is(store.get(4).name, "four");
				t.is(cachingStore.get(4).name, "four");
				t.is(store.get(4).name, "four");
			},
			function testQuery(t){
				options.isLoaded = function(){ return false;};
				t.is(store.query({prime: true}).length, 3);
				t.is(store.query({even: true})[1].name, "four");
				t.is(cachingStore.get(3), undefined);
				options.isLoaded = function(){ return true;};
				t.is(store.query({prime: true}).length, 3);
				t.is(cachingStore.get(3).name, "three");
			},
			function testQueryWithSort(t){
				t.is(store.query({prime: true}, {sort:[{attribute:"name"}]}).length, 3);
				t.is(store.query({even: true}, {sort:[{attribute:"name"}]})[1].name, "two");
			},
			function testPutUpdate(t){
				var four = store.get(4);
				four.square = true;
				store.put(four);
				four = store.get(4);
				t.t(four.square);
				four = cachingStore.get(4);
				t.t(four.square);
				four = masterStore.get(4);
				t.t(four.square);
			},
			function testPutNew(t){
				store.put({
					id: 6,
					perfect: true
				});
				t.t(store.get(6).perfect);
				t.t(cachingStore.get(6).perfect);
				t.t(masterStore.get(6).perfect);
			},
			function testAddDuplicate(t){
				var threw;
				try{
					store.add({
						id: 6,
						perfect: true
					});
				}catch(e){
					threw = true;
				}
				t.t(threw);
			},
			function testAddNew(t){
				store.add({
					id: 7,
					prime: true
				});
				t.t(store.get(7).prime);
				t.t(cachingStore.get(7).prime);
				t.t(masterStore.get(7).prime);
			},
			function testResultsFromMaster(t){
				var originalAdd = masterStore.add;
				masterStore.add = function(object){
					return {
						test: "value"
					};
				};
				t.is(store.add({
					id: 7,
					prop: "doesn't matter"
				}).test, "value");
				masterStore.add = originalAdd;
			}
		]
	);
})();

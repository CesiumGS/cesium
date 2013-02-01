dojo.provide("dojo.tests.store.Memory");
dojo.require("dojo.store.Memory");
(function(){
	var store = new dojo.store.Memory({
		data: [
			{id: 1, name: "one", prime: false, mappedTo: "E"}, 
			{id: 2, name: "two", even: true, prime: true, mappedTo: "D"}, 
			{id: 3, name: "three", prime: true, mappedTo: "C"}, 
			{id: 4, name: "four", even: true, prime: false, mappedTo: null}, 
			{id: 5, name: "five", prime: true, mappedTo: "A"} 		
		]
	});
	tests.register("dojo.tests.store.Memory",
		[
			function testGet(t){
				t.is(store.get(1).name, "one");
				t.is(store.get(4).name, "four");
				t.t(store.get(5).prime);
			},
			function testQuery(t){
				t.is(store.query({prime: true}).length, 3);
				t.is(store.query({even: true})[1].name, "four");
			},
			function testQueryWithString(t){
				t.is(store.query({name: "two"}).length, 1);
				t.is(store.query({name: "two"})[0].name, "two");
			},
			function testQueryWithRegExp(t){
				t.is(store.query({name: /^t/}).length, 2);
				t.is(store.query({name: /^t/})[1].name, "three");
				t.is(store.query({name: /^o/}).length, 1);
				t.is(store.query({name: /o/}).length, 3);
			},
			function testQueryWithTestFunction(t){
				t.is(store.query({id: {test: function(id){ return id < 4;}}}).length, 3);
				t.is(store.query({even: {test: function(even, object){ return even && object.id > 2;}}}).length, 1);
			},
			function testQueryWithSort(t){
				t.is(store.query({prime: true}, {sort:[{attribute:"name"}]}).length, 3);
				t.is(store.query({even: true}, {sort:[{attribute:"name"}]})[1].name, "two");
				t.is(store.query({even: true}, {sort:function(a, b){
						return a.name < b.name ? -1 : 1;
					}})[1].name, "two");
				t.is(store.query(null, {sort:[{attribute:"mappedTo"}]})[4].name, "four");
			},
			function testQueryWithPaging(t){
				t.is(store.query({prime: true}, {start: 1, count: 1}).length, 1);
				t.is(store.query({even: true}, {start: 1, count: 1})[0].name, "four");
			},
			function testPutUpdate(t){
				var four = store.get(4);
				four.square = true;
				store.put(four);
				four = store.get(4);
				t.t(four.square);
			},
			function testPutNew(t){
				store.put({
					id: 6,
					perfect: true
				});
				t.t(store.get(6).perfect);
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
			},
			function testRemove(t){
				t.t(store.remove(7));
				t.is(store.get(7), undefined);
			},
			function testRemoveMissing(t){
				t.f(store.remove(77));
				// make sure nothing changed
				t.is(store.get(1).id, 1);
			},
			function testQueryAfterChanges(t){
				t.is(store.query({prime: true}).length, 3);
				t.is(store.query({perfect: true}).length, 1);
			},
			function testIFRSStyleData(t){
				var anotherStore = new dojo.store.Memory({
					data: {
						items:[
							{name: "one", prime: false},
							{name: "two", even: true, prime: true},
							{name: "three", prime: true}
						],
						identifier: "name"
					}
				});
				t.is(anotherStore.get("one").name,"one");
				t.is(anotherStore.query({name:"one"})[0].name,"one");
			},
			function testAddNewIdAssignment(t){
				var object = {
					random: true
				};
				store.add(object);
				t.t(!!object.id);
			}
		]
	);
})();

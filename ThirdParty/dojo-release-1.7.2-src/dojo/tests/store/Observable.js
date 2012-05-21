dojo.provide("dojo.tests.store.Observable");
dojo.require("dojo.store.Memory");
dojo.require("dojo.store.Observable");
(function(){
	var store = dojo.store.Observable(new dojo.store.Memory({
		data: [
			{id: 0, name: "zero", even: true, prime: false},
			{id: 1, name: "one", prime: false},
			{id: 2, name: "two", even: true, prime: true},
			{id: 3, name: "three", prime: true},
			{id: 4, name: "four", even: true, prime: false},
			{id: 5, name: "five", prime: true}
		]
	}));
	tests.register("dojo.tests.store.Observable",
		[
			function testGet(t){
				t.is(store.get(1).name, "one");
				t.is(store.get(4).name, "four");
				t.t(store.get(5).prime);
			},
			function testQuery(t){
				var results = store.query({prime: true});
				t.is(results.length, 3);
				var changes = [], secondChanges = [];
				var observer = results.observe(function(object, previousIndex, newIndex){
					changes.push({previousIndex:previousIndex, newIndex:newIndex, object:object});
				});
				var secondObserver = results.observe(function(object, previousIndex, newIndex){
					secondChanges.push({previousIndex:previousIndex, newIndex:newIndex, object:object});
				});
				var expectedChanges = [];
				var two = results[0];
				two.prime = false;
				store.put(two); // should remove it from the array
				t.is(results.length, 2);
				expectedChanges.push({
						previousIndex: 0,
						newIndex: -1,
						object:{
							id: 2,
							name: "two",
							even: true,
							prime: false
						}
					});
				secondObserver.cancel();
				var one = store.get(1);
				one.prime = true;
				store.put(one); // should add it
				expectedChanges.push({
						previousIndex: -1,
						"newIndex":2,
						object:{
							id: 1,
							name: "one",
							prime: true
						}
					});
				t.is(results.length, 3);
				store.add({// shouldn't be added
					id:6, name:"six"
				});
				t.is(results.length, 3);
				store.add({// should be added
					id:7, name:"seven", prime:true
				});
				t.is(results.length, 4);
				
				expectedChanges.push({
						previousIndex: -1,
						"newIndex":3,
						"object":{
							id:7, name:"seven", prime:true
						}
					});
				store.remove(3);
				expectedChanges.push({
						"previousIndex":0,
						newIndex: -1,
						object: {id: 3, name: "three", prime: true}
					});
				t.is(results.length, 3);
				
				observer.cancel(); // shouldn't get any more calls
				store.add({// should not be added
					id:11, name:"eleven", prime:true
				});
				t.is(changes, expectedChanges);
			},
			function testQueryWithZeroId(t){
                var results = store.query({});
                t.is(results.length, 8);
                var observer = results.observe(function(object, previousIndex, newIndex){
                        // we only do puts so previous & new indices must always been the same
                        // unfortunately if id = 0, the previousIndex
                        console.log("called with: "+previousIndex+", "+newIndex);
                        t.is(previousIndex, newIndex);
                }, true);
                store.put({id: 5, name: "-FIVE-", prime: true});
                store.put({id: 0, name: "-ZERO-", prime: false});
            }			
		]
	);
})();

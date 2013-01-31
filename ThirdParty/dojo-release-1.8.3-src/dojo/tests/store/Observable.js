dojo.provide("dojo.tests.store.Observable");
dojo.require("dojo.store.Memory");
dojo.require("dojo.store.Observable");
(function(){
	var MyStore = dojo.declare([dojo.store.Memory], {
		get: function(){
			// need to make sure that this.inherited still works with Observable
			return this.inherited(arguments);
		}
	});
	var memoryStore, store = new dojo.store.Observable(memoryStore = new MyStore({ /*dojo.store.Memory*/
		data: [
			{id: 0, name: "zero", even: true, prime: false},
			{id: 1, name: "one", prime: false},
			{id: 2, name: "two", even: true, prime: true},
			{id: 3, name: "three", prime: true},
			{id: 4, name: "four", even: true, prime: false},
			{id: 5, name: "five", prime: true}
		]
	}));
    var data = [], i;
    for(i = 1; i <= 100; i++){
        data.push({id: i, name: "item " + i, order: i});
    }
	var bigStore = dojo.store.Observable(new dojo.store.Memory({data:data}));
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
				var expectedChanges = [],
					expectedSecondChanges = [];
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
				expectedSecondChanges.push(expectedChanges[expectedChanges.length - 1]);
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
				
				observer.remove(); // shouldn't get any more calls
				store.add({// should not be added
					id:11, name:"eleven", prime:true
				});
				t.is(secondChanges, expectedSecondChanges);
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
            },
            function testPaging(t){
				var results, opts = {count: 25, sort: [{attribute: "order"}]};
				results = window.results = [
				    bigStore.query({}, dojo.delegate(opts, {start: 0})),
				    bigStore.query({}, dojo.delegate(opts, {start: 25})),
				    bigStore.query({}, dojo.delegate(opts, {start: 50})),
				    bigStore.query({}, dojo.delegate(opts, {start: 75}))
				];
				var observations = [];
				dojo.forEach(results, function(r, i){
				    r.observe(function(obj, from, to){
				    	observations.push({from: from, to: to});
				        console.log(i, " observed: ", obj, from, to);
				    }, true);
				});
				bigStore.add({id: 101, name: "one oh one", order: 2.5});
				t.is(results[0].length, 26);
				t.is(results[1].length, 25);
				t.is(results[2].length, 25);
				t.is(results[3].length, 25);
				t.is(observations.length, 1);
				bigStore.remove(101);
				t.is(observations.length, 2);
				t.is(results[0].length, 25);
				bigStore.add({id: 102, name: "one oh two", order: 26.5});
				t.is(results[0].length, 25);
				t.is(results[1].length, 26);
				t.is(results[2].length, 25);
				t.is(observations.length, 3);
            },
            function testType(t){
            	t.f(memoryStore == store);
            	// TODO: I don't believe we can really support this with dojo.declare, would need to upgrade to Compose
//			  	t.t(store instanceof dojo.store.Observable);
            }
		]
	);
})();

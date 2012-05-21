dojo.provide("dojox.data.tests.performance.CsvStore");
dojo.require("dojox.data.CsvStore");
dojo.require("dojo.data.util.sorter");


dojox.data.tests.performance.CsvStore.getData = function(size){
	//	summary:
	//		This function generates a psuedorandom dataset collected
	//		from some templated entries.
	//	returns:
	//		A 2000 'row' CSV dataset.

	var header = "Title, Year, Producer\n";
	var templateData = [
		"City of God, 2002, Katia Lund\n",
		"Rain,, Christine Jeffs\n",
		"2001: A Space Odyssey, 1968, Stanley Kubrick\n",
		'"This is a ""fake"" movie title", 1957, Sidney Lumet\n',
		"Alien, 1979   , Ridley Scott\n",
		'"The Sequel to ""Dances With Wolves.""", 1982, Ridley Scott\n',
		'"Caine Mutiny, The", 1954, "Dymtryk ""the King"", Edward"\n'
	];

	var data = header;

	var i;
	for(i = 0; i < size; i++){
		var idx =Math.floor(Math.random()*7);
		data += templateData[idx];
	}
	return data;
};


doh.register("dojox.data.tests.performance.CsvStore",[
	{
		name: "Initial Parse and First Fetch",
		testType: "perf",
		trialDuration: 100,
		trialDelay: 50,
		trialIterations: 50,
		runTest: function(){
			store = new dojox.data.CsvStore({
				data: dojox.data.tests.performance.CsvStore.getData(2000)
			});
			var def = new doh.Deferred();
			var complete = function(items, request){
				try{
					doh.assertEqual(2000, items.length);
					def.callback(true);
				}catch(e){
					def.errback(e);
				}
			};
			var err = function(error, request){
				def.errback(error);
			};
			store.fetch({onComplete: complete, onError: err});
			return def;
		}
	},
	{
		name: "Fetch All Data",
		testType: "perf",
		trialDuration: 100,
		trialDelay: 50,
		trialIterations: 50,
		setUp: function(){
			dojox.data.tests.performance.CsvStore.store = new dojox.data.CsvStore({
				data: dojox.data.tests.performance.CsvStore.getData(2000)
			});
			//Since the store is fed this way, it prettymuch acts sync
			//and we can force a fill data load and parse.
			//This gets the parse time out of the fetch.
			dojox.data.tests.performance.CsvStore.store.fetch({});
		},
		tearDown: function(){
			delete dojox.data.tests.performance.CsvStore.store;
		},
		runTest: function(){
			var store = dojox.data.tests.performance.CsvStore.store;
			var def = new doh.Deferred();
			var complete = function(items, request){
				try{
					doh.assertEqual(2000, items.length);
					def.callback(true);
				}catch(e){
					def.errback(e);
				}
			};
			var err = function(error, request){
				def.errback(error);
			};
			store.fetch({onComplete: complete, onError: err});
			if(!dojo.isSafari){
				//Well, realistically this is all sync so we don't *have* to
				//pass back a deferred.  I think safari is blowing stack again.
				//Need to look more at DOH once more.
				return def;
			}
			return null;
		}
	},
	{
		name: "getValue",
		testType: "perf",
		trialDuration: 100,
		trialDelay: 50,
		trialIterations: 50,
		setUp: function(){
			dojox.data.tests.performance.CsvStore.store = new dojox.data.CsvStore({
				data: dojox.data.tests.performance.CsvStore.getData(2000)
			});
			//Since the store is fed this way, it prettymuch acts sync
			//and we can force a fill data load and parse.
			//This gets the parse time out of the fetch.
			dojox.data.tests.performance.CsvStore.store.fetch({});
		},
		tearDown: function(){
			delete dojox.data.tests.performance.CsvStore.store;
		},
		runTest: function(){
			//Yes, this is bad, I'm accessing internal data, but I don't care
			//about the fetch time, only the getValue processing.  So,
			//I just gab the first item.
			var value = dojox.data.tests.performance.CsvStore.store.getValue(
				dojox.data.tests.performance.CsvStore.store._arrayOfAllItems[0],
				"Title");
		}
	},
	{
		name: "sort (500 rows)",
		testType: "perf",
		trialDuration: 100,
		trialDelay: 50,
		trialIterations: 50,
		setUp: function(){
			dojox.data.tests.performance.CsvStore.store = new dojox.data.CsvStore({
				data: dojox.data.tests.performance.CsvStore.getData(500)
			});
			//Since the store is fed this way, it prettymuch acts sync
			//and we can force a fill data load and parse.
			//This gets the parse time out of the fetch.
			dojox.data.tests.performance.CsvStore.store.fetch();
		},
		tearDown: function(){
			delete dojox.data.tests.performance.CsvStore.store;
		},
		runTest: function(){
			//Yes, this is bad, I'm accessing internal data, but I don't care
			//about the fetch time, only the getValue processing.  So,
			//I just gab the first item.
			var sort = [{attribute: "Title"}];

			//Create a clone array of all the data.  Yes, this accesses internals, but my goal here
			//is to test the sorter code with respect to the store.
			var data = dojox.data.tests.performance.CsvStore.store._arrayOfAllItems.slice(0,
				dojox.data.tests.performance.CsvStore.store._arrayOfAllItems.length);

			//Sort it using the generic sorter..
			data.sort(dojo.data.util.sorter.createSortFunction(sort,
				dojox.data.tests.performance.CsvStore.store));
		}
	}
]);


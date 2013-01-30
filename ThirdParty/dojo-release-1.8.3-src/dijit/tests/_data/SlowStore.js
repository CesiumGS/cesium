define(["dojo/data/ItemFileReadStore"], function(ItemFileReadStore){

return dojo.declare("dijit.tests._data.SlowStore", ItemFileReadStore, {
	// summary:
	//		This wrapper decorates an ItemFileReadStore by delaying queries issued according to the
	//		length of the query:
	//
	//		- empty query: 2000ms,
	//		- 1 or 2 characters: 1000ms,
	//		- 3 characters: 500ms,
	//		- 4 or more characters: 100ms.

	constructor: function(){
		this.log = [];
	},

	fetch: function(/* Object */ keywordArgs){
		// Get the query phrase (store into first), and the # of chars it has
		var count = 0;
		var first;
		if("query" in keywordArgs){
			var query = keywordArgs.query;
			for(var attr in query){
				first = query[attr];
				break;
			}
			count = first.toString().length;
		}

		var delay = 100;
		switch(count || 0){
			case 0:
				delay = 2000;
				break;
			case 1:
			case 2:
				delay = 1000;
				break;
			case 3:
				delay = 500;
				break;
			case 4:
				delay = 100;
				break;
		}

		this.log.push({
			type: "start",
			date: new Date(),
			query: query,
			count: count,
			delay: delay
		});
		console.log("START query on " + (first || "{}") + " (" + count + " chars), delay = " + delay);

		var that = this,
			thatArgs = arguments;
		var handle = setTimeout(function(){
			that.log.push({
				type: "end",
				date: new Date(),
				query: query,
				count: count,
				delay: delay
			});
			console.log("END query on " + (first || "{}") + " (" + count + " chars), delay = " + delay);
			ItemFileReadStore.prototype.fetch.apply(that, thatArgs);
		}, delay);

		// This abort() method cancels a request before it has even been sent to ItemFileReadStore.
		// (Since ItemFileReadStore has already loaded the data (as per code in the test file),
		// it operates synchronously; there is never a case to send the cancel request to that object)
		keywordArgs.abort = function(){
			clearTimeout(handle);
			that.log.push({
				type: "cancel",
				date: new Date(),
				query: query,
				count: count,
				delay: delay
			});
			console.log("CANCEL query on " + (first || "{}") + " (" + count + " chars), delay = " + delay);
		};

		return keywordArgs;
	}
});

});

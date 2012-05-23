define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/Deferred",
	"dojo/store/util/QueryResults"
], function(dojo){
	dojo.getObject("store", true, dojox);
	
	//	NOTE: The usual Lightstreamer web client MUST be loaded to use this store,
	//	and will not be wrapped as an AMD module for now.
	var nextId = 0;

	function translate(id, updateInfo, schema, o){
		//	private function to convert the returned object from an update to a JSON-like object.
		o = o || {};
		dojo.forEach(schema, function(field){
			o[field] = updateInfo.getNewValue(field);
		});
		if(!("id" in o)){ o["id"] = id; }
		return o;
	}

/*=====
dojox.store.LightstreamerStore.__queryOptionsArgs = function(dataAdapter, itemsRange, requestedBufferSize, requestedMaxFrequency, selector, snapshotRequired, commandLogic){
	//	dataAdapter: String?
	//		The data adapter to be used for a query.
	//	itemsRange: Array?
	//		The range of items in the form of [ start, end ] to receive back from Lightstreamer.
	//	requestedBufferSize: Number?
	//		The length of the internal queuing buffers to be used by the server.
	//	requestedMaxFrequency: Number?
	//		The maximum update frequency (updates per second) to be used by Lightstreamer.
	//	selector: String?
	//		The name of a selector, to be recognized by the Metadata Adapter in Lightstreamer.
	//	snapshotRequired: Boolean?
	//		Whether or not to request snapshot delivery.
	//	commandLogic: Array?
	//		An array of arguments in the following form: [ flag, commandPos, keyPos, underSchema, underDataAdapter ]

	this.dataAdapter = dataAdapter;
	this.itemsRange = itemsRange;
	this.requestedBufferSize = requestedBufferSize;
	this.requestedMaxFrequency = requestedMaxFrequency;
	this.selector = selector;
	this.snapshotRequired = snapshotRequired;
	this.commandLogic = commandLogic;
}
=====*/

	dojo.declare("dojox.store.LightstreamerStore", [], {
		_index: {},	//	a cache for data objects returned

		//	pushPage: (Lightstreamer)pushPage
		//		The main connection created by the typical Lightstreamer Web Client
		pushPage: null,

		//	group: String[]
		//		The group of items to be returned from the Lightstreamer Server.
		group: [],

		//	schema: String[]
		//		The list of fields for each item you wish to get back from Lightstreamer
		schema: [],

		constructor: function(pushPage, group, schema, dataAdapter){
			//	summary:
			//		The constructor for the LightstreamerStore.
			//	pushPage: pushPage
			//		This is the pushPage created by using the typical Lightstreamer web client
			//	dataAdapter: String
			//		This is the data adapter to connect to (defined with the Lightstreamer server)
			//	group: String[]
			//		An array of the item names you wish to get back from Lightstreamer.
			//	schema: String[]
			//		The list of fields for each item you wish to get back from Lightstreamer.

			this.pushPage = pushPage;
			this.group = group;
			this.schema = schema;
			this.dataAdapter = dataAdapter || "DEFAULT";
		},

		query: function(query, options){
			//	summary:
			//		Start receiving streams from the Lightstreamer server.
			//
			//	description:
			//		The main method of the LightstreamerStore, query opens up a data stream
			//		from a Lightstreamer server (based on the pushPage definition used in the
			//		constructor) and sets up a way to observe the returned results from said
			//		stream.  It is based on Lightstreamer's NonVisualTable object, and by
			//		default will run the return from the Lightstreamer server through a 
			//		private "translate" function, which takes the updateInfo object normally
			//		returned by Lightstreamer's web client and converts it into a straight
			//		JSON-like object that can be used for data consumption.
			//
			//	query: String
			//		The name of the mode to use for the resulting stream. (RAW, MERGE, COMMAND or DISTINCT)
			//		
			//	options: LightstreamerStore.__QueryOptionsArgs
			//		Additional options to consume. See http://www.lightstreamer.com/docs/client_web_jsdoc/NonVisualTable.html
			//		for more information on these properties. All properties are optional.
			//
			//	returns: dojo.store.util.QueryResults
			//		A query results object that can be used to observe data being returned,
			//		as well as stop the stream of data.  Note that this results object is
			//		customized with an "observe" method and a "close" method; observe is the
			//		main hook into the constant data stream returned by Lightstreamer, and
			//		the close method will stop the query/stream.
			//
			//	example:
			//		Query a server:
			//	|	var results = myLSStore.query("MERGE", { dataAdapter: "QUOTE_ADAPTER", snapshotRequired: true });
			//	|	results.observe(function(obj){
			//	|		//	do something with obj
			//	|	});

			options = options || {};
			var results = new dojo.Deferred(),
				snapshotReceived,
				resultsArray = [],
				self = this,
				id = "store-" + nextId++,
				pushPage = this.pushPage,
				table = new NonVisualTable(this.group, this.schema, query);
        
			if(!("dataAdapter" in options) && this.dataAdapter){
				table.setDataAdapter(this.dataAdapter);
			}

			for(var prop in options) {
				var setter = "set" + prop.charAt(0).toUpperCase() + prop.slice(1);
				if(setter in table && dojo.isFunction(table[setter])){
					table[setter][(dojo.isArray(options[prop])?"apply":"call")](table, options[prop]);
				}
			}
        
			table.onItemUpdate = function(id, updateInfo){
				var obj = translate(id, updateInfo, self.schema, self._index[id]);
				var newObject;
				if(!self._index[id]){
					newObject = true;
					self._index[id] = obj;
					if(!snapshotReceived){
						resultsArray.push(obj);
					}
				}
				table[snapshotReceived?"onPostSnapShot":"onPreSnapShot"](obj, newObject);
			};

			if(query == "MERGE" || options.snapshotRequired === false){
				snapshotReceived = true;
				results.resolve(resultsArray);
			} else { // eventually properly handle other subscription modes
				table.onEndOfSnapshot = function(){
					snapshotReceived = true;
					results.resolve(resultsArray);
				};
			}			

			//	note that these need to be two separate function objects.
			table.onPreSnapShot = function(){};
			table.onPostSnapShot = function(){};

			//	modify the deferred
			results = dojo.store.util.QueryResults(results);

			//	set up the two main ways of working with results
			var foreachHandler;
			results.forEach = function(callback){
				foreachHandler = dojo.connect(table, "onPreSnapShot", callback);
			};

			var observeHandler;
			results.observe = function(listener){
				observeHandler = dojo.connect(table, "onPostSnapShot", function(object, newObject){
					listener.call(results, object, newObject ? -1 : undefined);
				});
			};

			//	set up the way to stop the stream
			results.close = function(){
				if(foreachHandler){ dojo.disconnect(foreachHandler); }
				if(observeHandler){ dojo.disconnect(observeHandler); }
				pushPage.removeTable(id);
				table = null;
			};

			//	start up the stream
			pushPage.addTable(table, id);
			return results;
		},
		get: function(id){
			//	summary:
			//		Return a (cached) object from the Lightstreamer.
			//	id: String
			//		The identity of the object to retrieve.
			return this._index[id];
		}
	});

	return dojox.store.LightstreamerStore;
});

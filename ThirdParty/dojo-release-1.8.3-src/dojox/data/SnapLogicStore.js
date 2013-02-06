define(["dojo", "dojox", "dojo/io/script", "dojo/data/util/sorter"], function(dojo, dojox) {

dojo.declare("dojox.data.SnapLogicStore", null, {
	Parts: {
		DATA: "data",
		COUNT: "count"
	},

	url: "",

	constructor: function(/* Object */args){
		// summary:
		//		Initialize a SnapLogicStore object.
		// args:
		//		An object that contains properties for initializing the new data store object. The
		//		following properties are understood:
		//
		//		- url:
		//			A URL to the SnapLogic pipeline's output routed through PipeToHttp. Typically, this
		//			will look like `http://<server-host>:<port>/pipe/<pipeline-url>/<pipeline-output-view>`.
		//		- parameters:
		//			An object whose properties define parameters to the pipeline. The values of these
		//			properties will be sent to the pipeline as parameters when it run.

		if(args.url){
			this.url = args.url;
		}
		this._parameters = args.parameters;
	},

	_assertIsItem: function(/* item */item){
		// summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.SnapLogicStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/*attribute-name-string*/ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.SnapLogicStore: a function was passed an attribute argument that was not an attribute name string");
		}
	},

	getFeatures: function(){
		// summary:
		//		See dojo/data/api/Read.getFeatures()
		return {
			'dojo.data.api.Read': true
		};
	},

	getValue: function(item, attribute, defaultValue){
		// summary:
		//		See dojo/data/api/Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var i = dojo.indexOf(item.attributes, attribute);
		if(i !== -1){
			return item.values[i];
		}
		return defaultValue;
	},

	getAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		this._assertIsItem(item);
		return item.attributes;
	},

	hasAttribute: function(item, attribute){
		// summary:
		//		See dojo/data/api/Read.hasAttributes()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		for(var i = 0; i < item.attributes.length; ++i){
			if(attribute == item.attributes[i]){
				return true;
			}
		}
		return false;
	},

	isItemLoaded: function(item){
		// summary:
		//		See dojo/data/api/Read.isItemLoaded()
		return this.isItem(item);		// Boolean
	},

	loadItem: function(keywordArgs){
		// summary:
		//		See dojo/data/api/Read.loadItem()
	},

	getLabel: function(item){
		// summary:
		//		See dojo/data/api/Read.getLabel()
		return undefined;
	},
	
	getLabelAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		return null;
	},

	containsValue: function(item, attribute, value){
		// summary:
		//		See dojo/data/api/Read.containsValue()
		return this.getValue(item, attribute) === value;		// Boolean
	},

	getValues: function(item, attribute){
		// summary:
		//		See dojo/data/api/Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var i = dojo.indexOf(item.attributes, attribute);
		if(i !== -1){
			return [item.values[i]];	// Array
		}
		return [];
	},

	isItem: function(item){
		// summary:
		//		See dojo/data/api/Read.isItem()
		if(item && item._store === this){
			return true;
		}
		return false;
	},
	
	close: function(request){
		// summary:
		//		See dojo/data/api/Read.close()
	},

	_fetchHandler: function(/*Object*/ request){
		// summary:
		//		Process data retrieved via fetch and send it back to requester.
		// request:
		//		The data returned from the I/O transport. In the normal case, it will be an array of result rows
		//		from the pipeline. In the special case for record count optimization, response will be an array
		//		with a single element containing the total pipeline result row count. See fetch() for details
		//		on this optimization.

		var scope = request.scope || dojo.global;

		if(request.onBegin){
			// Check for the record count optimization
			request.onBegin.call(scope, request._countResponse[0], request);
		}
		
		if(request.onItem || request.onComplete){
			var response = request._dataResponse;

			if(!response.length){
				request.onError.call(scope,
									new Error("dojox.data.SnapLogicStore: invalid response of length 0"),
									request);
				return;
			}else if(request.query != 'record count'){
				//If this was not a record count request, the first element returned will contain
				//the field names.
				var field_names = response.shift();
				
				var items = [];
				for(var i = 0; i < response.length; ++i){
					if(request._aborted){
						break;
					}

					items.push({attributes: field_names, values: response[i], _store: this});
				}

				if(request.sort && !request._aborted){
					items.sort(dojo.data.util.sorter.createSortFunction(request.sort, self));
				}
			}else{
				//This is a record count request, so manually set the field names.
				items = [({attributes: ['count'], values: response, _store: this})];
			}

			if(request.onItem){
				for(var i = 0; i < items.length; ++i){
					if(request._aborted){
						break;
					}
					request.onItem.call(scope, items[i], request);
				}
				items = null;
			}

			if(request.onComplete && !request._aborted){
				request.onComplete.call(scope, items, request);
			}
		}
	},
		
	_partHandler: function(/*Object */ request, /* String */ part, /* Object*/ response){
		// summary:
		//		Handle the individual replies for both data and length requests.
		// request:
		//		The request/handle object used with the original fetch() call.
		// part:
		//		A value indicating which request this handler call is for (this.Parts).
		// response:
		//		Response received from the underlying IO transport.

		if(response instanceof Error){
			if(part == this.Parts.DATA){
				request._dataHandle = null;
			}else{
				request._countHandle = null;
			}
			request._aborted = true;
			if(request.onError){
				request.onError.call(request.scope, response, request);
			}
		}else{
			if(request._aborted){
				return;
			}
			if(part == this.Parts.DATA){
				request._dataResponse = response;
			}else{
				request._countResponse = response;
			}
			if((!request._dataHandle || request._dataResponse !== null) &&
				(!request._countHandle || request._countResponse !== null)){
				this._fetchHandler(request);
			}
		}
	},

	fetch: function(/*Object*/ request){
		// summary:
		//		See dojo/data/api/Read.close()
		// request:
		//		See dojo/data/api/Read.close() for generic interface.
		//
		//		In addition to the standard Read API fetch support, this store supports an optimization for
		//		for retrieving the total count of records in the Pipeline without retrieving the data. To
		//		use this optimization, simply provide an onBegin handler without an onItem or onComplete handler.

		request._countResponse = null;
		request._dataResponse = null;
		request._aborted = false;
		request.abort = function(){
			if(!request._aborted){
				request._aborted = true;
				if(request._dataHandle && request._dataHandle.cancel){
					request._dataHandle.cancel();
				}
				if(request._countHandle && request._countHandle.cancel){
					request._countHandle.cancel();
				}
			}
		};

		// Only make the call for data if onItem or onComplete is used. Otherwise, onBegin will only
		// require the total row count.
		if(request.onItem || request.onComplete){
			var content = this._parameters || {};
			if(request.start){
				if(request.start < 0){
					throw new Error("dojox.data.SnapLogicStore: request start value must be 0 or greater");
				}
				content['sn.start'] = request.start + 1;
			}
			if(request.count){
				if(request.count < 0){
					throw new Error("dojox.data.SnapLogicStore: request count value 0 or greater");
				}
				content['sn.limit'] = request.count;
			}
			
			content['sn.content_type'] = 'application/javascript';

			var store = this;
			var handler = function(response, ioArgs){
				if(response instanceof Error){
					store._fetchHandler(response, request);
				}
			};

			var getArgs = {
				url: this.url,
				content: content,
				// preventCache: true,
				timeout: 60000,								//Starting a pipeline can take a long time.
				callbackParamName: "sn.stream_header",
				handle: dojo.hitch(this, "_partHandler", request, this.Parts.DATA)
			};

			request._dataHandle = dojo.io.script.get(getArgs);
		}
		
		if(request.onBegin){
			var content = {};
			content['sn.count'] = 'records';
			content['sn.content_type'] = 'application/javascript';

			var getArgs = {
				url: this.url,
				content: content,
				timeout: 60000,
				callbackParamName: "sn.stream_header",
				handle: dojo.hitch(this, "_partHandler", request, this.Parts.COUNT)
			};

			request._countHandle = dojo.io.script.get(getArgs);
		}
			
		return request;			// Object
	}
});

return dojox.data.SnapLogicStore;
});


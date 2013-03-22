define(["dojo/_base/lang", "dojo/_base/config", "dojo/ready", "dojo/_base/unload", 
        "dojo/_base/sniff", "dojo/_base/xhr", "dojo/_base/json", "dojo/io-query", "dojo/io/script"
], function(lang, config, ready, unload, has, xhr, json, ioQuery, scriptIO){

	var Analytics = function(){
		// summary:
		//		where we store data until we're ready to send it off.

		// the data queue;
		this._data = [];

		// id of messages for this session/page
		this._id = 1;

		// some default values
		this.sendInterval = config["sendInterval"] || 5000;
		this.inTransitRetry = config["inTransitRetry"] || 200;
		this.dataUrl = config["analyticsUrl"] || require.toUrl("dojox/analytics/logger/dojoxAnalytics.php");
		this.sendMethod = config["sendMethod"] || "xhrPost";
		this.maxRequestSize = has("ie") ? 2000 : config["maxRequestSize"] || 4000;

		// while we can go ahead and being logging as soon as this constructor is completed
		// we're not going to schedule pushing data to the server until after the page
		// has completed loading
		ready(this, "schedulePusher");
		unload.addOnUnload(this, function(){
			this.pushData();
		});
	};

	lang.extend(Analytics, {
		schedulePusher: function(/* Int */interval){
			// summary:
			//		Schedule the data pushing routines to happen in interval ms
			setTimeout(lang.hitch(this, "checkData"), interval || this.sendInterval);
		},

		addData: function(dataType, data){
			// summary:
			//		add data to the queue. Will be pusshed to the server on the next
			//		data push

			if(arguments.length > 2){
				// FIXME: var c = dojo._toArray(arguments) ?
				data = Array.prototype.slice.call(arguments,1);				
			}

			this._data.push({ plugin: dataType, data: data });
		},

		checkData: function(){
			// summary:
			//		TODOC?
			if(this._inTransit){
				this.schedulePusher(this.inTransitRetry);
				return;
			}
			
			if(this.pushData()){ return; }
			this.schedulePusher();
		},

		pushData: function(){
			// summary:
			//		pushes data to the server if any exists.  If a push is done, return
			//		the deferred after hooking up completion callbacks.  If there is no data
			//		to be pushed, return false;
			if(this._data.length){
				// clear the queue
				this._inTransit = this._data;
				this._data = [];
				var def;
				switch(this.sendMethod){
					case "script":
						def = scriptIO.get({
							url: this.getQueryPacket(),
							preventCache: 1,
							callbackParamName: "callback"
						});
						break;
					case "xhrPost":
					default:
						def = xhr.post({
							url:this.dataUrl,
							content:{
								id: this._id++,
								data: json.toJson(this._inTransit)
							}
						});
						break;
				}
				def.addCallback(this, "onPushComplete");
				return def;
			}
			return false;
		},

		getQueryPacket: function(){
			// TODOC
			while(true){
				var content = {
					id: this._id++,
					data: json.toJson(this._inTransit)
				};
				
				// FIXME would like a much better way to get the query down to length
				var query = this.dataUrl + '?' + ioQuery.objectToQuery(content);
				if(query.length > this.maxRequestSize){
					this._data.unshift(this._inTransit.pop());
					this._split = 1;
				}else{
					return query;
				}
			}
		},

		onPushComplete: function(results){
			// summary:
			//		If our data push was successfully, remove the _inTransit data and schedule the next
			//		parser run.
			if(this._inTransit){
				delete this._inTransit;
			}

			if(this._data.length > 0){
				this.schedulePusher(this.inTransitRetry);
			}else{
				this.schedulePusher();
			}
		}
	});

	// create the analytics singleton
	return lang.setObject("dojox.analytics",new Analytics());
});

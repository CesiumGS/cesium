dojo.provide("dojox.cometd.RestChannels");

dojo.require("dojox.rpc.Client");
dojo.require("dojo._base.url");
dojo.requireIf(dojox.data && !!dojox.data.JsonRestStore,"dojox.data.restListener");

// Note that cometd _base is _not_ required, this can run standalone, but ifyou want
// cometd functionality, you must explicitly load/require it elsewhere, and cometd._base
// MUST be loaded prior to RestChannels ifyou use it.

// summary:
// 		REST Channels - An HTTP/REST Based approach to Comet transport with full REST messaging
// 		semantics
// 		REST Channels is a efficient, reliable duplex transport for Comet

// description:
// 		This can be used:
// 		1. As a cometd transport
// 		2. As an enhancement for the REST RPC service, to enable "live" data (real-time updates directly alter the data in indexes)
// 		2a. With the JsonRestStore (which is driven by the REST RPC service), so this dojo.data has real-time data. Updates can be heard through the dojo.data notification API.
// 		3. As a standalone transport. To use it as a standalone transport looks like this:
// 	|		dojox.cometd.RestChannels.open();
// 	|		dojox.cometd.RestChannels.get("/myResource",{callback:function(){
// 	|			// this is called when the resource is first retrieved and any time the
// 	|			// resource is changed in the future. This provides a means for retrieving a
// 	|			// resource and subscribing to it in a single request
// 	|		});
// 	|	dojox.cometd.RestChannels.subscribe("/anotherResource",{callback:function(){
// 	|		// this is called when the resource is changed in the future
// 	|	});
// 		Channels HTTP can be configured to a different delays:
// 	|	dojox.cometd.RestChannels.defaultInstance.autoReconnectTime = 60000; // reconnect after one minute
//

(function(){
	dojo.declare("dojox.cometd.RestChannels", null, {
		constructor: function(options){
			// summary:
			//		Initiates the REST Channels protocol
			//	options:
			//		Keyword arguments:
			//	The *autoSubscribeRoot* parameter:
			//		When this is set, all REST service requests that have this
			// 		prefix will be auto-subscribed. The default is '/' (all REST requests).
			//  The *url* parameter:
			//		This is the url to connect to for server-sent messages. The default
			//		is "/channels".
			//	The *autoReconnectTime* parameter:
			// 		This is amount time to wait to reconnect with a connection is broken
			// The *reloadDataOnReconnect* parameter:
			// 		This indicates whether RestChannels should re-download data when a connection
			// 		is restored (value of true), or if it should re-subscribe with retroactive subscriptions
			// 		(Subscribe-Since header) using HEAD requests (value of false). The
			// 		default is true.
			dojo.mixin(this,options);
			// If we have a Rest service available and we are auto subscribing, we will augment the Rest service
			if(dojox.rpc.Rest && this.autoSubscribeRoot){
				// override the default Rest handler so we can add subscription requests
				var defaultGet = dojox.rpc.Rest._get;
				var self = this;
				dojox.rpc.Rest._get = function(service, id){
					// when there is a REST get, we will intercept and add our own xhr handler
					var defaultXhrGet = dojo.xhrGet;
					dojo.xhrGet = function(r){
						var autoSubscribeRoot = self.autoSubscribeRoot;
						return (autoSubscribeRoot && r.url.substring(0, autoSubscribeRoot.length) == autoSubscribeRoot) ?
							self.get(r.url,r) : // auto-subscribe
							defaultXhrGet(r); // plain XHR request
					};

					var result = defaultGet.apply(this,arguments);
					dojo.xhrGet = defaultXhrGet;
					return result;
				};
			}
		},
		absoluteUrl: function(baseUrl,relativeUrl){
			return new dojo._Url(baseUrl,relativeUrl)+'';
		},
		acceptType: "application/rest+json,application/http;q=0.9,*/*;q=0.7",
		subscriptions: {},
		subCallbacks: {},
		autoReconnectTime: 3000,
		reloadDataOnReconnect: true,
		sendAsJson: false,
		url: '/channels',
		autoSubscribeRoot: '/',
		open: function(){
			// summary:
			// 		Startup the transport (connect to the "channels" resource to receive updates from the server).
			//
			// description:
			//		Note that if there is no connection open, this is automatically called when you do a subscription,
			// 		it is often not necessary to call this
			//
			this.started = true;
			if(!this.connected){
				this.connectionId = dojox.rpc.Client.clientId;
				var clientIdHeader = this.createdClientId ? 'Client-Id' : 'Create-Client-Id';
				this.createdClientId = true;
				var headers = {Accept:this.acceptType};
				headers[clientIdHeader] = this.connectionId;
				var dfd = dojo.xhrPost({headers:headers, url: this.url, noStatus: true});
		  		var self = this;
		  		this.lastIndex = 0;
				var onerror, onprogress = function(data){ // get all the possible event handlers
					if(typeof dojo == 'undefined'){
						return null;// this can be called after dojo is unloaded, just do nothing in that case
					}
					if(xhr && xhr.status > 400){
						return onerror(true);
					}
					if(typeof data == 'string'){
						data = data.substring(self.lastIndex);
					}
					var contentType = xhr && (xhr.contentType || xhr.getResponseHeader("Content-Type")) || (typeof data != 'string' && "already json");
					var error = self.onprogress(xhr,data,contentType);
					if(error){
						if(onerror()){
							return new Error(error);
						}
					}
					if(!xhr || xhr.readyState==4){
						xhr = null;
						if(self.connected){
							self.connected = false;
							self.open();
						}
					}
					return data;
				};
				onerror = function(error){
					if(xhr && xhr.status == 409){
						// a 409 indicates that there is a multiple connections, and we need to poll
						console.log("multiple tabs/windows open, polling");
						self.disconnected();
						return null;
					}
					self.createdClientId = false;
					self.disconnected();
					return error;
			  	};
			  	dfd.addCallbacks(onprogress,onerror);
			  	var xhr = dfd.ioArgs.xhr; // this may not exist if we are not using XHR, but an alternate XHR plugin
			  	if(xhr){
			  		// if we are doing a monitorable XHR, we want to listen to streaming events
	  				xhr.onreadystatechange = function(){
	  					var responseText;
						try{
							if(xhr.readyState == 3){// only for progress, the deferred object will handle the finished responses
								self.readyState = 3;
								responseText = xhr.responseText;
							}
						} catch(e){
						}
	  					if(typeof responseText=='string'){
	  						onprogress(responseText);
	  					}
	  				}
			  	}


				if(window.attachEvent){// IE needs a little help with cleanup
					window.attachEvent("onunload",function(){
						self.connected= false;
						if(xhr){
							xhr.abort();
						}
					});
				}

				this.connected = true;
			}
		},
		_send: function(method,args,data){
			// fire an XHR with appropriate modification for JSON handling
			if(this.sendAsJson){
				// send use JSON Messaging
				args.postData = dojo.toJson({
					target:args.url,
					method:method,
					content: data,
					params:args.content,
					subscribe:args.headers["Subscribe"]
				});
				args.url = this.url;
				method = "POST";
			}else{
				args.postData = dojo.toJson(data);
			}
			return dojo.xhr(method,args,args.postData);
		},
		subscribe: function(/*String*/channel, /*dojo.__XhrArgs?*/args){
			// summary:
			// 		Subscribes to a channel/uri, and returns a dojo.Deferred object for the response from
			// 		the subscription request
			//
			// channel:
			// 		the uri for the resource you want to monitor
			//
			// args:
			// 		See dojo.xhr
			//
			// headers:
			// 		These are the headers to be applied to the channel subscription request
			//
			// callback:
			// 		This will be called when a event occurs for the channel
			// 		The callback will be called with a single argument:
			// 	|	callback(message)
			// 		where message is an object that follows the XHR API:
			// 		status : Http status
			// 		statusText : Http status text
			// 		getAllResponseHeaders() : The response headers
			// 		getResponseHeaders(headerName) : Retrieve a header by name
			// 		responseText : The response body as text
			// 			with the following additional Bayeux properties
			// 		data : The response body as JSON
			// 		channel : The channel/url of the response
			args = args || {};
			args.url = this.absoluteUrl(this.url, channel);
			if(args.headers){
				// FIXME: combining Ranges with notifications is very complicated, we will save that for a future version
				delete args.headers.Range;
			}
			var oldSince = this.subscriptions[channel];
			var method = args.method || "HEAD"; // HEAD is the default for a subscription
			var since = args.since;
			var callback = args.callback;
			var headers = args.headers || (args.headers = {});
			this.subscriptions[channel] = since || oldSince || 0;
			var oldCallback = this.subCallbacks[channel];
			if(callback){
				this.subCallbacks[channel] = oldCallback ? function(m){
					oldCallback(m);
					callback(m);
				} : callback;
			}
			if(!this.connected){
				this.open();
			}
			if(oldSince === undefined || oldSince != since){
				headers["Cache-Control"] = "max-age=0";
				since = typeof since == 'number' ? new Date(since).toUTCString() : since;
				if(since){
					headers["Subscribe-Since"] = since;
				}
				headers["Subscribe"] = args.unsubscribe ? 'none' : '*';
				var dfd = this._send(method,args);

				var self = this;
				dfd.addBoth(function(result){
					var xhr = dfd.ioArgs.xhr;
					if(!(result instanceof Error)){
						if(args.confirmation){
							args.confirmation();
						}
					}
					if(xhr && xhr.getResponseHeader("Subscribed")  == "OK"){
						var lastMod = xhr.getResponseHeader('Last-Modified');

						if(xhr.responseText){
							self.subscriptions[channel] = lastMod || new Date().toUTCString();
						}else{
							return null; // don't process the response, the response will be received in the main channels response
						}
					}else if(xhr && !(result instanceof Error)){ // if the server response was successful and we have access to headers but it does indicate a subcription was successful, that means it is did not accept the subscription
						delete self.subscriptions[channel];
					}
					if(!(result instanceof Error)){
						var message = {
							responseText:xhr && xhr.responseText,
							channel:channel,
							getResponseHeader:function(name){
								return xhr.getResponseHeader(name);
							},
							getAllResponseHeaders:function(){
								return xhr.getAllResponseHeaders();
							},
							result: result
						};
						if(self.subCallbacks[channel]){
							self.subCallbacks[channel](message); // call with the fake xhr object
						}
					}else{
						if(self.subCallbacks[channel]){
							self.subCallbacks[channel](xhr); // call with the actual xhr object
						}
					}
					return result;
				});
				return dfd;
			}
			return null;
		},
		publish: function(channel,data){
			// summary:
			//		Publish an event.
			// description:
			// 		This does a simple POST operation to the provided URL,
			// 		POST is the semantic equivalent of publishing a message within REST/Channels
			// channel:
			// 		Channel/resource path to publish to
			// data:
			//		data to publish
			return this._send("POST",{url:channel,contentType : 'application/json'},data);
		},
		_processMessage: function(message){
			message.event = message.event || message.getResponseHeader('Event');
			if(message.event=="connection-conflict"){
				return "conflict"; // indicate an error
			}
			try{
				message.result = message.result || dojo.fromJson(message.responseText);
			}
			catch(e){}
			var self = this;
			var loc = message.channel = new dojo._Url(this.url, message.source || message.getResponseHeader('Content-Location'))+'';//for cometd
			if(loc in this.subscriptions && message.getResponseHeader){
				this.subscriptions[loc] = message.getResponseHeader('Last-Modified');
			}
			if(this.subCallbacks[loc]){
				setTimeout(function(){ //give it it's own stack
					self.subCallbacks[loc](message);
				},0);
			}
			this.receive(message);
			return null;
		},
		onprogress: function(xhr,data,contentType){
			// internal XHR progress handler
			if(!contentType || contentType.match(/application\/rest\+json/)){
				var size = data.length;
				data = data.replace(/^\s*[,\[]?/,'['). // must start with a opening bracket
					replace(/[,\]]?\s*$/,']'); // and end with a closing bracket
				try{
					// if this fails, it probably means we have an incomplete JSON object
					var xhrs = dojo.fromJson(data);
					this.lastIndex += size;
				}
				catch(e){
				}
			}else if(dojox.io && dojox.io.httpParse && contentType.match(/application\/http/)){
				// do HTTP tunnel parsing
				var topHeaders = '';
				if(xhr && xhr.getAllResponseHeaders){
					// mixin/inherit headers from the container response
					topHeaders = xhr.getAllResponseHeaders();
				}
				xhrs = dojox.io.httpParse(data,topHeaders,xhr.readyState != 4);
			}else if(typeof data == "object"){
				xhrs = data;
			}
			if(xhrs){
				for(var i = 0;i < xhrs.length;i++){
					if(this._processMessage(xhrs[i])){
						return "conflict";
					}
				}
				return null;
			}
			if(!xhr){
				//no streaming and we didn't get any message, must be an error
				return "error";
			}
			if(xhr.readyState != 4){ // we only want finished responses here if we are not streaming
				return null;
			}
			if(xhr.__proto__){// firefox uses this property, so we create an instance to shadow this property
				xhr = {channel:"channel",__proto__:xhr};
			}
			return this._processMessage(xhr);

		},

		get: function(/*String*/channel, /*dojo.__XhrArgs?*/args){
			// summary:
			// 		GET the initial value of the resource and subscribe to it
			//		See subscribe for parameter values
			(args = args || {}).method = "GET";
			return this.subscribe(channel,args);
		},
		receive: function(message){
			// summary:
			//		Called when a message is received from the server
			//	message:
			//		A cometd/XHR message
			if(dojox.data && dojox.data.restListener){
				dojox.data.restListener(message);
			}
		},
		disconnected: function(){
			// summary:
			// 		called when our channel gets disconnected
			var self = this;
			if(this.connected){
				this.connected = false;
				if(this.started){ // if we are started, we shall try to reconnect
					setTimeout(function(){ // auto reconnect
						// resubscribe to our current subscriptions
						var subscriptions = self.subscriptions;
						self.subscriptions = {};
						for(var i in subscriptions){
							if(self.reloadDataOnReconnect && dojox.rpc.JsonRest){
								// do a reload of the resource
								delete dojox.rpc.Rest._index[i];
								dojox.rpc.JsonRest.fetch(i);
							}else{
								self.subscribe(i,{since:subscriptions[i]});
							}
						}
						self.open();
					}, this.autoReconnectTime);
				}
			}
		},
		unsubscribe: function(/*String*/channel, /*dojo.__XhrArgs?*/args){
			// summary:
			// 		unsubscribes from the resource
			//		See subscribe for parameter values

			args = args || {};
			args.unsubscribe = true;
			this.subscribe(channel,args); // change the time frame to after 5000AD
		},
		disconnect: function(){
			// summary:
			// 		disconnect from the server
			this.started = false;
			this.xhr.abort();
		}
	});
	var Channels = dojox.cometd.RestChannels.defaultInstance = new dojox.cometd.RestChannels();
	if(dojox.cometd.connectionTypes){
		// register as a dojox.cometd transport and wire everything for cometd handling
		// below are the necessary adaptions for cometd
		Channels.startup = function(data){ // must be able to handle objects or strings
			Channels.open();
			this._cometd._deliver({channel:"/meta/connect",successful:true}); // tell cometd we are connected so it can proceed to send subscriptions, even though we aren't yet

		};
		Channels.check = function(types, version, xdomain){
			for(var i = 0; i< types.length; i++){
				if(types[i] == "rest-channels"){
					return !xdomain;
				}
			}
			return false;
		};
		Channels.deliver = function(message){
			// nothing to do
		};
		dojo.connect(this,"receive",null,function(message){
			message.data = message.result;
			this._cometd._deliver(message);
		});
		Channels.sendMessages = function(messages){
			for(var i = 0; i < messages.length; i++){
				var message = messages[i];
				var channel = message.channel;
				var cometd = this._cometd;
				var args = {
					confirmation: function(){ // send a confirmation back to cometd
						cometd._deliver({channel:channel,successful:true});
					}
				};
				if(channel == '/meta/subscribe'){
					this.subscribe(message.subscription,args);
				}else if(channel == '/meta/unsubscribe'){
					this.unsubscribe(message.subscription,args);
				}else if(channel == '/meta/connect'){
					args.confirmation();
				}else if(channel == '/meta/disconnect'){
					Channels.disconnect();
					args.confirmation();
				}else if(channel.substring(0,6) != '/meta/'){
					this.publish(channel,message.data);
				}
			}
		};
		dojox.cometd.connectionTypes.register("rest-channels", Channels.check, Channels,false,true);
	}
})();

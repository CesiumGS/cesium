dojo.provide("dojox.cometd._base");
dojo.require("dojo.AdapterRegistry");


/*
 * this file defines Comet protocol client. Actual message transport is
 * deferred to one of several connection type implementations. The default is a
 * long-polling implementation. A single global object named "dojox.cometd" is
 * used to mediate for these connection types in order to provide a stable
 * interface.
 *
 * extensions modules may be loaded (eg "dojox.cometd.timestamp", that use
 * the cometd._extendInList and cometd._extendOutList fields to provide functions
 * that extend and handling incoming and outgoing messages.
 *
 * By default the long-polling and callback-polling transports will be required.
 * If specific or alternative transports are required, then they can be directly
 * loaded. For example dojo.require('dojox.cometd.longPollTransportJsonEncoded')
 * will load cometd with only the json encoded variant of the long polling transport.
 */

dojox.cometd = {
	Connection: function(prefix){ // This constructor is stored as dojox.cometd.Connection
		// summary
		// This constructor is used to create new cometd connections. Generally, you should use
		// one cometd connection for each server you connect to. A default connection instance is
		// created at dojox.cometd.
		// To connect to a new server you can create an instance like:
		// var cometd = new dojox.cometd.Connection("/otherServer");
		// cometd.init("http://otherServer.com/cometd");
		//
		// prefix is the prefix for all the events that are published in the Dojo pub/sub system.
		// You must include this prefix, and it should start with a slash like "/myprefix".
		
		// cometd states:
		// unconnected, handshaking, connecting, connected, disconnected
		dojo.mixin(this, {
		prefix: prefix,
			_status: "unconnected",
			_handshook: false,
			_initialized: false,
			_polling: false,
		
			expectedNetworkDelay: 10000, // expected max network delay
			connectTimeout: 0,		 // If set, used as ms to wait for a connect response and sent as the advised timeout
		
			version:	"1.0",
			minimumVersion: "0.9",
			clientId: null,
			messageId: 0,
			batch: 0,
		
			_isXD: false,
			handshakeReturn: null,
			currentTransport: null,
			url: null,
			lastMessage: null,
			_messageQ: [],
			handleAs: "json",
			_advice: {},
			_backoffInterval: 0,
			_backoffIncrement: 1000,
			_backoffMax: 60000,
			_deferredSubscribes: {},
			_deferredUnsubscribes: {},
			_subscriptions: [],
			_extendInList: [],	// List of functions invoked before delivering messages
			_extendOutList: []	// List of functions invoked before sending messages
			
		});
	
		this.state = function() {
			 return this._status;
		}
	
		this.init = function(	/*String*/	root,
					/*Object?*/ props,
					/*Object?*/ bargs){	// return: dojo.Deferred
			//	summary:
			//		Initialize the cometd implementation of the Bayeux protocol
			//	description:
			//		Initialize the cometd implementation of the Bayeux protocol by
			//		sending a handshake message. The cometd state will be changed to CONNECTING
			//		until a handshake response is received and the first successful connect message
			//		has returned.
			//		The protocol state changes may be monitored
			//		by subscribing to the dojo topic "/prefix/meta" (typically "/cometd/meta") where
			//		events are published in the form
			//		   {cometd:this,action:"handshake",successful:true,state:this.state()}
			//	root:
			//		The URL of the cometd server. If the root is absolute, the host
			//		is examined to determine if xd transport is needed. Otherwise the
			//		same domain is assumed.
			//	props:
			//		An optional object that is used as the basis of the handshake message
			//	bargs:
			//		An optional object of bind args mixed in with the send of the handshake
			//	example:
			//	|	dojox.cometd.init("/cometd");
			//	|	dojox.cometd.init("http://xdHost/cometd",{ext:{user:"fred",pwd:"secret"}});
	
			// FIXME: if the root isn't from the same host, we should automatically
			// try to select an XD-capable transport
			props = props || {};
			// go ask the short bus server what we can support
			props.version = this.version;
			props.minimumVersion = this.minimumVersion;
			props.channel = "/meta/handshake";
			props.id = "" + this.messageId++;
	
			this.url = root || dojo.config["cometdRoot"];
			if(!this.url){
				throw "no cometd root";
				return null;
			}
	
			// Are we x-domain? borrowed from dojo.uri.Uri in lieu of fixed host and port properties
			var regexp = "^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$";
			var parts = ("" + window.location).match(new RegExp(regexp));
			if(parts[4]){
				var tmp = parts[4].split(":");
				var thisHost = tmp[0];
				var thisPort = tmp[1]||"80"; // FIXME: match 443
	
				parts = this.url.match(new RegExp(regexp));
				if(parts[4]){
					tmp = parts[4].split(":");
					var urlHost = tmp[0];
					var urlPort = tmp[1]||"80";
					this._isXD = ((urlHost != thisHost)||(urlPort != thisPort));
				}
			}
	
			if(!this._isXD){
				props.supportedConnectionTypes = dojo.map(dojox.cometd.connectionTypes.pairs, "return item[0]");
			}
	
			props = this._extendOut(props);
	
			var bindArgs = {
				url: this.url,
				handleAs: this.handleAs,
				content: { "message": dojo.toJson([props]) },
				load: dojo.hitch(this,function(msg){
					this._backon();
					this._finishInit(msg);
				}),
				error: dojo.hitch(this,function(e){
					this._backoff();
					this._finishInit(e);
				}),
				timeout: this.expectedNetworkDelay
			};
	
			if(bargs){
				dojo.mixin(bindArgs, bargs);
			}
			this._props = props;
			for(var tname in this._subscriptions){
				for(var sub in this._subscriptions[tname]){
					if(this._subscriptions[tname][sub].topic){
						dojo.unsubscribe(this._subscriptions[tname][sub].topic);
					}
				}
			}
			this._messageQ = [];
			this._subscriptions = [];
			this._initialized = true;
			this._status = "handshaking";
			this.batch = 0;
			this.startBatch();
			
			var r;
			// if xdomain, then we assume jsonp for handshake
			if(this._isXD){
				bindArgs.callbackParamName = "jsonp";
				r = dojo.io.script.get(bindArgs);
			}else{
				r = dojo.xhrPost(bindArgs);
			}
			return r;
		}
		
		this.publish = function(/*String*/ channel, /*Object*/ data, /*Object?*/ props){
			// summary:
			//		publishes the passed message to the cometd server for delivery
			//		on the specified topic
			// channel:
			//		the destination channel for the message
			// data:
			//		a JSON object containing the message "payload"
			// properties:
			//		Optional. Other meta-data to be mixed into the top-level of the
			//		message
			var message = {
				data: data,
				channel: channel
			};
			if(props){
				dojo.mixin(message, props);
			}
			this._sendMessage(message);
		}
	
		
		this.subscribe = function(	/*String */	channel,
						/*Object */	objOrFunc,
						/*String */	funcName,
						/*Object?*/ props){ // return: dojo.Deferred
			//	summary:
			//		inform the server of this client's interest in channel
			//	description:
			//		`dojox.cometd.subscribe()` handles all the hard work of telling
			//		the server that we want to be notified when events are
			//		published on a particular topic. `subscribe` accepts a function
			//		to handle messages and returns a `dojo.Deferred` object which
			//		has an extra property added to it which makes it suitable for
			//		passing to `dojox.cometd.unsubscribe()` as a "subscription
			//		handle" (much like the handle object that `dojo.connect()`
			//		produces and which `dojo.disconnect()` expects).
			//
			//		Note that of a subscription is registered before a connection
			//		with the server is established, events sent before the
			//		connection is established will not be delivered to this client.
			//		The deferred object which `subscribe` returns will callback
			//		when the server successfuly acknolwedges receipt of our
			//		"subscribe" request.
			//	channel:
			//		name of the cometd channel to subscribe to
			//	objOrFunc:
			//		an object scope for funcName or the name or reference to a
			//		function to be called when messages are delivered to the
			//		channel
			//	funcName:
			//		the second half of the objOrFunc/funcName pair for identifying
			//		a callback function to notifiy upon channel message delivery
			//	example:
			//		Simple subscribe use-case
			//	|	dojox.cometd.init("http://myserver.com:8080/cometd");
			//	|	// log out all incoming messages on /foo/bar
			//	|	dojox.cometd.subscribe("/foo/bar", console, "debug");
			//	example:
			//		Subscribe before connection is initialized
			//	|	dojox.cometd.subscribe("/foo/bar", console, "debug");
			//	|	dojox.cometd.init("http://myserver.com:8080/cometd");
			//	example:
			//		Subscribe an unsubscribe
			//	|	dojox.cometd.init("http://myserver.com:8080/cometd");
			//	|	var h = dojox.cometd.subscribe("/foo/bar", console, "debug");
			//	|	dojox.cometd.unsubscribe(h);
			//	example:
			//		Listen for successful subscription:
			//	|	dojox.cometd.init("http://myserver.com:8080/cometd");
			//	|	var h = dojox.cometd.subscribe("/foo/bar", console, "debug");
			//	|	h.addCallback(function(){
			//	|		console.debug("subscription to /foo/bar established");
			//	|	});
	
			props = props||{};
			if(objOrFunc){
				var tname = prefix + channel;
				var subs = this._subscriptions[tname];
				if(!subs || subs.length == 0){
					subs = [];
					props.channel = "/meta/subscribe";
					props.subscription = channel;
					this._sendMessage(props);
					
					var _ds = this._deferredSubscribes;
					if(_ds[channel]){
						_ds[channel].cancel();
						delete _ds[channel];
					}
					_ds[channel] = new dojo.Deferred();
				}
				
				for(var i in subs){
					if(subs[i].objOrFunc === objOrFunc && (!subs[i].funcName&&!funcName||subs[i].funcName==funcName) ){
						return null;
					}
				}
				
				var topic = dojo.subscribe(tname, objOrFunc, funcName);
				subs.push({
					topic: topic,
					objOrFunc: objOrFunc,
					funcName: funcName
				});
				this._subscriptions[tname] = subs;
			}
			var ret = this._deferredSubscribes[channel] || {};
			ret.args = dojo._toArray(arguments);
			return ret; // dojo.Deferred
		}
	
		this.unsubscribe = function(	/*String*/	channel,
						/*Object?*/ objOrFunc,
						/*String?*/ funcName,
						/*Object?*/ props){
			// summary:
			//		inform the server of this client's disinterest in channel
			// channel:
			//		name of the cometd channel to unsubscribe from
			// objOrFunc:
			//		an object scope for funcName or the name or reference to a
			//		function to be called when messages are delivered to the
			//		channel. If null then all subscribers to the channel are unsubscribed.
			// funcName:
			//		the second half of the objOrFunc/funcName pair for identifying
			//		a callback function to notifiy upon channel message delivery
	
			if(
				(arguments.length == 1) &&
				(!dojo.isString(channel)) &&
				(channel.args)
			){
				// it's a subscription handle, unroll
				return this.unsubscribe.apply(this, channel.args);
			}
			
			var tname = prefix + channel;
			var subs = this._subscriptions[tname];
			if(!subs || subs.length==0){
				return null;
			}
	
			var s=0;
			for(var i in subs){
				var sb = subs[i];
				if((!objOrFunc) ||
					(
						sb.objOrFunc===objOrFunc &&
						(!sb.funcName && !funcName || sb.funcName==funcName)
					)
				){
					dojo.unsubscribe(subs[i].topic);
					delete subs[i];
				}else{
					s++;
				}
			}
			
			if(s == 0){
				props = props || {};
				props.channel = "/meta/unsubscribe";
				props.subscription = channel;
				delete this._subscriptions[tname];
				this._sendMessage(props);
				this._deferredUnsubscribes[channel] = new dojo.Deferred();
				if(this._deferredSubscribes[channel]){
					this._deferredSubscribes[channel].cancel();
					delete this._deferredSubscribes[channel];
				}
			}
			return this._deferredUnsubscribes[channel]; // dojo.Deferred
		}
		
		
		this.disconnect = function(){
			//	summary:
			//		Disconnect from the server.
			//	description:
			//		Disconnect from the server by sending a disconnect message
			//	example:
			//	|	dojox.cometd.disconnect();
	
			for(var tname in this._subscriptions){
				for(var sub in this._subscriptions[tname]){
					if(this._subscriptions[tname][sub].topic){
						dojo.unsubscribe(this._subscriptions[tname][sub].topic);
					}
				}
			}
			this._subscriptions = [];
			this._messageQ = [];
			if(this._initialized && this.currentTransport){
				this._initialized=false;
				this.currentTransport.disconnect();
			}
			if(!this._polling) {
				this._publishMeta("connect",false);
			}
			this._initialized=false;
			this._handshook=false;
			this._status = "disconnected"; //should be disconnecting, but we ignore the reply to this message
			this._publishMeta("disconnect",true);
		}
	
		
		// public extension points
		
		this.subscribed = function(	/*String*/channel, /*Object*/message){ }
	
		this.unsubscribed = function(/*String*/channel, /*Object*/message){ }
	
	
		// private methods (TODO name all with leading _)
	
		this.tunnelInit = function(childLocation, childDomain){
			// placeholder - replaced by _finishInit
		}
		
		this.tunnelCollapse = function(){
			// placeholder - replaced by _finishInit
		}
		
		this._backoff = function(){
			if(!this._advice){
				this._advice={reconnect:"retry",interval:0};
			}else if(!this._advice.interval){
				this._advice.interval = 0;
			}
			
			if(this._backoffInterval < this._backoffMax){
				this._backoffInterval += this._backoffIncrement;
			}
		}
		
		this._backon = function(){
			this._backoffInterval=0;
		}
	
		this._interval = function(){
			var i = this._backoffInterval + (this._advice ? (this._advice.interval ? this._advice.interval : 0) : 0);
			if (i>0){
				console.log("Retry in interval+backoff=" + this._advice.interval + "+" + this._backoffInterval+"="+i+"ms");
			}
			return i;
		}
		
		this._publishMeta = function(action,successful,props){
			try {
				var meta = {cometd:this,action:action,successful:successful,state:this.state()};
				if (props){
					dojo.mixin(meta, props);
				}
				dojo.publish(this.prefix + "/meta", [meta]);
			} catch(e) {
				console.log(e);
			}
		}
	
		this._finishInit = function(data){
			//	summary:
			//		Handle the handshake return from the server and initialize
			//		connection if all is OK

			if(this._status!="handshaking") {return;}


			var wasHandshook = this._handshook;
			var successful = false;
			var metaMsg = {};

			if (data instanceof Error) {
				dojo.mixin(metaMsg,{
					reestablish:false,
					failure: true,
					error: data,
					advice: this._advice
				});
			} else {
				data = data[0];
				data = this._extendIn(data);
				this.handshakeReturn = data;
				// remember any advice
				if(data["advice"]){
					this._advice = data.advice;
				}

				successful = data.successful ? data.successful : false;

				// check version
				if(data.version < this.minimumVersion){
					if (console.log)
						console.log("cometd protocol version mismatch. We wanted", this.minimumVersion, "but got", data.version);
					successful=false;
					this._advice.reconnect="none";
				}
				dojo.mixin(metaMsg,{reestablish: successful && wasHandshook, response:data});
			}

			this._publishMeta("handshake",successful,metaMsg);
			//in the meta listeners, disconnect() may have been called, so recheck it now to
			//prevent resends or continuing with initializing the protocol
			if(this._status!="handshaking") {return;}

			// If all OK
			if(successful){
				this._status = "connecting";
				this._handshook = true;
				// pick a transport
				this.currentTransport = dojox.cometd.connectionTypes.match(
					data.supportedConnectionTypes,
					data.version,
					this._isXD
				);
				var transport = this.currentTransport;
				// initialize the transport
				transport._cometd = this;
				transport.version = data.version;
				this.clientId = data.clientId;
				this.tunnelInit = transport.tunnelInit && dojo.hitch(transport, "tunnelInit");
				this.tunnelCollapse = transport.tunnelCollapse && dojo.hitch(transport, "tunnelCollapse");
				transport.startup(data);
			}else{
				// If there is a problem follow advice
				if(!this._advice || this._advice["reconnect"] != "none"){
					setTimeout(dojo.hitch(this, "init", this.url, this._props), this._interval());
				}
			}
		}
	
		// FIXME: lots of repeated code...why?
		this._extendIn = function(message){
			// summary: Handle extensions for inbound messages
			dojo.forEach(dojox.cometd._extendInList, function(f){
				message = f(message) || message;
			});
			return message;
		}
	
		this._extendOut = function(message){
			// summary: Handle extensions for inbound messages
			dojo.forEach(dojox.cometd._extendOutList, function(f){
				message = f(message) || message;
			});
			return message;
		}
	
		this.deliver = function(messages){
			dojo.forEach(messages, this._deliver, this);
			return messages;
		}
	
		this._deliver = function(message){
			// dipatch events along the specified path
			
			message = this._extendIn(message);
	
			if(!message["channel"]){
				if(message["success"] !== true){
					return;
				}
			}
			this.lastMessage = message;
	
			if(message.advice){
				this._advice = message.advice; // TODO maybe merge?
			}
	
			// check to see if we got a /meta channel message that we care about
			var deferred=null;
			if(	(message["channel"]) &&
				(message.channel.length > 5) &&
				(message.channel.substr(0, 5) == "/meta")){
				// check for various meta topic actions that we need to respond to
				switch(message.channel){
					case "/meta/connect":
						var metaMsg = {response: message};
						if(message.successful) {
							if (this._status != "connected"){
								this._status = "connected";
								this.endBatch();
							}
						}
 
						if(this._initialized){
							this._publishMeta("connect",message.successful, metaMsg);
						}
						break;
					case "/meta/subscribe":
						deferred = this._deferredSubscribes[message.subscription];
						try
						{
							if(!message.successful){
								if(deferred){
									deferred.errback(new Error(message.error));
								}
								this.currentTransport.cancelConnect();
								return;
							}
							if(deferred){
								deferred.callback(true);
							}
							this.subscribed(message.subscription, message);
						} catch(e)	{
							log.warn(e);
						}
						break;
					case "/meta/unsubscribe":
						deferred = this._deferredUnsubscribes[message.subscription];
						try
						{
							if(!message.successful){
								if(deferred){
									deferred.errback(new Error(message.error));
								}
								this.currentTransport.cancelConnect();
								return;
							}
							if(deferred){
								deferred.callback(true);
							}
							this.unsubscribed(message.subscription, message);
						} catch(e)	{
							log.warn(e);
						}
						break;
					default:
						if(message.successful && !message.successful){
							this.currentTransport.cancelConnect();
							return;
						}
				}
			}
			
			// send the message down for processing by the transport
			this.currentTransport.deliver(message);
	
			if(message.data){
				// dispatch the message to any locally subscribed listeners
				try{
					var messages = [message];
	
					// Determine target topic
					var tname = prefix + message.channel;
	
					// Deliver to globs that apply to target topic
					var tnameParts = message.channel.split("/");
					var tnameGlob = prefix;
					for (var i = 1; i < tnameParts.length - 1; i++){
						dojo.publish(tnameGlob + "/**", messages);
						tnameGlob += "/" + tnameParts[i];
					}
					dojo.publish(tnameGlob + "/**", messages);
					dojo.publish(tnameGlob + "/*", messages);
		
					// deliver to target topic
					dojo.publish(tname,messages);
				}catch(e){
					console.log(e);
				}
			}
		}
	
		this._sendMessage = function(/* object */ message){
			if(this.currentTransport && !this.batch){
				return this.currentTransport.sendMessages([message]);
			}else{
				this._messageQ.push(message);
				return null;
			}
		}
	
		this.startBatch = function(){
			this.batch++;
		}
	
		this.endBatch = function(){
			if(--this.batch <= 0 && this.currentTransport && this._status == "connected"){
				this.batch = 0;
				var messages = this._messageQ;
				this._messageQ = [];
				if(messages.length > 0){
					this.currentTransport.sendMessages(messages);
				}
			}
		}
		
		this._onUnload = function(){
			// make this the last of the onUnload method
			dojo.addOnUnload(dojox.cometd, "disconnect");
		}
	
		this._connectTimeout = function(){
			// summary: Return the connect timeout in ms, calculated as the minimum of the advised timeout
			// and the configured timeout. Else 0 to indicate no client side timeout
			var advised=0;
			if(this._advice && this._advice.timeout && this.expectedNetworkDelay > 0){
				advised = this._advice.timeout + this.expectedNetworkDelay;
			}
			
			if(this.connectTimeout > 0 && this.connectTimeout < advised){
				return this.connectTimeout;
			}
			
			return advised;
		}
	},
	// connectionTypes are shared by all cometd Connection.
	connectionTypes : new dojo.AdapterRegistry(true)
}

// create the default instance
dojox.cometd.Connection.call(dojox.cometd,"/cometd");

/*

FIXME: TODOC: this info should be part of the relevant functions and/or overview so
the parser can find it.

transport objects MUST expose the following methods:
	- check
	- startup
	- sendMessages
	- deliver
	- disconnect
optional, standard but transport dependent methods are:
	- tunnelCollapse
	- tunnelInit

Transports SHOULD be namespaced under the cometd object and transports MUST
register themselves with cometd.connectionTypes

here's a stub transport defintion:

cometd.blahTransport = new function(){
	this._connectionType="my-polling";
	this._cometd=null;
	this.lastTimestamp = null;

	this.check = function(types, version, xdomain){
		// summary:
		//		determines whether or not this transport is suitable given a
		//		list of transport types that the server supports
		return dojo.inArray(types, "blah");
	}

	this.startup = function(){
		if(dojox.cometd._polling){ return; }
		// FIXME: fill in startup routine here
		dojox.cometd._polling = true;
	}

	this.sendMessages = function(message){
		// FIXME: fill in message array sending logic
	}

	this.deliver = function(message){
	}

	this.disconnect = function(){
		// send orderly disconnect message
	}

	this.cancelConnect = function(){
		// cancel the current connection
	}
}
cometd.connectionTypes.register("blah", cometd.blahTransport.check, cometd.blahTransport);
*/

dojo.addOnUnload(dojox.cometd, "_onUnload");

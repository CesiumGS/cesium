dojo.provide("dojox.cometd.longPollTransportFormEncoded");
dojo.require("dojox.cometd._base");

dojox.cometd.longPollTransportFormEncoded = new function(){
	// This is an alternative implementation to that provided in logPollTransport.js that
	// form encodes all messages instead of sending them as text/json
	
	this._connectionType = "long-polling";
	this._cometd = null;

	this.check = function(types, version, xdomain){
		return ((!xdomain)&&(dojo.indexOf(types, "long-polling") >= 0));
	}

	this.tunnelInit = function(){
		var message = {
			channel: "/meta/connect",
			clientId: this._cometd.clientId,
			connectionType: this._connectionType,
			id:	"" + this._cometd.messageId++
		};
		message = this._cometd._extendOut(message);
		this.openTunnelWith({ message: dojo.toJson([message]) });
	}

	this.tunnelCollapse = function(){
		// TODO handle transport specific advice
		
		if(!this._cometd._initialized){ return; }
		if(this._cometd._advice && this._cometd._advice["reconnect"]=="none"){
			return;
		}
		var interval = this._cometd._interval();
		if (this._cometd._status=="connected") {
			setTimeout(dojo.hitch(this, "_connect"), interval);
		}else{
			setTimeout(dojo.hitch(this._cometd, function(){
				this.init(this.url, this._props);
			}), interval);
		}
	}

	this._connect = function(){
		if(!this._cometd._initialized){ return; }
		if(this._cometd._polling) { return; }
			
		if((this._cometd._advice) && (this._cometd._advice["reconnect"]=="handshake")){
			this._cometd._status="unconnected"; //?
			this._initialized = false;
			this._cometd.init(this._cometd.url, this._cometd._props);
 		}else if(this._cometd._status=="connected"){
			var message = {
				channel: "/meta/connect",
				connectionType: this._connectionType,
				clientId: this._cometd.clientId,
				id:	"" + this._cometd.messageId++
			};
			if(this._cometd.connectTimeout>=this._cometd.expectedNetworkDelay){
				message.advice = {
					timeout: this._cometd.connectTimeout - this._cometd.expectedNetworkDelay
				};
			}
			message = this._cometd._extendOut(message);
			this.openTunnelWith({ message: dojo.toJson([message]) });
		}
	}

	this.deliver = function(message){
		// Nothing to do
	}

	this.openTunnelWith = function(content, url){
		this._cometd._polling = true;
		var post = {
			url: (url||this._cometd.url),
			content: content,
			handleAs: this._cometd.handleAs,
			load: dojo.hitch(this, function(data){
				this._cometd._polling=false;
				this._cometd.deliver(data);
				this._cometd._backon();
				this.tunnelCollapse();
			}),
			error: dojo.hitch(this, function(err){
				var metaMsg = {
					failure: true,
					error: err,
					advice: this._cometd._advice
				};
				this._cometd._polling=false;
				this._cometd._publishMeta("connect",false, metaMsg);
				this._cometd._backoff();
				this.tunnelCollapse();
			})
		};

		var connectTimeout = this._cometd._connectTimeout();
		if(connectTimeout > 0){
			post.timeout = connectTimeout;
		}

		this._poll = dojo.xhrPost(post);
	}

	this.sendMessages = function(messages){
		for(var i=0; i < messages.length; i++){
			messages[i].clientId = this._cometd.clientId;
			messages[i].id = "" + this._cometd.messageId++;
			messages[i]= this._cometd._extendOut(messages[i]);
		}
		return dojo.xhrPost({
			url: this._cometd.url||dojo.config["cometdRoot"],
			handleAs: this._cometd.handleAs,
			load: dojo.hitch(this._cometd, "deliver"),
			content: { message: dojo.toJson(messages) },
			error: dojo.hitch(this, function(err){
				this._cometd._publishMeta("publish",false,{messages:messages});
			}),
			timeout: this._cometd.expectedNetworkDelay
		});
	}

	this.startup = function(handshakeData){
		if(this._cometd._status=="connected"){ return; }
		this.tunnelInit();
	}

	this.disconnect = function(){
		var message = {
			channel: "/meta/disconnect",
			clientId: this._cometd.clientId,
			id: "" + this._cometd.messageId++
		};
		message = this._cometd._extendOut(message);
		dojo.xhrPost({
			url: this._cometd.url || dojo.config["cometdRoot"],
			handleAs: this._cometd.handleAs,
			content: { message: dojo.toJson([message]) }
		});
	}

	this.cancelConnect = function(){
		if(this._poll){
			this._poll.cancel();
			this._cometd._polling=false;
			this._cometd._publishMeta("connect",false,{cancel:true});
			this._cometd._backoff();
			this.disconnect();
			this.tunnelCollapse();
		}
	}
}

dojox.cometd.longPollTransport = dojox.cometd.longPollTransportFormEncoded;

dojox.cometd.connectionTypes.register("long-polling", dojox.cometd.longPollTransport.check, dojox.cometd.longPollTransportFormEncoded);
dojox.cometd.connectionTypes.register("long-polling-form-encoded", dojox.cometd.longPollTransport.check, dojox.cometd.longPollTransportFormEncoded);

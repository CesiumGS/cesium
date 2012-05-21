dojo.provide("dojox.cometd.callbackPollTransport");
dojo.require("dojox.cometd._base");
dojo.require("dojox.cometd.longPollTransport");
dojo.require("dojo.io.script");

dojox.cometd.callbackPollTransport = new function(){

	this._connectionType = "callback-polling";
	this._cometd = null;

	this.check = function(types, version, xdomain){
		// we handle x-domain!
		return (dojo.indexOf(types, "callback-polling") >= 0);
	}

	this.tunnelInit = function(){
		var message = {
			channel:	"/meta/connect",
			clientId:	this._cometd.clientId,
			connectionType: this._connectionType,
			id:	"" + this._cometd.messageId++
		};
		message = this._cometd._extendOut(message);
		this.openTunnelWith([message]);
	}

	this.tunnelCollapse = dojox.cometd.longPollTransport.tunnelCollapse;
	this._connect = dojox.cometd.longPollTransport._connect;
	this.deliver = dojox.cometd.longPollTransport.deliver;

	this.openTunnelWith = function(content, url){
		this._cometd._polling = true;
		var script = {
			load: dojo.hitch(this, function(data){
				this._cometd._polling=false;
				this._cometd.deliver(data);
				this._cometd._backon();
				this.tunnelCollapse();
			}),
			error: dojo.hitch(this, function(err){
				this._cometd._polling = false;
				this._cometd._publishMeta("connect",false);
				this._cometd._backoff();
				this.tunnelCollapse();
			}),
			url: (url || this._cometd.url),
			content: { message: dojo.toJson(content) },
			callbackParamName: "jsonp"
		};
		var connectTimeout = this._cometd._connectTimeout();
		if(connectTimeout > 0){
			script.timeout=connectTimeout;
		}
		dojo.io.script.get(script);
	}

	this.sendMessages = function(/*array*/ messages){
		for(var i = 0; i < messages.length; i++){
			messages[i].clientId = this._cometd.clientId;
			messages[i].id = ""+this._cometd.messageId++;
			messages[i]=this._cometd._extendOut(messages[i]);
		}

		var bindArgs = {
			url: this._cometd.url || dojo.config["cometdRoot"],
			load: dojo.hitch(this._cometd, "deliver"),
			callbackParamName: "jsonp",
			content: { message: dojo.toJson( messages ) },
			error: dojo.hitch(this, function(err){
				this._cometd._publishMeta("publish",false,{messages:messages});
			}),
			timeout: this._cometd.expectedNetworkDelay
		};
		return dojo.io.script.get(bindArgs);
	}

	this.startup = function(handshakeData){
		if(this._cometd._connected){ return; }
		this.tunnelInit();
	}

	// FIXME: what is this supposed to do? ;)
	this.disconnect = dojox.cometd.longPollTransport.disconnect;
	this.disconnect = function(){
		var message = {
			channel: "/meta/disconnect",
			clientId: this._cometd.clientId,
			id: "" + this._cometd.messageId++
		};
		message = this._cometd._extendOut(message);
		dojo.io.script.get({
			url: this._cometd.url || dojo.config["cometdRoot"],
			callbackParamName: "jsonp",
			content: { message: dojo.toJson([message]) }
		});
	}

	this.cancelConnect = function(){}
}

dojox.cometd.connectionTypes.register("callback-polling", dojox.cometd.callbackPollTransport.check, dojox.cometd.callbackPollTransport);


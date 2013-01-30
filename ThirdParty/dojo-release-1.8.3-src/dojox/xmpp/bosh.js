dojo.provide("dojox.xmpp.bosh");

dojo.require("dojo.io.script");
dojo.require("dojo.io.iframe");
dojo.require("dojox.xml.parser");

/*=====
dojo.declare("dojox.xmpp.bosh.__initArgs", null, {
	constructor: function(){
		// summary:
		//		The arguments passed to dojox.xmpp.bosh.initialize
		// iframes:
		//		The number of iframes to use for transmission
		// load:
		//		The function called when the first iframe is
		//		loaded.  Generally used to signal when to send
		//		login information
		this.iframes = iframes;
		this.load = load;
	}
});
dojo.declare("dojox.xmpp.bosh.__ioArgs", dojo.__IoArgs, {
	constructor: function(){
		// summary:
		//		All the properties described in the dojo.__ioArgs type, apply to this
		//		type as well, EXCEPT "handleAs". It is not applicable to
		//		dojox.xmpp.bosh.get() calls, since it is implied that the
		//		return will be a string of XML.
		// rid:
		//		The rid of the message being sent.
		this.rid = rid;
	}
});
=====*/

dojox.xmpp.bosh = {
	transportIframes: [],
	initialize: function(/*dojox.xmpp.bosh.__initArgs*/ args){
		this.transportIframes = [];

		var scopedObj = dojox._scopeName + '.xmpp.bosh';

		var c = dojo.connect(dojo.getObject(scopedObj), '_iframeOnload', this, function(index){
			if(index==0){
				args.load();
				dojo.disconnect(c);
			}
		});

		for(var i = 0; i < args.iframes; i++){
			var fname = 'xmpp-transport-'+i;
			var iframe = dojo.byId('xmpp-transport-'+i);
			if(iframe){
				// we have to clean up the dojo.io.iframe references
				if(window[fname]){ window[fname] = null; }
				if(window.frames[fname]){ window.frames[fname] = null; }
				dojo.destroy(iframe);
			}
			iframe = dojo.io.iframe.create("xmpp-transport-" + i, scopedObj + "._iframeOnload("+i+");" );
			this.transportIframes.push(iframe);
		}
	},

	_iframeOnload: function(index){
		var doc = dojo.io.iframe.doc(dojo.byId("xmpp-transport-" + index));
		doc.write("<script>var isLoaded=true; var rid=0; var transmiting=false; function _BOSH_(msg) { transmiting=false; parent.dojox.xmpp.bosh.handle(msg, rid); } </script>");
	},

	findOpenIframe: function() {
		for(var i = 0; i < this.transportIframes.length; i++) {
			var iframe = this.transportIframes[i];
			var win = iframe.contentWindow;
			//console.log("Open transport?", win, win.isLoaded, win.transmiting);
			
			if(win.isLoaded && !win.transmiting) {
				return iframe;
			}
		}
		return false;
	},

	handle: function(msg, rid){
		var dfd = this['rid'+rid];

		var xmlMsg = dojox.xml.parser.parse(msg, 'text/xml');

		if(xmlMsg){
			dfd.ioArgs.xmppMessage = xmlMsg;
		}else{
			dfd.errback(new Error("Recieved bad document from server: " + msg));
		}
	},

	get: function(/*dojox.xmpp.bosh.__ioArgs*/args){
		// summary:
		//		sends a get request using a dynamically created script tag.
		var iframe = this.findOpenIframe();
		var iframeDoc = dojo.io.iframe.doc(iframe);

		args.frameDoc = iframeDoc;

		var dfd = this._makeScriptDeferred(args);
		var ioArgs = dfd.ioArgs;

		iframe.contentWindow.rid=ioArgs.rid;
		iframe.contentWindow.transmiting=true;

		dojo._ioAddQueryToUrl(ioArgs);
		dojo._ioNotifyStart(dfd);

		dojo.io.script.attach(ioArgs.id, ioArgs.url, iframeDoc);

		dojo._ioWatch(dfd, this._validCheck, this._ioCheck, this._resHandle);
		return dfd;
	},

	remove: function(/*String*/id, /*Document?*/frameDocument){
		// summary:
		//		removes the script element with the given id, from the given frameDocument.
		//		If no frameDocument is passed, the current document is used.
		dojo.destroy(dojo.byId(id, frameDocument));

		//Remove the BOSH callback on dojox.xmpp.bosh, if it exists.
		if(this[id]){
			delete this[id];
		}
	},

	_makeScriptDeferred: function(/*Object*/args){
		// summary:
		//		sets up a Deferred object for an IO request.
		var dfd = dojo._ioSetArgs(args, this._deferredCancel, this._deferredOk, this._deferredError);

		var ioArgs = dfd.ioArgs;

		ioArgs.id = 'rid' + args.rid;
		ioArgs.rid = args.rid;
		ioArgs.canDelete = true;
		ioArgs.frameDoc = args.frameDoc;

		this[ioArgs.id] = dfd;

		return dfd; // dojo.Deferred
	},

	_deferredCancel: function(/*Deferred*/dfd){
		// summary:
		//		canceller function for dojo._ioSetArgs call.

		//DO NOT use "this" and expect it to be dojox.xmpp.bosh.
		dfd.canceled = true;
		if(dfd.ioArgs.canDelete){
			dojox.xmpp.bosh._addDeadScript(dfd.ioArgs);
		}
	},

	_deferredOk: function(/*Deferred*/dfd){
		// summary:
		//		okHandler function for dojo._ioSetArgs call.

		//DO NOT use "this" and expect it to be dojo.xmpp.bosh.
		var ioArgs = dfd.ioArgs;

		//Add script to list of things that can be removed.
		if(ioArgs.canDelete){
			dojox.xmpp.bosh._addDeadScript(ioArgs);
		}

		//Favor JSONP responses, script load events then lastly ioArgs.
		//The ioArgs are goofy, but cannot return the dfd since that stops
		//the callback chain in Deferred. The return value is not that important
		//in that case, probably a checkString case.
		return ioArgs.xmppMessage || ioArgs;
	},

	_deferredError: function(/*Error*/error, /*Deferred*/dfd){
		// summary:
		//		errHandler function for dojo._ioSetArgs call.

		if(dfd.ioArgs.canDelete){
			//DO NOT use "this" and expect it to be dojox.xmpp.bosh
			if(error.dojoType == "timeout"){
				//For timeouts, remove the script element immediately to
				//avoid a response from it coming back later and causing trouble.
				dojox.xmpp.bosh.remove(dfd.ioArgs.id, dfd.ioArgs.frameDoc);
			}else{
				dojox.xmpp.bosh._addDeadScript(dfd.ioArgs);
			}
		}
		return error;
	},

	_deadScripts: [],
	_addDeadScript: function(/*Object*/ioArgs){
		// summary:
		//		sets up an entry in the deadScripts array.
		dojox.xmpp.bosh._deadScripts.push({id: ioArgs.id, frameDoc: ioArgs.frameDoc});
		//Being extra paranoid about leaks:
		ioArgs.frameDoc = null;
	},

	_validCheck: function(/*Deferred*/dfd){
		// summary:
		//		inflight check function to see if dfd is still valid.

		//Do script cleanup here. We wait for one inflight pass
		//to make sure we don't get any weird things by trying to remove a script
		//tag that is part of the call chain (IE 6 has been known to
		//crash in that case).
		var _self = dojox.xmpp.bosh;
		var deadScripts = _self._deadScripts;
		if(deadScripts && deadScripts.length > 0){
			for(var i = 0; i < deadScripts.length; i++){
				//Remove the script tag
				_self.remove(deadScripts[i].id, deadScripts[i].frameDoc);
				deadScripts[i].frameDoc = null;
			}
			dojox.xmpp.bosh._deadScripts = [];
		}

		return true;
	},

	_ioCheck: function(/*Deferred*/dfd){
		// summary:
		//		inflight check function to see if IO finished.
		var ioArgs = dfd.ioArgs;
		//Check for returned message
		if(ioArgs.xmppMessage){
			return true;
		}
		return false;
	},

	_resHandle: function(/*Deferred*/dfd){
		// summary:
		//		inflight function to handle a completed response.
		if(dojox.xmpp.bosh._ioCheck(dfd)){
			dfd.callback(dfd);
		}else{
			//This path should never happen since the only way we can get
			//to _resHandle is if _ioCheck is true.
			dfd.errback(new Error("inconceivable dojox.xmpp.bosh._resHandle error"));
		}
	}
};

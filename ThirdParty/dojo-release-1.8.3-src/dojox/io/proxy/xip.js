define(['dojo/main', 'dojo/io/iframe', 'dojox/data/dom', 'dojo/_base/xhr', 'dojo/_base/url'], function(dojo, iframe, dom){
	dojo.getObject("io.proxy.xip", true, dojox);

dojox.io.proxy.xip = {
	// summary:
	//		Object that implements the iframe handling for XMLHttpRequest
	//		IFrame Proxying.
	//
	//		Do not use this object directly. See the Dojo Book page
	//		on XMLHttpRequest IFrame Proxying:
	//		http://dojotoolkit.org/book/dojo-book-0-4/part-5-connecting-pieces/i-o/cross-domain-xmlhttprequest-using-iframe-proxy
	//		Usage of XHR IFrame Proxying does not work from local disk in Safari.

	/*
	This code is really focused on just sending one complete request to the server, and
	receiving one complete response per iframe. The code does not expect to reuse iframes for multiple XHR request/response
	sequences. This might be reworked later if performance indicates a need for it.
	
	xip fragment identifier/hash values have the form:
	#id:cmd:realEncodedMessage

	id: some ID that should be unique among message fragments. No inherent meaning,
	        just something to make sure the hash value is unique so the message
	        receiver knows a new message is available.
	        
	cmd: command to the receiver. Valid values are:
	         - init: message used to init the frame. Sent as the first URL when loading
	                 the page. Contains some config parameters.
	         - loaded: the remote frame is loaded. Only sent from xip_client.html to this module.
	         - ok: the message that this page sent was received OK. The next message may
	               now be sent.
	         - start: the start message of a block of messages (a complete message may
	                  need to be segmented into many messages to get around the limitiations
	                  of the size of an URL that a browser accepts.
	         - part: indicates this is a part of a message.
	         - end: the end message of a block of messages. The message can now be acted upon.
	                If the message is small enough that it doesn't need to be segmented, then
	                just one hash value message can be sent with "end" as the command.
	
	To reassemble a segmented message, the realEncodedMessage parts just have to be concatenated
	together.
	*/

	xipClientUrl: ((dojo.config || djConfig)["xipClientUrl"]) || dojo.moduleUrl("dojox.io.proxy", "xip_client.html").toString(),


	//MSIE has the lowest limit for URLs with fragment identifiers,
	//at around 4K. Choosing a slightly smaller number for good measure.
	urlLimit: 4000,

	_callbackName: (dojox._scopeName || "dojox") + ".io.proxy.xip.fragmentReceived",
	_state: {},
	_stateIdCounter: 0,
	_isWebKit: navigator.userAgent.indexOf("WebKit") != -1,


	send: function(/*Object*/facade){
		// summary:
		//		starts the xdomain request using the provided facade.
		//		This method first does some init work, then delegates to _realSend.

		var url = this.xipClientUrl;
		//Make sure we are not dealing with javascript urls, just to be safe.
		if(url.split(":")[0].match(/javascript/i) || facade._ifpServerUrl.split(":")[0].match(/javascript/i)){
			return null;
		}
		
		//Make xip_client a full URL.
		var colonIndex = url.indexOf(":");
		var slashIndex = url.indexOf("/");
		if(colonIndex == -1 || slashIndex < colonIndex){
			//No colon or we are starting with a / before a colon, so we need to make a full URL.
			var loc = window.location.href;
			if(slashIndex == 0){
				//Have a full path, just need the domain.
				url = loc.substring(0, loc.indexOf("/", 9)) + url; //Using 9 to get past http(s)://
			}else{
				url = loc.substring(0, (loc.lastIndexOf("/") + 1)) + url;
			}
		}
		this.fullXipClientUrl = url;

		//Set up an HTML5 messaging listener if postMessage exists.
		//As of this writing, this is only useful to get Opera 9.25+ to work.
		if(typeof document.postMessage != "undefined"){
			document.addEventListener("message", dojo.hitch(this, this.fragmentReceivedEvent), false);
		}

		//Now that we did first time init, always use the realSend method.
		this.send = this._realSend;
		return this._realSend(facade); //Object
	},

	_realSend: function(facade){
		// summary:
		//		starts the actual xdomain request using the provided facade.
		var stateId = "XhrIframeProxy" + (this._stateIdCounter++);
		facade._stateId = stateId;

		var frameUrl = facade._ifpServerUrl + "#0:init:id=" + stateId + "&client="
			+ encodeURIComponent(this.fullXipClientUrl) + "&callback=" + encodeURIComponent(this._callbackName);

		this._state[stateId] = {
			facade: facade,
			stateId: stateId,
			clientFrame: iframe.create(stateId, "", frameUrl),
			isSending: false,
			serverUrl: facade._ifpServerUrl,
			requestData: null,
			responseMessage: "",
			requestParts: [],
			idCounter: 1,
			partIndex: 0,
			serverWindow: null
		};

		return stateId; //Object
	},

	receive: function(/*String*/stateId, /*String*/urlEncodedData){
		/* urlEncodedData should have the following params:
				- responseHeaders
				- status
				- statusText
				- responseText
		*/
		//Decode response data.
		var response = {};
		var nvPairs = urlEncodedData.split("&");
		for(var i = 0; i < nvPairs.length; i++){
			if(nvPairs[i]){
				var nameValue = nvPairs[i].split("=");
				response[decodeURIComponent(nameValue[0])] = decodeURIComponent(nameValue[1]);
			}
		}

		//Set data on facade object.
		var state = this._state[stateId];
		var facade = state.facade;

		facade._setResponseHeaders(response.responseHeaders);
		if(response.status == 0 || response.status){
			facade.status = parseInt(response.status, 10);
		}
		if(response.statusText){
			facade.statusText = response.statusText;
		}
		if(response.responseText){
			facade.responseText = response.responseText;
			
			//Fix responseXML.
			var contentType = facade.getResponseHeader("Content-Type");
			if(contentType){
				var mimeType = contentType.split(";")[0];
				if(mimeType.indexOf("application/xml") == 0 || mimeType.indexOf("text/xml") == 0){
					facade.responseXML = dom.createDocument(response.responseText, contentType);
				}
			}
		}
		facade.readyState = 4;
		
		this.destroyState(stateId);
	},

	frameLoaded: function(/*String*/stateId){
		var state = this._state[stateId];
		var facade = state.facade;

		var reqHeaders = [];
		for(var param in facade._requestHeaders){
			reqHeaders.push(param + ": " + facade._requestHeaders[param]);
		}

		var requestData = {
			uri: facade._uri
		};
		if(reqHeaders.length > 0){
			requestData.requestHeaders = reqHeaders.join("\r\n");
		}
		if(facade._method){
			requestData.method = facade._method;
		}
		if(facade._bodyData){
			requestData.data = facade._bodyData;
		}

		this.sendRequest(stateId, dojo.objectToQuery(requestData));
	},
	
	destroyState: function(/*String*/stateId){
		var state = this._state[stateId];
		if(state){
			delete this._state[stateId];
			var parentNode = state.clientFrame.parentNode;
			parentNode.removeChild(state.clientFrame);
			state.clientFrame = null;
			state = null;
		}
	},

	createFacade: function(){
		if(arguments && arguments[0] && arguments[0].iframeProxyUrl){
			return new dojox.io.proxy.xip.XhrIframeFacade(arguments[0].iframeProxyUrl);
		}else{
			return dojox.io.proxy.xip._xhrObjOld.apply(dojo, arguments);
		}
	},
	
	//**** State-bound methods ****
	sendRequest: function(stateId, encodedData){
		var state = this._state[stateId];
		if(!state.isSending){
			state.isSending = true;

			state.requestData = encodedData || "";

			//Get a handle to the server iframe.
			state.serverWindow = frames[state.stateId];
			if (!state.serverWindow){
				state.serverWindow = document.getElementById(state.stateId).contentWindow;
			}

			//Make sure we have contentWindow, but only do this for non-postMessage
			//browsers (right now just opera is postMessage).
			if(typeof document.postMessage == "undefined"){
				if(state.serverWindow.contentWindow){
					state.serverWindow = state.serverWindow.contentWindow;
				}
			}

			this.sendRequestStart(stateId);
		}
	},

	sendRequestStart: function(stateId){
		//Break the message into parts, if necessary.
		var state = this._state[stateId];
		state.requestParts = [];
		var reqData = state.requestData;
		var urlLength = state.serverUrl.length;
		var partLength = this.urlLimit - urlLength;
		var reqIndex = 0;

		while((reqData.length - reqIndex) + urlLength > this.urlLimit){
			var part = reqData.substring(reqIndex, reqIndex + partLength);
			//Safari will do some extra hex escaping unless we keep the original hex
			//escaping complete.
			var percentIndex = part.lastIndexOf("%");
			if(percentIndex == part.length - 1 || percentIndex == part.length - 2){
				part = part.substring(0, percentIndex);
			}
			state.requestParts.push(part);
			reqIndex += part.length;
		}
		state.requestParts.push(reqData.substring(reqIndex, reqData.length));
		
		state.partIndex = 0;
		this.sendRequestPart(stateId);

	},
	
	sendRequestPart: function(stateId){
		var state = this._state[stateId];

		if(state.partIndex < state.requestParts.length){
			//Get the message part.
			var partData = state.requestParts[state.partIndex];

			//Get the command.
			var cmd = "part";
			if(state.partIndex + 1 == state.requestParts.length){
				cmd = "end";
			}else if (state.partIndex == 0){
				cmd = "start";
			}
			
			this.setServerUrl(stateId, cmd, partData);
			state.partIndex++;
		}
	},

	setServerUrl: function(stateId, cmd, message){
		var serverUrl = this.makeServerUrl(stateId, cmd, message);
		var state = this._state[stateId];

		//Safari won't let us replace across domains.
		if(this._isWebKit){
			state.serverWindow.location = serverUrl;
		}else{
			state.serverWindow.location.replace(serverUrl);
		}
	},

	makeServerUrl: function(stateId, cmd, message){
		var state = this._state[stateId];
		var serverUrl = state.serverUrl + "#" + (state.idCounter++) + ":" + cmd;
		if(message){
			serverUrl += ":" + message;
		}
		return serverUrl;
	},

	fragmentReceivedEvent: function(evt){
		// summary:
		//		HTML5 document messaging endpoint. Unpack the event to see if we want to use it.
		if(evt.uri.split("#")[0] == this.fullXipClientUrl){
			this.fragmentReceived(evt.data);
		}
	},

	fragmentReceived: function(frag){
		var index = frag.indexOf("#");
		var stateId = frag.substring(0, index);
		var encodedData = frag.substring(index + 1, frag.length);

		var msg = this.unpackMessage(encodedData);
		var state = this._state[stateId];

		switch(msg.command){
			case "loaded":
				this.frameLoaded(stateId);
				break;
			case "ok":
				this.sendRequestPart(stateId);
				break;
			case "start":
				state.responseMessage = "" + msg.message;
				this.setServerUrl(stateId, "ok");
				break;
			case "part":
				state.responseMessage += msg.message;
				this.setServerUrl(stateId, "ok");
				break;
			case "end":
				this.setServerUrl(stateId, "ok");
				state.responseMessage += msg.message;
				this.receive(stateId, state.responseMessage);
				break;
		}
	},
	
	unpackMessage: function(encodedMessage){
		var parts = encodedMessage.split(":");
		var command = parts[1];
		encodedMessage = parts[2] || "";

		var config = null;
		if(command == "init"){
			var configParts = encodedMessage.split("&");
			config = {};
			for(var i = 0; i < configParts.length; i++){
				var nameValue = configParts[i].split("=");
				config[decodeURIComponent(nameValue[0])] = decodeURIComponent(nameValue[1]);
			}
		}
		return {command: command, message: encodedMessage, config: config};
	}
}

//Replace the normal XHR factory with the proxy one.
dojox.io.proxy.xip._xhrObjOld = dojo._xhrObj;
dojo._xhrObj = dojox.io.proxy.xip.createFacade;

/**
	Using this a reference: http://www.w3.org/TR/XMLHttpRequest/

	Does not implement the onreadystate callback since dojo.xhr* does
	not use it.
*/
dojox.io.proxy.xip.XhrIframeFacade = function(ifpServerUrl){
	// summary:
	//		XMLHttpRequest facade object used by dojox.io.proxy.xip.
	//
	//		Do not use this object directly. See the Dojo Book page
	//		on XMLHttpRequest IFrame Proxying:
	//		http://dojotoolkit.org/book/dojo-book-0-4/part-5-connecting-pieces/i-o/cross-domain-xmlhttprequest-using-iframe-proxy
	this._requestHeaders = {};
	this._allResponseHeaders = null;
	this._responseHeaders = {};
	this._method = null;
	this._uri = null;
	this._bodyData = null;
	this.responseText = null;
	this.responseXML = null;
	this.status = null;
	this.statusText = null;
	this.readyState = 0;
	
	this._ifpServerUrl = ifpServerUrl;
	this._stateId = null;
}

dojo.extend(dojox.io.proxy.xip.XhrIframeFacade, {
	//The open method does not properly reset since Dojo does not reuse XHR objects.
	open: function(/*String*/method, /*String*/uri){
		this._method = method;
		this._uri = uri;

		this.readyState = 1;
	},
	
	setRequestHeader: function(/*String*/header, /*String*/value){
		this._requestHeaders[header] = value;
	},
	
	send: function(/*String*/stringData){
		this._bodyData = stringData;
		
		this._stateId = dojox.io.proxy.xip.send(this);
		
		this.readyState = 2;
	},
	abort: function(){
		dojox.io.proxy.xip.destroyState(this._stateId);
	},
	
	getAllResponseHeaders: function(){
		return this._allResponseHeaders; //String
	},
	
	getResponseHeader: function(/*String*/header){
		return this._responseHeaders[header]; //String
	},
	
	_setResponseHeaders: function(/*String*/allHeaders){
		if(allHeaders){
			this._allResponseHeaders = allHeaders;
			
			//Make sure ther are now CR characters in the headers.
			allHeaders = allHeaders.replace(/\r/g, "");
			var nvPairs = allHeaders.split("\n");
			for(var i = 0; i < nvPairs.length; i++){
				if(nvPairs[i]){
					var nameValue = nvPairs[i].split(": ");
					this._responseHeaders[nameValue[0]] = nameValue[1];
				}
			}
		}
	}
});

return dojox.io.proxy.xip;

});

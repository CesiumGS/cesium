dojo.provide("dojox.wire.ml.Service");

dojo.require("dijit._Widget");
dojo.require("dojox.xml.parser");
dojo.require("dojox.wire._base");
dojo.require("dojox.wire.ml.util");

dojo.declare("dojox.wire.ml.Service", dijit._Widget, {
	// summary:
	//		A widget for a service
	// description:
	//		This widget represents a service defined by a service description
	//		specified with 'url' attribute.
	//		If 'serviceType' and 'serviceUrl' attributes are specified, 'url'
	//		attribute can be omitted.

	// url:
	//		A URL to a service description
	url: "",

	// serviceUrl:
	//		A URL to a service
	serviceUrl: "",

	// serviceType:
	//		A service type
	serviceType: "",

	// handlerClass:
	//		A service handler class name
	handlerClass: "",

	preventCache: true,

	postCreate: function(){
		// summary:
		//		Call _createHandler()
		// description:
		//		See _createHandler().
		this.handler = this._createHandler();
	},

	_handlerClasses: {
		"TEXT": "dojox.wire.ml.RestHandler",
		"XML": "dojox.wire.ml.XmlHandler",
		"JSON": "dojox.wire.ml.JsonHandler",
		"JSON-RPC": "dojo.rpc.JsonService"
	},

	_createHandler: function(){
		// summary:
		//		Create a service handler
		// description:
		//		A service handler class is determined by:
		//
		//		1. 'handlerClass' attribute
		//		2. 'serviceType' attribute
		//		3. 'serviceType' property in a service description
		// returns:
		//		A service handler
		if(this.url){
			var self = this;
			var d = dojo.xhrGet({
				url: this.url,
				handleAs: "json",
				sync: true
			});
			d.addCallback(function(result){
				self.smd = result;
			});
			if(this.smd && !this.serviceUrl){
				this.serviceUrl = (this.smd.serviceUrl || this.smd.serviceURL);
			}
		}
		var handlerClass = undefined;
		if(this.handlerClass){
			handlerClass = dojox.wire._getClass(this.handlerClass);
		}else if(this.serviceType){
			handlerClass = this._handlerClasses[this.serviceType];
			if(handlerClass && dojo.isString(handlerClass)){
				handlerClass = dojox.wire._getClass(handlerClass);
				this._handlerClasses[this.serviceType] = handlerClass;
			}
		}else if(this.smd && this.smd.serviceType){
			handlerClass = this._handlerClasses[this.smd.serviceType];
			if(handlerClass && dojo.isString(handlerClass)){
				handlerClass = dojox.wire._getClass(handlerClass);
				this._handlerClasses[this.smd.serviceType] = handlerClass;
			}
		}
		if(!handlerClass){
			return null; //null
		}
		return new handlerClass(); //Object
	},

	callMethod: function(method, parameters){
		// summary:
		//		Call a service method with parameters
		// method:
		//		A method name
		// parameters:
		//		An array parameters
		var deferred = new dojo.Deferred();
		this.handler.bind(method, parameters, deferred, this.serviceUrl);
		return deferred;
	}
});

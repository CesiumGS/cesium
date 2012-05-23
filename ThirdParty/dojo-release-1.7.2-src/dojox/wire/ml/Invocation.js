dojo.provide("dojox.wire.ml.Invocation");

dojo.require("dojox.wire.ml.Action");

dojo.declare("dojox.wire.ml.Invocation", dojox.wire.ml.Action, {
	//	summary:
	//		A widget to invoke a method or publish a topic
	//	description:
	//		This widget represents a controller task to invoke a method or
	//		publish a topic when an event (a function) or a topic is issued.
	//	object:
	//		A scope of a method to invoke
	//	method:
	//		A name of a method to invoke
	//	topic:
	//		A name of a topic to publish
	//	parameters:
	//		Arguments for the method or the topic
	//	result:
	//		A property to store a return value of the method call
	//	error:
	//		A property to store an error on the method call
	object: "",
	method: "",
	topic: "",
	parameters: "",
	result: "",
	error: "",

	_run: function(){
		//	summary:
		//		Invoke a method or publish a topic
		//	description:
		//		If 'topic' is specified, the topic is published with arguments
		//		specified to 'parameters'.
		//		If 'method' and 'object' are specified, the method is invoked
		//		with arguments specified to 'parameters' and set the return
		//		value to a property specified to 'result'.
		//		'object', 'parameters' and 'result' can specify properties of
		//		a widget or an DOM element with the dotted notation.
		//		If 'parameters' are omitted, the arguments to this method are
		//		passed as is.
		if(this.topic){
			var args = this._getParameters(arguments);
			try{
				dojo.publish(this.topic, args);
				this.onComplete();
			}catch(e){
				this.onError(e);
			}
		}else if(this.method){
			var scope = (this.object ? dojox.wire.ml._getValue(this.object) : dojo.global);
			if(!scope){
				return; //undefined
			}
			var args = this._getParameters(arguments);
			var func = scope[this.method];
			if(!func){
				func = scope.callMethod;
				if(!func){
					return; //undefined
				}
				args = [this.method, args];
			}
			try{
				var connected = false;
				if(scope.getFeatures){
					var features = scope.getFeatures();
					if((this.method == "fetch" && features["dojo.data.api.Read"]) ||
						(this.method == "save" && features["dojo.data.api.Write"])){
						var arg = args[0];
						if(!arg.onComplete){
							arg.onComplete = function(){};
						}
						//dojo.connect(arg, "onComplete", this, "onComplete");
						this.connect(arg, "onComplete", "onComplete");
						if(!arg.onError){
							arg.onError = function(){};
						}
						//dojo.connect(arg, "onError", this, "onError");
						this.connect(arg, "onError", "onError");
						connected = true;
					}
				}
				var r = func.apply(scope, args);
				if(!connected){
					if(r && (r instanceof dojo.Deferred)){
						var self = this;
						r.addCallbacks(
							function(result){self.onComplete(result);},
							function(error){self.onError(error);}
						);
					}else{
						this.onComplete(r);
					}
				}
			}catch(e){
				this.onError(e);
			}
		}
	},

	onComplete: function(/*anything*/result){
		//	summary:
		//		A function called when the method or the topic publish
		//		completed
		//	description:
		//		If 'result' attribute is specified, the result object also set
		//		to the specified property.
		//	result:
		//		The return value of a method or undefined for a topic
		if(this.result){
			dojox.wire.ml._setValue(this.result, result);
		}
		if(this.error){ // clear error
			dojox.wire.ml._setValue(this.error, "");
		}
	},

	onError: function(/*anything*/error){
		//	summary:
		//		A function called on an error occurs
		//	description:
		//		If 'error' attribute is specified, the error object also set to
		//		the specified property.
		//	error:
		//		The exception or error occurred
		if(this.error){
			if(error && error.message){
				error = error.message;
			}
			dojox.wire.ml._setValue(this.error, error);
		}
	},

	_getParameters: function(/*Array*/args){
		//	summary:
		//		Returns arguments to a method or topic to invoke
		//	description:
		//		This method retunrs an array of arguments specified by
		//		'parameters' attribute, a comma-separated list of IDs and
		//		their properties in a dotted notation.
		//		If 'parameters' are omitted, the original arguments are
		//		used.
		//	args:
		//		Arguments to a trigger event or topic
		if(!this.parameters){
		 	// use arguments as is
			return args; //Array
		}
		var parameters = [];
		var list = this.parameters.split(",");
		if(list.length == 1){
			var parameter = dojox.wire.ml._getValue(dojo.trim(list[0]), args);
			if(dojo.isArray(parameter)){
				parameters = parameter;
			}else{
				parameters.push(parameter);
			}
		}else{
			for(var i in list){
				parameters.push(dojox.wire.ml._getValue(dojo.trim(list[i]), args));
			}
		}
		return parameters; //Array
	}
});

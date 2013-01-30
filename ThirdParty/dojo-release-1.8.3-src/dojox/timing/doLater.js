define(["./_base"], function(dxt){
	dojo.experimental("dojox.timing.doLater");

	dxt.doLater = function(/*anything*/conditional,/*Object ?*/context, /* Number ? */interval){
		// summary:
		//		Check if a parameter is ready, and if not,
		//		"do later". doLater will ping the parameter
		//		until it evaluates to something (truthy).
		//		It thens calls the caller with original
		//		arguments, using the supplied context or
		//		window.
		// description:
		//		dojox.timing.doLater(conditional) is testing if the call
		//		should be done later. So it returns
		//		true if the param is false.
		// conditional: anything
		//		Can be a property that eventually gets set, or
		//		an expression, method... anything that can be
		//		evaluated.
		// context:	Object
		//		The namespace where the call originated.
		//		Defaults to global and anonymous functions
		// interval:	Number
		//		Poll time to check conditional in Milliseconds
		// example:
		//	| setTimeout(function(){
		//	| 		if(dojox.timing.doLater(app.ready)){return;}
		//	| 		console.log("Code is ready! anonymous.function SUCCESS")
		//	| 	},700);

		if(conditional){ return false; }  // Boolean
		var callback = dxt.doLater.caller,
			args = dxt.doLater.caller.arguments;
		interval = interval || 100;
		context = context || dojo.global;
		
		setTimeout(function(){
			callback.apply(context, args);
		},interval);
		return true; // Boolean
	};
	return dxt.doLater;
});

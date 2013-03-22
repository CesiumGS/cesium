define(["./_base/kernel"], function(dojo){
	// module:
	//		dojo/jaxer

dojo.deprecated("(dojo)/jaxer interface", "Jaxer is no longer supported by the Dojo Toolkit, will be removed with DTK 1.9.");
if(typeof print == "function"){
	console.debug = Jaxer.Log.debug;
	console.warn = Jaxer.Log.warn;
	console.error = Jaxer.Log.error;
	console.info = Jaxer.Log.info;
	console.log = Jaxer.Log.warn;
}

onserverload = dojo._loadInit;

return dojo;
});

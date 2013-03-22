define(["dojo/_base/kernel", "dojo/_base/window", "dojo/io/script", "dojox/io/xhrPlugins", "dojox/io/scriptFrame"], function(dojo, window, script, xhrPlugins, scriptFrame){
dojo.getObject("io.xhrScriptPlugin", true, dojox);

dojox.io.xhrScriptPlugin = function(/*String*/url, /*String*/callbackParamName, /*Function?*/httpAdapter){
	// summary:
	//		Adds the script transport (JSONP) as an XHR plugin for the given site. See
	//		dojox.io.script for more information on the transport. Note, that JSONP
	//		is *not* a secure transport, by loading data from a third-party site using JSONP
	//		the site has full access to your JavaScript environment.
	// url:
	//		Url prefix of the site which can handle JSONP requests.
	// httpAdapter:
	//		This allows for adapting HTTP requests that could not otherwise be
	//		sent with JSONP, so you can use a convention for headers and PUT/DELETE methods.
	xhrPlugins.register(
		"script",
		function(method,args){
			 return args.sync !== true &&
				(method == "GET" || httpAdapter) &&
				(args.url.substring(0,url.length) == url);
		},
		function(method,args,hasBody){
			var send = function(){
				args.callbackParamName = callbackParamName;
				if(dojo.body()){
					args.frameDoc = "frame" + Math.random();
				}
				return script.get(args);
			};
			return (httpAdapter ? httpAdapter(send, true) : send)(method, args, hasBody); // use the JSONP transport
		}
	);
};

return dojox.io.xhrScriptPlugin;
});

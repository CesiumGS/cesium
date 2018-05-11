define([
	"../_base/config", "../_base/json", "../_base/kernel", /*===== "../_base/declare", =====*/ "../_base/lang",
	"../_base/xhr", "../sniff", "../_base/window",
	"../dom", "../dom-construct", "../query", "require", "../aspect", "../request/iframe"
], function(config, json, kernel, /*===== declare, =====*/ lang, xhr, has, win, dom, domConstruct, query, require, aspect, _iframe){

// module:
//		dojo/io/iframe

kernel.deprecated("dojo/io/iframe", "Use dojo/request/iframe.", "2.0");

/*=====
var __ioArgs = declare(kernel.__IoArgs, {
	// method: String?
	//		The HTTP method to use. "GET" or "POST" are the only supported
	//		values.  It will try to read the value from the form node's
	//		method, then try this argument. If neither one exists, then it
	//		defaults to POST.
	// handleAs: String?
	//		Specifies what format the result data should be given to the
	//		load/handle callback. Valid values are: text, html, xml, json,
	//		javascript. IMPORTANT: For all values EXCEPT html and xml, The
	//		server response should be an HTML file with a textarea element.
	//		The response data should be inside the textarea element. Using an
	//		HTML document the only reliable, cross-browser way this
	//		transport can know when the response has loaded. For the html
	//		handleAs value, just return a normal HTML document.  NOTE: xml
	//		is now supported with this transport (as of 1.1+); a known issue
	//		is if the XML document in question is malformed, Internet Explorer
	//		will throw an uncatchable error.
	// content: Object?
	//		If "form" is one of the other args properties, then the content
	//		object properties become hidden form form elements. For
	//		instance, a content object of {name1 : "value1"} is converted
	//		to a hidden form element with a name of "name1" and a value of
	//		"value1". If there is not a "form" property, then the content
	//		object is converted into a name=value&name=value string, by
	//		using xhr.objectToQuery().
});
=====*/

/*=====
return kernel.io.iframe = {
	// summary:
	//		Deprecated, use dojo/request/iframe instead.
	//		Sends an Ajax I/O call using and Iframe (for instance, to upload files)

	create: function(fname, onloadstr, uri){
		// summary:
		//		Creates a hidden iframe in the page. Used mostly for IO
		//		transports.  You do not need to call this to start a
		//		dojo/io/iframe request. Just call send().
		// fname: String
		//		The name of the iframe. Used for the name attribute on the
		//		iframe.
		// onloadstr: String
		//		A string of JavaScript that will be executed when the content
		//		in the iframe loads.
		// uri: String
		//		The value of the src attribute on the iframe element. If a
		//		value is not given, then dojo/resources/blank.html will be
		//		used.
	},
	setSrc: function(iframe, src, replace){
		// summary:
		//		Sets the URL that is loaded in an IFrame. The replace parameter
		//		indicates whether location.replace() should be used when
		//		changing the location of the iframe.
	},
	doc: function(iframeNode){
		// summary:
		//		Returns the document object associated with the iframe DOM Node argument.
	}
};
=====*/


var mid = _iframe._iframeName;
mid = mid.substring(0, mid.lastIndexOf('_'));

var iframe = lang.delegate(_iframe, {
	// summary:
	//		Deprecated, use dojo/request/iframe instead.
	//		Sends an Ajax I/O call using and Iframe (for instance, to upload files)

	create: function(){
		return iframe._frame = _iframe.create.apply(_iframe, arguments);
	},

	// cover up delegated methods
	get: null,
	post: null,

	send: function(/*__ioArgs*/args){
		// summary:
		//		Function that sends the request to the server.
		//		This transport can only process one send() request at a time, so if send() is called
		//		multiple times, it will queue up the calls and only process one at a time.
		var rDfd;

		//Set up the deferred.
		var dfd = xhr._ioSetArgs(args,
			function(/*Deferred*/dfd){
				// summary:
				//		canceller function for xhr._ioSetArgs call.
				rDfd && rDfd.cancel();
			},
			function(/*Deferred*/dfd){
				// summary:
				//		okHandler function for xhr._ioSetArgs call.
				var value = null,
					ioArgs = dfd.ioArgs;
				try{
					var handleAs = ioArgs.handleAs;

					//Assign correct value based on handleAs value.
					if(handleAs === "xml" || handleAs === "html"){
						value = rDfd.response.data;
					}else{
						value = rDfd.response.text;
						if(handleAs === "json"){
							value = json.fromJson(value);
						}else if(handleAs === "javascript"){
							value = kernel.eval(value);
						}
					}
				}catch(e){
					value = e;
				}
				return value;
			},
			function(/*Error*/error, /*Deferred*/dfd){
				// summary:
				//		errHandler function for xhr._ioSetArgs call.
				dfd.ioArgs._hasError = true;
				return error;
			}
		);

		var ioArgs = dfd.ioArgs;

		var method = "GET",
			form = dom.byId(args.form);
		if(args.method && args.method.toUpperCase() === "POST" && form){
			method = "POST";
		}

		var options = {
			method: method,
			handleAs: args.handleAs === "json" || args.handleAs === "javascript" ? "text" : args.handleAs,
			form: args.form,
			query: form ? null : args.content,
			data: form ? args.content : null,
			timeout: args.timeout,
			ioArgs: ioArgs
		};

		if(options.method){
			options.method = options.method.toUpperCase();
		}

		if(config.ioPublish && kernel.publish && ioArgs.args.ioPublish !== false){
			var start = aspect.after(_iframe, "_notifyStart", function(data){
				if(data.options.ioArgs === ioArgs){
					start.remove();
					xhr._ioNotifyStart(dfd);
				}
			}, true);
		}
		rDfd = _iframe(ioArgs.url, options, true);

		ioArgs._callNext = rDfd._callNext;

		rDfd.then(function(){
			dfd.resolve(dfd);
		}).otherwise(function(error){
			dfd.ioArgs.error = error;
			dfd.reject(error);
		});

		return dfd;
	},

	_iframeOnload: win.global[mid + '_onload']
});

lang.setObject("dojo.io.iframe", iframe);

return iframe;
});

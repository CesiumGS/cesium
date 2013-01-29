define([
	"dojo/_base/kernel",
	"dojo/_base/array",
	"dojo/_base/xhr",
	 "dojo/query",
	"dojox/uuid/generateRandomUuid"
], function(dojo, array, xhr, query, generateRandomUuid){
	dojo.getObject("io.xhrMultiPart", true, dojox);

	/*=====
	var __xhrContentArgs = {
		// name: String
		//		Name of the form value.
		// content: String
		//		The contents of the value.
		// filename: String?
		//		An optional filename to pass to the server, as defined by the boundary.
		// contentType: String?
		//		An optional content-type (MIME) to pass to the server, if value is being
		//		treated as a file.
		// charset: String?
		//		Optional charset to pass, for the server to interpret the file correctly.
		// contentTransferEncoding: String?
		//		Optional transfer encoding header value.
	};
	=====*/
	function _createPart(/*__xhrContentArgs */args, /* String */boundary){
		// summary:
		//		Assemble an array of boundary parts based on the passed values in args.
		if(!args["name"] && !args["content"]){
			throw new Error("Each part of a multi-part request requires 'name' and 'content'.");
		}

		var tmp = [];
		tmp.push(
			"--" + boundary,
			 "Content-Disposition: form-data; name=\"" + args.name + "\"" + (args["filename"] ? "; filename=\"" + args.filename + "\"" : "")
		);

		if(args["contentType"]){
			var ct = "Content-Type: " + args.contentType;
			if(args["charset"]){
				ct += "; Charset=" + args.charset;
			}
			tmp.push(ct);
		}

		if(args["contentTransferEncoding"]){
			tmp.push("Content-Transfer-Encoding: " + args.contentTransferEncoding);
		}
		tmp.push("", args.content);
		return tmp;		//	Array
	}

	function _partsFromNode(/* DOMNode */node, /* String */boundary){
		// summary:
		//		Assemble an array of boundary parts based on the passed FORM node.
		var o=dojo.formToObject(node), parts=[];
		for(var p in o){
			if(dojo.isArray(o[p])){
				dojo.forEach(o[p], function(item){
					parts = parts.concat(_createPart({ name: p, content: item }, boundary));
				});
			} else {
				parts = parts.concat(_createPart({ name: p, content: o[p] }, boundary));
			}
		}
		return parts;	//	Array
	}

	/*=====
	var __xhrMultiArgs = {
		// url: String
		//		URL to server endpoint.
		// content: Object?
		//		Contains properties with string values. These
		//		properties will be serialized using multi-part
		//		boundaries.
		// file: Object?
		//		Alias for "content".  Provided for backwards compatibility.
		// timeout: Integer?
		//		Milliseconds to wait for the response. If this time
		//		passes, the then error callbacks are called.
		// form: DOMNode?
		//		DOM node for a form. Used to extract the form values
		//		and send to the server; each form value will be serialized
		//		using multi-part boundaries.
		// preventCache: Boolean?
		//		Default is false. If true, then a
		//		"dojo.preventCache" parameter is sent in the request
		//		with a value that changes with each request
		//		(timestamp). Useful only with GET-type requests.
		// handleAs: String?
		//		Acceptable values depend on the type of IO
		//		transport (see specific IO calls for more information).
		// load: Function?
		//		function(response, ioArgs){}. response is an Object, ioArgs
		//		is of type dojo.__IoCallbackArgs. The load function will be
		//		called on a successful response.
		// error: Function?
		//		function(response, ioArgs){}. response is an Object, ioArgs
		//		is of type dojo.__IoCallbackArgs. The error function will
		//		be called in an error case.
		// handle: Function?
		//		function(response, ioArgs){}. response is an Object, ioArgs
		//		is of type dojo.__IoCallbackArgs. The handle function will
		//		be called in either the successful or error case.
	};
	=====*/
	dojox.io.xhrMultiPart = function(/* __xhrMultiArgs */args){
		if(!args["file"] && !args["content"] && !args["form"]){
			throw new Error("content, file or form must be provided to dojox.io.xhrMultiPart's arguments");
		}

		// unique guid as a boundary value for multipart posts
		var boundary=generateRandomUuid(), tmp=[], out="";
		if(args["file"] || args["content"]){
			var v = args["file"] || args["content"];
			dojo.forEach((dojo.isArray(v) ? v : [v]), function(item){
				tmp = tmp.concat(_createPart(item, boundary));
			});
		}
		else if(args["form"]){
			if(query("input[type=file]", args["form"]).length){
				throw new Error("dojox.io.xhrMultiPart cannot post files that are values of an INPUT TYPE=FILE.  Use dojo.io.iframe.send() instead.");
			}
			tmp = _partsFromNode(args["form"], boundary);
		}

		if(tmp.length){
			tmp.push("--"+boundary+"--", "");
			out = tmp.join("\r\n");
		}

		console.log(out);

		return dojo.rawXhrPost(dojo.mixin(args, {
			contentType: "multipart/form-data; boundary=" + boundary,
			postData: out
		}));	//	dojo.Deferred
	};

	return dojox.io.xhrMultiPart;
});

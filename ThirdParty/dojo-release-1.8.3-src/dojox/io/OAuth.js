define([
	"dojo/_base/kernel", // dojo
	"dojo/_base/lang", // mixin
	"dojo/_base/array", // isArray, map
	"dojo/_base/xhr", // formToObject, queryToObject, xhr
	"dojo/dom", // byId
	"dojox/encoding/digests/SHA1" // SHA1
], function(dojo, lang, array, xhr, dom, SHA1){
dojo.getObject("io.OAuth", true, dojox);

dojox.io.OAuth = new (function(){
	// summary:
	//		Helper singleton for signing any kind of Ajax request using the OAuth 1.0 protocol.
	// description:
	//		dojox.io.OAuth is a singleton class designed to allow anyone to sign a request,
	//		based on the OAuth 1.0 specification, made with any of the Dojo Toolkit's Ajax
	//		methods (such as dojo.xhr[verb], dojo.io.iframe, etc.).
	//
	//		The main method of dojox.io.OAuth is the sign method (see documentation for .sign);
	//		the idea is that you will "sign" the kwArgs object you'd normally pass to any of
	//		the Ajax methods, and then pass the signed object along.  As long as the token
	//		object used is valid (and the client's date and time are synced with a public
	//		time server), a signed object should be passed along correctly.
	//
	//		dojox.io.OAuth does not deal with the OAuth handshake process at all.
	//
	//		This object was developed against the Netflix API (OAuth-based service); see
	//		http://developer.netflix.com for more details.
	var encode = this.encode = function(s){
		if(!("" + s).length){ return ""; }
		return encodeURIComponent(s)
			.replace(/\!/g, "%21")
			.replace(/\*/g, "%2A")
			.replace(/\'/g, "%27")
			.replace(/\(/g, "%28")
			.replace(/\)/g, "%29");
	};

	var decode = this.decode = function(str){
		// summary:
		//		Break apart the passed string and decode.
		//		Some special cases are handled.
		var a=[], list=str.split("&");
		for(var i=0, l=list.length; i<l; i++){
			var item=list[i];
			if(list[i]==""){ continue; }	//	skip this one.
			if(list[i].indexOf("=")>-1){
				var tmp=list[i].split("=");
				a.push([ decodeURIComponent(tmp[0]), decodeURIComponent(tmp[1]) ]);
			} else {
				a.push([ decodeURIComponent(list[i]), null ]);
			}
		}
		return a;
	};

	function parseUrl(url){
		// summary:
		//		Create a map out of the passed URL.  Need to pull any
		//		query string parameters off the URL for the base signature string.
        var keys = [
				"source","protocol","authority","userInfo",
				"user","password","host","port",
				"relative","path","directory",
				"file","query","anchor"
			],
			parser=/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
			match=parser.exec(url),
			map = {},
			i=keys.length;

		//	create the base map first.
		while(i--){ map[keys[i]] = match[i] || ""; }

		//	create the normalized version of the url and add it to the map
		var p=map.protocol.toLowerCase(),
			a=map.authority.toLowerCase(),
			b=(p=="http"&&map.port==80)||(p=="https"&&map.port==443);
		if(b){
			if(a.lastIndexOf(":")>-1){
				a=a.substring(0, a.lastIndexOf(":"));
			}
		}
		var path=map.path||"/";
		map.url=p+"://"+a+path;

		//	return the map
		return map;
	}

	var tab="0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	function nonce(length){
		var s="", tl=tab.length;
		for(var i=0; i<length; i++){
			s+=tab.charAt(Math.floor(Math.random()*tl));
		}
		return s;
	}
	function timestamp(){
		return Math.floor(new Date().valueOf()/1000)-2;
	}
	function signature(data, key, type){
		if(type && type!="PLAINTEXT" && type!="HMAC-SHA1"){
			throw new Error("dojox.io.OAuth: the only supported signature encodings are PLAINTEXT and HMAC-SHA1.");
		}

		if(type=="PLAINTEXT"){
			return key;
		} else {
			//	assume SHA1 HMAC
			return SHA1._hmac(data, key);
		}
	}

	function key(args){
		// summary:
		//		return the key used to sign a message based on the token object.
		return encode(args.consumer.secret)
			+ "&"
			+ (args.token && args.token.secret ? encode(args.token.secret) : "");
	}

	function addOAuth(/* dojo.__XhrArgs */args, /* dojox.io.__OAuthArgs */oaa){
		// summary:
		//		Add the OAuth parameters to the query string/content.
		var o = {
			oauth_consumer_key: oaa.consumer.key,
			oauth_nonce: nonce(16),
			oauth_signature_method: oaa.sig_method || "HMAC-SHA1",
			oauth_timestamp: timestamp(),
			oauth_version: "1.0"
		}
		if(oaa.token){
			o.oauth_token = oaa.token.key;
		}
		args.content = dojo.mixin(args.content||{}, o);
	}

	function convertArgs(args){
		// summary:
		//		Because of the need to create a base string, we have to do
		//		some manual args preparation instead of relying on the internal
		//		Dojo xhr functions.  But we'll let dojo.xhr assemble things
		//		as it normally would.
		var miArgs = [{}], formObject;

		if(args.form){
			if(!args.content){ args.content = {}; }
			var form = dojo.byId(args.form);
			var actnNode = form.getAttributeNode("action");
			args.url = args.url || (actnNode ? actnNode.value : null);
			formObject = dojo.formToObject(form);
			delete args.form;
		}
		if(formObject){ miArgs.push(formObject); }
		if(args.content){ miArgs.push(args.content); }

		//	pull anything off the query string
		var map = parseUrl(args.url);
		if(map.query){
			var tmp = dojo.queryToObject(map.query);
			//	re-encode the values.  sigh
			for(var p in tmp){ tmp[p] = encodeURIComponent(tmp[p]); }
			miArgs.push(tmp);
		}
		args._url = map.url;

		//	now set up all the parameters as an array of 2 element arrays.
		var a = [];
		for(var i=0, l=miArgs.length; i<l; i++){
			var item=miArgs[i];
			for(var p in item){
				if(dojo.isArray(item[p])){
					//	handle multiple values
					for(var j=0, jl=item.length; j<jl; j++){
						a.push([ p, item[j] ]);
					}
				} else {
					a.push([ p, item[p] ]);
				}
			}
		}

		args._parameters = a;
		return args;
	}

	function baseString(/* String */method, /* dojo.__XhrArgs */args, /* dojox.io.__OAuthArgs */oaa){
		//	create and return the base string out of the args.
		addOAuth(args, oaa);
		convertArgs(args);

		var a = args._parameters;

		//	sort the parameters
		a.sort(function(a,b){
			if(a[0]>b[0]){ return 1; }
			if(a[0]<b[0]){ return -1; }
			if(a[1]>b[1]){ return 1; }
			if(a[1]<b[1]){ return -1; }
			return 0;
		});

		//	encode.
		var s = dojo.map(a, function(item){
			return encode(item[0]) + "=" + encode((""+item[1]).length ? item[1] : "");
		}).join("&");

		var baseString = method.toUpperCase()
			+ "&" + encode(args._url)
			+ "&" + encode(s);
		return baseString;
	}

	function sign(method, args, oaa){
		//	return the oauth_signature for this message.
		var k = key(oaa),
			message = baseString(method, args, oaa),
			s = signature(message, k, oaa.sig_method || "HMAC-SHA1");
		args.content["oauth_signature"] = s;
		return args;
	}
	
	/*=====
	 	dojox.io.OAuth.__AccessorArgs = {
			// key: String
			//		The key or token issued to either the consumer or by the OAuth service.
			// secret: String
			//		The secret (shared secret for consumers, issued secret by OAuth service).
		};
		dojox.io.OAuth.__OAuthArgs = {
			// consumer: dojox.io.OAuth.__AccessorArgs
			//		The consumer information issued to your OpenAuth application.
			// sig_method: String
			//		The method used to create the signature.  Should be PLAINTEXT or HMAC-SHA1.
			// token: dojox.io.OAuth.__AccessorArgs?
			//		The request token and secret issued by the OAuth service.  If not
			//		issued yet, this should be null.
		};
	=====*/

	/*
	 *	Process goes something like this:
	 *	1. prepare the base string
	 *	2. create the key
	 *	3. create the signature based on the base string and the key
	 *	4. send the request using dojo.xhr[METHOD].
	 */

	this.sign = function(/* String*/method, /* dojo.__XhrArgs */args, /* dojox.io.OAuth.__OAuthArgs */oaa){
		// summary:
		//		Given the OAuth access arguments, sign the kwArgs that you would pass
		//		to any dojo Ajax method (dojo.xhr*, dojo.io.iframe, dojo.io.script).
		// example:
		//		Sign the kwArgs object for use with dojo.xhrGet:
		//	|	var oaa = {
		//	|		consumer: {
		//	|			key: "foobar",
		//	|			secret: "barbaz"
		//	|		}
		//	|	};
		//	|
		//	|	var args = dojox.io.OAuth.sign("GET", myAjaxKwArgs, oaa);
		//	|	dojo.xhrGet(args);
		return sign(method, args, oaa);
	};


	//	TODO: handle redirect requests?
	this.xhr = function(/* String */method, /* dojo.__XhrArgs */args, /* dojox.io.OAuth.__OAuthArgs */oaa, /* Boolean? */hasBody){
		/*	summary:
		 *		Make an XHR request that is OAuth signed.
		 *	example:
		 *	|	var dfd = dojox.io.OAuth.xhrGet({
		 *	|		url: "http://someauthdomain.com/path?foo=bar",
		 *	|		load: function(response, ioArgs){ }
		 *	|	},
		 *	|	{
		 *	|		consumer:{ key: "lasdkf9asdnfsdf", secret: "9asdnfskdfysjr" }
		 *	|	});
		 */
		sign(method, args, oaa);
		return xhr(method, args, hasBody);
	};

	this.xhrGet = function(/* dojo.__XhrArgs */args, /* dojox.io.OAuth.__OAuthArgs*/ oaa){
		return this.xhr("GET", args, oaa);
	};
	this.xhrPost = this.xhrRawPost = function(/* dojo.__XhrArgs */args, /* dojox.io.OAuth.__OAuthArgs*/ oaa){
		return this.xhr("POST", args, oaa, true);
	};
	this.xhrPut = this.xhrRawPut = function(/* dojo.__XhrArgs */args, /* dojox.io.OAuth.__OAuthArgs*/ oaa){
		return this.xhr("PUT", args, oaa, true);
	};
	this.xhrDelete = function(/* dojo.__XhrArgs */args, /* dojox.io.OAuth.__OAuthArgs*/ oaa){
		return this.xhr("DELETE", args, oaa);
	};
})();

return dojox.io.OAuth;

});

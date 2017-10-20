define([
	"../_base/connect", /*===== "../_base/declare", =====*/ "../_base/kernel", "../_base/lang",
	"../sniff", "../_base/window","../_base/xhr",
	"../dom", "../dom-construct", "../request/script", "../aspect"
], function(connect, /*===== declare, =====*/ kernel, lang, has, win, xhr, dom, domConstruct, _script, aspect){

	// module:
	//		dojo/io/script

	kernel.deprecated("dojo/io/script", "Use dojo/request/script.", "2.0");

	/*=====
	var __ioArgs = declare(kernel.__IoArgs, {
		// summary:
		//		All the properties described in the dojo.__ioArgs type, apply to this
		//		type as well, EXCEPT "handleAs". It is not applicable to
		//		dojo/io/script.get() calls, since it is implied by the usage of
		//		"jsonp" (response will be a JSONP call returning JSON)
		//		or the response is pure JavaScript defined in
		//		the body of the script that was attached.
		// callbackParamName: String
		//		Deprecated as of Dojo 1.4 in favor of "jsonp", but still supported for
		//		legacy code. See notes for jsonp property.
		// jsonp: String
		//		The URL parameter name that indicates the JSONP callback string.
		//		For instance, when using Yahoo JSONP calls it is normally,
		//		jsonp: "callback". For AOL JSONP calls it is normally
		//		jsonp: "c".
		// checkString: String
		//		A string of JavaScript that when evaluated like so:
		//		"typeof(" + checkString + ") != 'undefined'"
		//		being true means that the script fetched has been loaded.
		//		Do not use this if doing a JSONP type of call (use callbackParamName instead).
		// frameDoc: Document
		//		The Document object for a child iframe. If this is passed in, the script
		//		will be attached to that document. This can be helpful in some comet long-polling
		//		scenarios with Firefox and Opera.
	});
	=====*/

	var script = {
		// summary:
		//		TODOC

		get: function(/*__ioArgs*/ args){
			// summary:
			//		sends a get request using a dynamically created script tag.
			var rDfd;
			var dfd = this._makeScriptDeferred(args, function(dfd){
				rDfd && rDfd.cancel();
			});
			var ioArgs = dfd.ioArgs;
			xhr._ioAddQueryToUrl(ioArgs);

			xhr._ioNotifyStart(dfd);

			rDfd = _script.get(ioArgs.url, {
				timeout: args.timeout,
				jsonp: ioArgs.jsonp,
				checkString: args.checkString,
				ioArgs: ioArgs,
				frameDoc: args.frameDoc,
				canAttach: function(rDfd){
					// sync values
					ioArgs.requestId = rDfd.id;
					ioArgs.scriptId = rDfd.scriptId;
					ioArgs.canDelete = rDfd.canDelete;

					return script._canAttach(ioArgs);
				}
			}, true);

			// Run _validCheck at the same time dojo/request/watch runs the
			// rDfd.isValid function
			aspect.around(rDfd, "isValid", function(isValid){
				return function(response){
					script._validCheck(dfd);
					return isValid.call(this, response);
				};
			});

			rDfd.then(function(){
				dfd.resolve(dfd);
			}).otherwise(function(error){
				dfd.ioArgs.error = error;
				dfd.reject(error);
			});

			return dfd;
		},

		attach: _script._attach,
		remove: _script._remove,

		_makeScriptDeferred: function(/*Object*/ args, /*Function?*/ cancel){
			// summary:
			//		sets up a Deferred object for an IO request.
			var dfd = xhr._ioSetArgs(args, cancel || this._deferredCancel, this._deferredOk, this._deferredError);

			var ioArgs = dfd.ioArgs;
			ioArgs.id = kernel._scopeName + "IoScript" + (this._counter++);
			ioArgs.canDelete = false;

			//Special setup for jsonp case
			ioArgs.jsonp = args.callbackParamName || args.jsonp;
			if(ioArgs.jsonp){
				//Add the jsonp parameter.
				ioArgs.query = ioArgs.query || "";
				if(ioArgs.query.length > 0){
					ioArgs.query += "&";
				}
				ioArgs.query += ioArgs.jsonp +
					"=" + (args.frameDoc ? "parent." : "") +
					kernel._scopeName + ".io.script.jsonp_" + ioArgs.id + "._jsonpCallback";

				ioArgs.frameDoc = args.frameDoc;

				//Setup the Deferred to have the jsonp callback.
				ioArgs.canDelete = true;
				dfd._jsonpCallback = this._jsonpCallback;
				this["jsonp_" + ioArgs.id] = dfd;
			}
			// Make sure this runs no matter what happens to clean things up if need be
			dfd.addBoth(function(value){
				if(ioArgs.canDelete){
					if(value instanceof Error){
						// Set up a callback that will clean things up for timeouts and cancels
						script["jsonp_" + ioArgs.id]._jsonpCallback = function(){
							// Delete the cached deferred
							delete script["jsonp_" + ioArgs.id];
							if(ioArgs.requestId){
								// Call the dojo/request/script callback to clean itself up as well
								kernel.global[_script._callbacksProperty][ioArgs.requestId]();
							}
						};
					}else{
						script._addDeadScript(ioArgs);
					}
				}
			});
			return dfd; // dojo/_base/Deferred
		},

		_deferredCancel: function(/*Deferred*/ dfd){
			// summary:
			//		canceller function for xhr._ioSetArgs call.

			//DO NOT use "this" and expect it to be script.
			dfd.canceled = true;
		},

		_deferredOk: function(/*Deferred*/ dfd){
			// summary:
			//		okHandler function for xhr._ioSetArgs call.

			//DO NOT use "this" and expect it to be script.
			var ioArgs = dfd.ioArgs;

			//Favor JSONP responses, script load events then lastly ioArgs.
			//The ioArgs are goofy, but cannot return the dfd since that stops
			//the callback chain in Deferred. The return value is not that important
			//in that case, probably a checkString case.
			return ioArgs.json || ioArgs.scriptLoaded || ioArgs;
		},

		_deferredError: function(/*Error*/ error, /*Deferred*/ dfd){
			// summary:
			//		errHandler function for xhr._ioSetArgs call.

			console.log("dojo.io.script error", error);
			return error;
		},

		_deadScripts: [],
		_counter: 1,

		_addDeadScript: function(/*Object*/ ioArgs){
			// summary:
			//		sets up an entry in the deadScripts array.
			script._deadScripts.push({id: ioArgs.id, frameDoc: ioArgs.frameDoc});
			//Being extra paranoid about leaks:
			ioArgs.frameDoc = null;
		},

		_validCheck: function(/*Deferred*/ dfd){
			// summary:
			//		inflight check function to see if dfd is still valid.

			// TODO: why isn't dfd accessed?

			//Do script cleanup here. We wait for one inflight pass
			//to make sure we don't get any weird things by trying to remove a script
			//tag that is part of the call chain (IE 6 has been known to
			//crash in that case).
			var deadScripts = script._deadScripts;
			if(deadScripts && deadScripts.length > 0){
				for(var i = 0; i < deadScripts.length; i++){
					//Remove the script tag
					script.remove(deadScripts[i].id, deadScripts[i].frameDoc);
					//Clean up the deferreds
					delete script["jsonp_" + deadScripts[i].id];
					deadScripts[i].frameDoc = null;
				}
				script._deadScripts = [];
			}

			return true;
		},

		_ioCheck: function(dfd){
			// summary:
			//		inflight check function to see if IO finished.
			// dfd: Deferred
			var ioArgs = dfd.ioArgs;
			//Check for finished jsonp
			if(ioArgs.json || (ioArgs.scriptLoaded && !ioArgs.args.checkString)){
				return true;
			}

			//Check for finished "checkString" case.
			var checkString = ioArgs.args.checkString;
			return checkString && eval("typeof(" + checkString + ") != 'undefined'");


		},

		_resHandle: function(/*Deferred*/ dfd){
			// summary:
			//		inflight function to handle a completed response.
			if(script._ioCheck(dfd)){
				dfd.callback(dfd);
			}else{
				//This path should never happen since the only way we can get
				//to _resHandle is if _ioCheck is true.
				dfd.errback(new Error("inconceivable dojo.io.script._resHandle error"));
			}
		},

		_canAttach: function(/*===== ioArgs =====*/ ){
			// summary:
			//		A method that can be overridden by other modules
			//		to control when the script attachment occurs.
			// ioArgs: Object
			return true;
		},

		_jsonpCallback: function(/*JSON Object*/ json){
			// summary:
			//		generic handler for jsonp callback. A pointer to this function
			//		is used for all jsonp callbacks.  NOTE: the "this" in this
			//		function will be the Deferred object that represents the script
			//		request.
			this.ioArgs.json = json;
			if(this.ioArgs.requestId){
				kernel.global[_script._callbacksProperty][this.ioArgs.requestId](json);
			}
		}
	};

	lang.setObject("dojo.io.script", script);

	/*=====
	script.attach = function(id, url, frameDocument){
		// summary:
		//		creates a new `<script>` tag pointing to the specified URL and
		//		adds it to the document.
		// description:
		//		Attaches the script element to the DOM. Use this method if you
		//		just want to attach a script to the DOM and do not care when or
		//		if it loads.
	};
	script.remove = function(id, frameDocument){
		// summary:
		//		removes the script element with the given id, from the given frameDocument.
		//		If no frameDocument is passed, the current document is used.
	};
	=====*/

	return script;
});

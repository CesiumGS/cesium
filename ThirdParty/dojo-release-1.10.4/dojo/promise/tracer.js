define([
	"../_base/lang",
	"./Promise",
	"../Evented"
], function(lang, Promise, Evented){
	"use strict";

	// module:
	//		dojo/promise/tracer

	/*=====
	return {
		// summary:
		//		Trace promise fulfillment.
		// description:
		//		Trace promise fulfillment. Calling `.trace()` or `.traceError()` on a
		//		promise enables tracing. Will emit `resolved`, `rejected` or `progress`
		//		events.

		on: function(type, listener){
			// summary:
			//		Subscribe to traces.
			// description:
			//		See `dojo/Evented#on()`.
			// type: String
			//		`resolved`, `rejected`, or `progress`
			// listener: Function
			//		The listener is passed the traced value and any arguments
			//		that were used with the `.trace()` call.
		}
	};
	=====*/

	var evented = new Evented;
	var emit = evented.emit;
	evented.emit = null;
	// Emit events asynchronously since they should not change the promise state.
	function emitAsync(args){
		setTimeout(function(){
			emit.apply(evented, args);
		}, 0);
	}

	Promise.prototype.trace = function(){
		// summary:
		//		Trace the promise.
		// description:
		//		Tracing allows you to transparently log progress,
		//		resolution and rejection of promises, without affecting the
		//		promise itself. Any arguments passed to `trace()` are
		//		emitted in trace events. See `dojo/promise/tracer` on how
		//		to handle traces.
		// returns: dojo/promise/Promise
		//		The promise instance `trace()` is called on.

		var args = lang._toArray(arguments);
		this.then(
			function(value){ emitAsync(["resolved", value].concat(args)); },
			function(error){ emitAsync(["rejected", error].concat(args)); },
			function(update){ emitAsync(["progress", update].concat(args)); }
		);
		return this;
	};

	Promise.prototype.traceRejected = function(){
		// summary:
		//		Trace rejection of the promise.
		// description:
		//		Tracing allows you to transparently log progress,
		//		resolution and rejection of promises, without affecting the
		//		promise itself. Any arguments passed to `trace()` are
		//		emitted in trace events. See `dojo/promise/tracer` on how
		//		to handle traces.
		// returns: dojo/promise/Promise
		//		The promise instance `traceRejected()` is called on.

		var args = lang._toArray(arguments);
		this.otherwise(function(error){
			emitAsync(["rejected", error].concat(args));
		});
		return this;
	};

	return evented;
});

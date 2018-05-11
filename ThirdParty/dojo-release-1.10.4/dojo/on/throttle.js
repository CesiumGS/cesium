define(['../throttle', '../on'], function(throttle, on){
	// summary:
	//		This module provides an event throttler for dojo/on
	// module:
	//		dojo/on/throttle

	return function(selector, delay){
		// summary:
		//		event parser for custom events
		// selector: String
		//		The selector to check against
		// delay: Interger
		//		The amount of ms before testing the selector

		return function(node, listenerFnc){
			return on(node, selector, throttle(listenerFnc, delay));
		};
	};
});

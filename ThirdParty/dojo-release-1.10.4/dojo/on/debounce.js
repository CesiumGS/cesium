define(['../debounce', '../on', './asyncEventListener'], function(debounce, on, asyncEventListener){
	// summary:
	//		This module provides an event debouncer for dojo/on
	// module:
	//		dojo/on/debounce

	return function(selector, delay){
		// summary:
		//		event parser for custom events
		// selector: String
		//		The selector to check against
		// delay: Interger
		//		The amount of ms before testing the selector

		return function(node, listenerFnc){
			return on(node, selector, asyncEventListener(debounce(listenerFnc, delay)));
		};
	};
});

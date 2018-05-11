define([], function(){
	// module:
	//		dojo/debounce
	// summary:
	//		This module provide a debouncer

	return function(cb, wait){
		// summary:
		//		Create a function that will only execute after `wait` milliseconds
		// description:
		//		Create a function that will only execute after `wait` milliseconds
		//		of repeated execution. Useful for delaying some event action slightly to allow
		//		for rapidly-firing events such as window.resize, node.mousemove and so on.
		// cb: Function
		//		A callback to fire. Like hitch() and partial(), arguments passed to the
		//		returned function curry along to the original callback.
		// wait: Integer
		//		Time to spend caching executions before actually executing.
		var timer;
		return function(){
			if(timer){
				clearTimeout(timer);
			}
			var self = this;
			var a = arguments;
			timer = setTimeout(function(){
				cb.apply(self, a);
			}, wait);
		};
	};
});

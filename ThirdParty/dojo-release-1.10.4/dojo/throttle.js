define([], function(){
	// module:
	//		dojo/throttle
	// summary:
	//		This module provide a throttler

	return function(cb, wait){
		// summary:
		//		Create a function that will only execute once per `wait` periods.
		// description:
		//		Create a function that will only execute once per `wait` periods
		//		from last execution when called repeatedly. Useful for preventing excessive
		//		calculations in rapidly firing events, such as window.resize, node.mousemove
		//		and so on.
		// cb: Function
		//		The callback to fire.
		// wait: Integer
		//		time to delay before allowing cb to call again.
		var canrun = true;
		return function(){
			if(!canrun){
				return;
			}
			canrun = false;
			cb.apply(this, arguments);
			setTimeout(function(){
				canrun = true;
			}, wait);
		};
	};
});

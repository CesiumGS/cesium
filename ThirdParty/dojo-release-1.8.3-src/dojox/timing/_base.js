define(["dojo/_base/kernel", "dojo/_base/lang"], function(dojo){
	dojo.experimental("dojox.timing");
	dojo.getObject("timing", true, dojox);

	dojox.timing.Timer = function(/*int*/ interval){
		// summary:
		//		Timer object executes an "onTick()" method repeatedly at a specified interval.
		//		repeatedly at a given interval.
		// interval:
		//		Interval between function calls, in milliseconds.
		this.timer = null;
		this.isRunning = false;
		this.interval = interval;

		this.onStart = null;
		this.onStop = null;
	};

	dojo.extend(dojox.timing.Timer, {
		onTick: function(){
			// summary:
			//		Method called every time the interval passes.  Override to do something useful.
		},
			
		setInterval: function(interval){
			// summary:
			//		Reset the interval of a timer, whether running or not.
			// interval:
			//		New interval, in milliseconds.
			if (this.isRunning){
				window.clearInterval(this.timer);
			}
			this.interval = interval;
			if (this.isRunning){
				this.timer = window.setInterval(dojo.hitch(this, "onTick"), this.interval);
			}
		},
		
		start: function(){
			// summary:
			//		Start the timer ticking.
			// description:
			//		Calls the "onStart()" handler, if defined.
			//		Note that the onTick() function is not called right away,
			//		only after first interval passes.
			if (typeof this.onStart == "function"){
				this.onStart();
			}
			this.isRunning = true;
			this.timer = window.setInterval(dojo.hitch(this, "onTick"), this.interval);
		},
		
		stop: function(){
			// summary:
			//		Stop the timer.
			// description:
			//		Calls the "onStop()" handler, if defined.
			if (typeof this.onStop == "function"){
				this.onStop();
			}
			this.isRunning = false;
			window.clearInterval(this.timer);
		}
	});
	return dojox.timing;
});

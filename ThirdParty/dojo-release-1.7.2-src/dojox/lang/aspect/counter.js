dojo.provide("dojox.lang.aspect.counter");

(function(){
	var aop = dojox.lang.aspect;
	
	var Counter = function(){
		this.reset();
	};
	dojo.extend(Counter, {
		before: function(/*arguments*/){
			++this.calls;
		},
		afterThrowing: function(/*excp*/){
			++this.errors;
		},
		reset: function(){
			this.calls = this.errors = 0;
		}
	});
	
	aop.counter = function(){
		// summary:
		//		Returns an object, which can be used to count calls to methods.
	
		return new Counter;	// Object
	};
})();
dojo.provide("dojox.lang.aspect.tracer");

(function(){
	var aop = dojox.lang.aspect;
	
	var Tracer = function(/*Boolean*/ grouping){
		this.method   = grouping ? "group" : "log";
		if(grouping){
			this.after = this._after;
		}
	};
	dojo.extend(Tracer, {
		before: function(/*arguments*/){
			var context = aop.getContext(), joinPoint = context.joinPoint,
				args = Array.prototype.join.call(arguments, ", ");
			console[this.method](context.instance, "=>", joinPoint.targetName + "(" + args + ")");
		},
		afterReturning: function(retVal){
			var joinPoint = aop.getContext().joinPoint;
			if(typeof retVal != "undefined"){
				console.log(joinPoint.targetName + "() returns:", retVal);
			}else{
				console.log(joinPoint.targetName + "() returns");
			}
		},
		afterThrowing: function(excp){
			console.log(aop.getContext().joinPoint.targetName + "() throws:", excp);
		},
		_after: function(excp){
			console.groupEnd();
		}
	});
	
	aop.tracer = function(/*Boolean*/ grouping){
		// summary:
		//		Returns an object, which can be used to trace calls with Firebug's console.
		//		Prints argument, a return value, or an exception.
		//
		// grouping:
		//		The flag to group output. If true, indents embedded console messages.
	
		return new Tracer(grouping);	// Object
	};
})();
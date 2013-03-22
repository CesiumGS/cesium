dojo.provide("dojox.lang.oo.Decorator");

(function(){
	var oo = dojox.lang.oo,

	D = oo.Decorator = function(value, decorator){
		// summary:
		//		The base class for all decorators.
		// description:
		//		This object holds an original function or another decorator
		//		object, and implements a special mixin algorithm to be used
		//		by dojox.lang.oo.mixin.
		// value: Object
		//		a payload to be processed by the decorator.
		// decorator: Function|Object
		//		a function to handle the custom assignment, or an object with exec()
		//		method. The signature is:
		//		decorator(/*String*/ name, /*Function*/ newValue, /*Function*/ oldValue).
		this.value  = value;
		this.decorator = typeof decorator == "object" ?
			function(){ return decorator.exec.apply(decorator, arguments); } : decorator;
	};

	oo.makeDecorator = function(decorator){
		// summary:
		//		creates new custom decorator creator
		// decorator: Function|Object
		//		a function to handle the custom assignment,
		//		or an object with exec() method
		// returns: Function
		//		new decorator constructor
		return function(value){
			return new D(value, decorator);
		};
	};
})();

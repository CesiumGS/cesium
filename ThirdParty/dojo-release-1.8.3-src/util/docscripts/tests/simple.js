dojo.provide("util.docscripts.tests.simple");
/*=====
	util.docscripts.tests.simple = {
		// summary: Module level summary
	};
=====*/
dojo.require("dojo.cookie");
(function(d, $){
	
	d.thisIsAtestFunction = function(/* String */a){
		// summary: Testing a function
		// a: String
		//		Testing a string parameter
		return a.toUpperCase(); // String
	}
	
	d.testFunction2 = function(/* String? */id){
		// summary: Simple summary
		// description:
		//		Simple Description.
		//		On Multiple lines.
		// id: String?
		//		Duplicate matched in signature and in line
		// returns: String
		//		Whatever
		return (id || "").toUpperCase();
	}
	
	d.declare("dojo.FooBar", null, {
		// summary: A Class
		// description: A Class description
		// example:
		//	|	This is a test
		//
		// member: Integer
		//		Used for counting things
		member: 0,
		
		memberFn: function(a, b, c){
			// summary: A member function
			// a: String
			// b: String
			// c: Boolean?
			return 10; // Integer
		},
		
		constructor: function(args){
			// summary: The constructor.
			dojo.mixin(this, args);
		}
		
	});
	
	d.declare("dojo.FooBar2", dojo.FooBar, {
		// inheritance: String
		//		Checking declare mixins
		inheritance:"rules"
	});
	
	d.mixin(d, {
		
		// mixedValue: Integer
		//		External doc block, mixed
		mixedValue: 10,
		
		mixedFunction: function(a){
			// summary: From mixin
			// a: Integer?
			//		Some number or not
			return a * 10; // Integer
		}
	});
	
	d.extend(d.FooBar, {
		
		// extendedMember: Integer
		//		External doc block, extended
		extendedMember: 10,
		
		secondMember: function(a, b, c){
			// summary: Another member function
			// a: String?
			// b: String?
			// c: Boolean?
			// returns: String
			//		Some return description text.
			return "Hello, World";
		}
	});
	
	/*=====
	util.docscripts.tests.simple.__kwArgs = function(a, b, c){
		// summary: Simple kwarg definition
		// a: String
		// b: Integer
		// c: Boolean?
		this.a = a;
		this.b = b;
		this.c = c;
	};
	=====*/
	
	d.kwArgFunction = function(/* util.docscripts.tests.simple.__kwArgs */args){
		// summary: kwarg function test
		// returns: String
		return "winning.";
	}
	
	$.stub = function(a, b){
		// summary: aliased to `dojo.query`
		return a * b; // Integer
	}
	
	d.returner = function(a){
		// summary: Simple returner check
		// a: String|Integer
		//		Multiple types for param
		// returns: String|Integer
		//		This should be description
		return a; 
	}
	
	d.multiReturns = function(a){
		// summary: Simple multireturn check
		if(a > 10){
			return "A"; // String
		}else{
			return 10; // Integer
		}
	}
	
})(dojo, dojo.query);
define("util/docscripts/tests/declare_amd", ["dojo", "dijit", "dijit/_Widget"], function(dojo, dijit){

	dojo.declare("foo.Bar", [dijit._Widget], { // util.docscripts.tests.declare_amd
		// summary: A Thinger
		// description: Some Long Thinger
		// 
		// boo: Integer
		boo: 10,
		
		constructor: function(args){
			// summary: The constructor
			dojo.mixin(this, args);
		},
		
		aMemberFn: function(/* String? */a){
			// summary: Does something
			// a: String?
			//		Foo.
			return a || ""; // String
		},
		
		postCreate: function(){
			this.inherited(arguments);
			this.boo *= 2;
		}
		
	});
	
	return foo.Bar;
});
	

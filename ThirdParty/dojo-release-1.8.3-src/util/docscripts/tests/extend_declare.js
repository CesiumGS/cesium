define(["dojo/main", "dojo/_base/declare", "dojo/_base/lang", "dijit", "dijit/_Widget"], function(dojo, decalre, lang, dijit, _Widget){

	/*===== var _Widget = dijit._Widget =====*/

	var x = declare("dojo.BarBaz", [_Widget], { // util.docscripts.tests.declare_amd
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
	
	lang.extend(dojo.BarBaz, {
		// someProp: String
		someProp: "test",
		
		anotherFn: function(/* String? */b){
			// summary: Another Function
			return 10; // Integer
		}
	})
	
	lang.mixin(dojo.BarBaz.prototype, {
		// moreProps: String
		//		Some more props.
		moreProps: "winning"
	})
	
	var omg = lang.extend;
	
	omg(dojo.BarBaz, {
		// winning: Boolean
		//	Always true.
		winning: true
	});
	
	return x;
});
	

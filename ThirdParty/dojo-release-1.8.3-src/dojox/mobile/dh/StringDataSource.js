define([
	"dojo/_base/declare"
], function(declare){

	// module:
	//		dojox/mobile/dh/StringDataSource

	return declare("dojox.mobile.dh.StringDataSource", null, {
		// summary:
		//		A component that simply returns the given text.

		text: "",

		constructor: function(/*String*/ text){
			// summary:
			//		Creates a new instance of the class.
			this.text = text;
		},

		getData: function(){
			// summary:
			//		Returns the given text.			
			return this.text;
		}
	});
});

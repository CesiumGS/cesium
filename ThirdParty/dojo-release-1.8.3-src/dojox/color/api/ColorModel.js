define(["dojo/_base/declare"], 
	function(declare){
	
	return declare("dojox.color.api.ColorModel", null, {
		// summary:
		//		API for classes that implement a color model that returns a color from a data value.
		
		constructor: function(){
			// summary:
			//		Constructor.
		},
	
		initialize: function(items, colorFunc){
			// summary:
			//		Optionally initialize the color model from a list of data items and using a function
			//		that returns the value used to compute the color for a given item.
			// items: Object[]
			//		The data items. 
			// colorFunc: Function
			//		The function that returns the value used to compute the color for particular data item.			
		},
	
		getColor: function(value){
			// summary:
			//		return the color for a given data value.
			// value: Number
			//		The data value. 			
		}
	});
});

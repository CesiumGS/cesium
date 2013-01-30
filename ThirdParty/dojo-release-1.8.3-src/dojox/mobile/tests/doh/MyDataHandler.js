define([
	"dojo/_base/declare",
	"dojox/mobile/dh/DataHandler"
], function(declare, DataHandler){

	// module:
	//		dojox/mobile/tests/doh/MyDataHandler
	// summary:

	return declare("dojox.mobile.tsets.doh.DataHandler", DataHandler, {

		constructor: function(){
			console.log("This is MyDataHandler");
			window._MyDataHandlerFlag = true;
			this.inherited(arguments);
		}
	});
});
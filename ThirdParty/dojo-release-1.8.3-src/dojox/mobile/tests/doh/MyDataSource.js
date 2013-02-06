define([
	"dojo/_base/declare",
	"dojox/mobile/dh/UrlDataSource"
], function(declare, UrlDataSource){

	return declare("dojox.mobile.tests.doh.MyDataSource", UrlDataSource, {
		constructor: function(){
			console.log("This is MyDataSource");
			window._MyDataSourceFlag = true;
			this.inherited(arguments);
		}
	});
});

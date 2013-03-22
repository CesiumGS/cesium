define([
	"dojo/_base/declare",
	"dojox/data/JsonRestStore", "dojox/data/util/JsonQuery", "dojox/data/ClientFilter",
	"dojox/json/query"
], function(declare, JsonRestStore, JsonQuery) {

// summary:
//		this is an extension of JsonRestStore to convert object attribute queries to
//		JSONQuery/JSONPath syntax to be sent to the server. This also enables
//		SONQuery/JSONPath queries to be performed locally if dojox.data.ClientFilter
//		has been loaded

return declare("dojox.data.JsonQueryRestStore",[JsonRestStore, JsonQuery],{
	matchesQuery: function(item,request){
		return item.__id && (item.__id.indexOf("#") == -1) && this.inherited(arguments);
	}
});


});

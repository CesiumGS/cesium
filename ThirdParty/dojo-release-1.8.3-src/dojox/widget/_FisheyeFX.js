define([
	"dojo/_base/declare",
	"dojo/query",
	// TODO: FisheyeLite still needs AMD conversion
	"./FisheyeLite"
], function(declare, query, FisheyeLite) {

	return declare("dojox.widget._FisheyeFX", null, {
		// summary:
		//		A mixin to add a FisheyeLite effect to the calendar
		addFx: function(theQuery, fromNode) {
			//Use the query and base node passed from the calendar view mixin
			//to select the nodes to attach the event to.
			query(theQuery, fromNode).forEach(function(node){
				new FisheyeLite({
					properties: {
						fontSize: 1.1
					}
				}, node);
			});
		}
	});
});

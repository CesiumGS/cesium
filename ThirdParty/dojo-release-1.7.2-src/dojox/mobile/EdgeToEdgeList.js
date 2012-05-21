define([
	"dojo/_base/declare",
	"./RoundRectList"
], function(declare, RoundRectList){

/*=====
	var RoundRectList = dojox.mobile.RoundRectList;
=====*/

	// module:
	//		dojox/mobile/EdgeToEdgeCategory
	// summary:
	//		An edge-to-edge layout list.

	return declare("dojox.mobile.EdgeToEdgeList", RoundRectList, {
		// summary:
		//		An edge-to-edge layout list.
		// description:
		//		EdgeToEdgeList is an edge-to-edge layout list, which displays
		//		all items in equally sized rows. Each item must be
		//		dojox.mobile.ListItem.

		buildRendering: function(){
			this.inherited(arguments);
			this.domNode.className = "mblEdgeToEdgeList";
		}
	});
});

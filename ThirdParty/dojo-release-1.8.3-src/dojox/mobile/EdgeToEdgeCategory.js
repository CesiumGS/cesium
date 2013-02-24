define([
	"dojo/_base/declare",
	"./RoundRectCategory"
], function(declare, RoundRectCategory){

	// module:
	//		dojox/mobile/EdgeToEdgeCategory

	return declare("dojox.mobile.EdgeToEdgeCategory", RoundRectCategory, {
		// summary:
		//		A category header for an edge-to-edge list.
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode.className = "mblEdgeToEdgeCategory";
		}
	});
});

define([
	"dojo/_base/declare",
	"dojo/dom-class",
	"./Container"
], function(declare, domClass, Container){

	// module:
	//		dojox/mobile/RoundRect

	return declare("dojox.mobile.RoundRect", Container, {
		// summary:
		//		A simple round rectangle container.
		// description:
		//		RoundRect is a simple round rectangle container for any HTML
		//		and/or widgets. You can achieve the same appearance by just
		//		applying the -webkit-border-radius style to a div tag. However,
		//		if you use RoundRect, you can get a round rectangle even on
		//		non-CSS3 browsers such as (older) IE.

		// shadow: Boolean
		//		If true, adds a shadow effect to the container element.
		shadow: false,

		/* internal properties */	
		
		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblRoundRect",

		buildRendering: function(){
			this.inherited(arguments);
			if(this.shadow){
				domClass.add(this.domNode, "mblShadow");
			}
		}
	});
});

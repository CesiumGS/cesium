define(["dojo/_base/lang"],function(lang){
var fxArg = lang.getObject("dojox.fx._arg",true);
fxArg.StyleArgs = function(/*Object*/ args){
	// summary:
	//		The node and CSS class to use for style manipulations.
	// node: DOMNode
	//		The node to manipulate
	// cssClass: String
	//		The class to use during the manipulation
	this.node = args.node;
	this.cssClass = args.cssClass;
}

fxArg.ShadowResizeArgs = function(/*Object*/ args){
	// summary:
	//	The odd way to document object parameters.
	// x: Integer
	//	the width to set
	// y: Integer
	//	the height to set
	this.x = args.x;
	this.y = args.y;
}
return fxArg;
});
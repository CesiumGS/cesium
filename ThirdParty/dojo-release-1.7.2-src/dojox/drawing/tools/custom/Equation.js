dojo.provide("dojox.drawing.tools.custom.Equation");
dojo.require("dojox.drawing.tools.TextBlock");

dojox.drawing.tools.custom.Equation = dojox.drawing.util.oo.declare(
	// summary:
	//		Essentially the same as the TextBlock tool, but
	//		allows for a different icon and tooltip title.
	//
	dojox.drawing.tools.TextBlock,
	function(options){
	
	},
	{
		customType:"equation"
	}
	
);

dojox.drawing.tools.custom.Equation.setup = {
	// summary: See stencil._Base ToolsSetup
	//
	name:"dojox.drawing.tools.custom.Equation",
	tooltip:"Equation Tool",
	iconClass:"iconEq"
};
dojox.drawing.register(dojox.drawing.tools.custom.Equation.setup, "tool");
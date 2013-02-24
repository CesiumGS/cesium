define(["dojo/_base/lang", "../../util/oo", "../../manager/_registry", "../TextBlock"],
function(lang, oo, registry, TextBlock){

var Equation = oo.declare(
	// summary:
	//		Essentially the same as the TextBlock tool, but
	//		allows for a different icon and tooltip title.

	TextBlock,
	function(options){
	
	},
	{
		customType:"equation"
	}
	
);

lang.setObject("dojox.drawing.tools.custom.Equation", Equation);
Equation.setup = {
	// summary:
	//		See stencil._Base ToolsSetup

	name:"dojox.drawing.tools.custom.Equation",
	tooltip:"Equation Tool",
	iconClass:"iconEq"
};
registry.register(Equation.setup, "tool");

return Equation;
});

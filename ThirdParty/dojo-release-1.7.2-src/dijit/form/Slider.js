define([
	"dojo/_base/kernel", // kernel.deprecated
	"./HorizontalSlider",
	"./VerticalSlider",
	"./HorizontalRule",
	"./VerticalRule",
	"./HorizontalRuleLabels",
	"./VerticalRuleLabels"
], function(kernel){

	// module:
	//		dijit/form/Slider
	// summary:
	//		Rollup of all the the Slider related widgets
	//		For back-compat, remove for 2.0

	kernel.deprecated("Call require() for HorizontalSlider / VerticalRule, explicitly rather than 'dijit.form.Slider' itself", "", "2.0");
});

define([
	"dojo/_base/declare",
	"dijit/form/_ExpandingTextAreaMixin",
	"./TextArea"
], function(declare, ExpandingTextAreaMixin, TextArea){

	/*=====
		TextArea = dojox.mobile.TextArea;
		ExpandingTextAreaMixin = dijit.form._ExpandingTextAreaMixin;
	=====*/
	return declare("dojox.mobile.ExpandingTextArea", [TextArea, ExpandingTextAreaMixin], {
		// summary:
		//		Non-templated TEXTAREA widget with the capability to adjust it's height according to the amount of data.
		//
		// description:
		//		A textarea that dynamically expands/contracts (changing it's height) as
		//		the user types, to display all the text without requiring a vertical scroll bar.
		//
		//		Takes all the parameters (name, value, etc.) that a vanilla textarea takes.
		//		Rows is not supported since this widget adjusts the height.
		//
		// example:
		// |	<textarea dojoType="dojox.mobile.ExpandingTextArea">...</textarea>

		baseClass: "mblTextArea mblExpandingTextArea"
	});
});

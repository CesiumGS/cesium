define([
	"dojo/_base/kernel",
	"dojo/dom-style",
	"dojox/widget/Calendar",
	"dijit/form/_DateTimeTextBox",
	"dojo/_base/declare"
	], function(kernel, domStyle, Calendar, _DateTimeTextBox, declare){
	kernel.experimental("dojox/form/DateTextBox");
	return declare( "dojox.form.DateTextBox", _DateTimeTextBox,
		{
			// summary:
			//		A validating, serializable, range-bound date text box with a popup calendar

			// popupClass: String
			//		The popup widget to use. In this case, a calendar with Day, Month and Year views.
			popupClass: Calendar,

			_selector: "date",

			openDropDown: function(){
				this.inherited(arguments);
				domStyle.set(this.dropDown.domNode.parentNode, "position", "absolute");
			}
		}
	);
});

define([
	"dojo/_base/declare", // declare
	"../Calendar",
	"./_DateTimeTextBox"
], function(declare, Calendar, _DateTimeTextBox){

/*=====
	var Calendar = dijit.Calendar;
	var _DateTimeTextBox = dijit.form._DateTimeTextBox;
=====*/

	// module:
	//		dijit/form/DateTextBox
	// summary:
	//		A validating, serializable, range-bound date text box with a drop down calendar


	return declare("dijit.form.DateTextBox", _DateTimeTextBox, {
		// summary:
		//		A validating, serializable, range-bound date text box with a drop down calendar
		//
		//		Example:
		// |	new dijit.form.DateTextBox({value: new Date(2009, 0, 20)})
		//
		//		Example:
		// |	<input data-dojo-type='dijit.form.DateTextBox' value='2009-01-20'>

		baseClass: "dijitTextBox dijitComboBox dijitDateTextBox",
		popupClass: Calendar,
		_selector: "date",

		// value: Date
		//		The value of this widget as a JavaScript Date object, with only year/month/day specified.
		//		If specified in markup, use the format specified in `stamp.fromISOString`.
		//		set("value", ...) accepts either a Date object or a string.
		value: new Date("")	// value.toString()="NaN"
	});
});

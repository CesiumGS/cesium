define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojox/widget/DailyCalendar",
	"dijit/form/TextBox",
	"./DateTextBox",
	"dojo/_base/declare"
	], function(kernel, lang, DailyCalendar, TextBox, DateTextBox, declare){
		kernel.experimental("dojox/form/DayTextBox");
	return declare("dojox.form.DayTextBox", DateTextBox,
		{
			// summary:
			//		A validating, serializable, range-bound date text box with a popup calendar that contains just months.

			// popupClass: String
			//		The popup widget to use. In this case, a calendar with just a Month view.
			popupClass: DailyCalendar,

			parse: function(displayVal){
				return displayVal;
			},

			format: function(value){
				return value.getDate ? value.getDate() : value;
			},
			validator: function(value){
				var num = Number(value);
				var isInt = /(^-?\d\d*$)/.test(String(value));
				return value == "" || value == null || (isInt && num >= 1 && num <= 31);
			},

			_setValueAttr: function(value, priorityChange, formattedValue){
				if(value){
					if(value.getDate){
						value = value.getDate();
					}
				}
				TextBox.prototype._setValueAttr.call(this, value, priorityChange, formattedValue);
			},

			openDropDown: function(){
				this.inherited(arguments);

				this.dropDown.onValueSelected = lang.hitch(this, function(value){
					this.focus(); // focus the textbox before the popup closes to avoid reopening the popup
					setTimeout(lang.hitch(this, "closeDropDown"), 1); // allow focus time to take

					TextBox.prototype._setValueAttr.call(this, String(value.getDate()), true, String(value.getDate()));
				});
			}
		});
});

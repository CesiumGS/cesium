define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojox/widget/MonthlyCalendar",
	"dijit/form/TextBox",
	"./DateTextBox",
	"dojo/_base/declare"
	], function(kernel, lang, MonthlyCalendar, TextBox, DateTextBox, declare){
		kernel.experimental("dojox/form/DateTextBox");
		return declare( "dojox.form.MonthTextBox", DateTextBox,
		{
			// summary:
			//		A validating, serializable, range-bound date text box with a popup calendar that contains only months

			// popupClass: String
			//		The popup widget to use. In this case, a calendar with just a Month view.
			popupClass: MonthlyCalendar,

			selector: "date",

			postMixInProperties: function(){
				this.inherited(arguments);
				this.constraints.datePattern = "MM";
			},

			format: function(value){
				if(!value && value !== 0){
					return 1;
				}
				if(value.getMonth){
					return value.getMonth() + 1;
				}
				return Number(value) + 1;
			},

			parse: function(value, constraints){
				return Number(value) - 1;
			},

			serialize: function(value, constraints){
				return String(value);
			},

			validator: function(value){
				var num = Number(value);
				var isInt = /(^-?\d\d*$)/.test(String(value));
				return value == "" || value == null || (isInt && num >= 1 && num <= 12);
			},

			_setValueAttr: function(value, priorityChange, formattedValue){
				if(value){
					if(value.getMonth){
						value = value.getMonth();
					}
				}
				TextBox.prototype._setValueAttr.call(this, value, priorityChange, formattedValue);
			},

			openDropDown: function(){
				this.inherited(arguments);

				this.dropDown.onValueSelected = lang.hitch(this, function(value){
					this.focus(); // focus the textbox before the popup closes to avoid reopening the popup
					setTimeout(lang.hitch(this, "closeDropDown"), 1); // allow focus time to take
					TextBox.prototype._setValueAttr.call(this, value, true, value);
				});
			}
		});
});
define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojox/widget/YearlyCalendar",
	"dijit/form/TextBox",
	"./DateTextBox",
	"dojo/_base/declare"
	], function(kernel, lang, YearlyCalendar, TextBox, DateTextBox, declare){
		kernel.experimental("dojox/form/DateTextBox");
		return declare("dojox.form.YearTextBox", DateTextBox,
		{
			// summary:
			//		A validating, serializable, range-bound date text box with a popup calendar that contains only years

			popupClass: YearlyCalendar,

			format: function(value){
				//console.log('Year format ' + value);
				if(typeof value == "string"){
					return value;
				}
				else if(value.getFullYear){
					return value.getFullYear();
				}
				return value;
			},

			validator: function(value){
				return value == "" || value == null || /(^-?\d\d*$)/.test(String(value));
			},

			_setValueAttr: function(value, priorityChange, formattedValue){
				if(value){
					if(value.getFullYear){
						value = value.getFullYear();
					}
				}
				TextBox.prototype._setValueAttr.call(this, value, priorityChange, formattedValue);
			},

			openDropDown: function(){
				this.inherited(arguments);
				//console.log('yearly openDropDown and value = ' + this.get('value'));

				this.dropDown.onValueSelected = lang.hitch(this, function(value){
					this.focus(); // focus the textbox before the popup closes to avoid reopening the popup
					setTimeout(lang.hitch(this, "closeDropDown"), 1); // allow focus time to take
					TextBox.prototype._setValueAttr.call(this,value, true, value);
				});
			},

			parse: function(/*String*/ value, /*dojo.date.locale.__FormatOptions*/ constraints){
				return value || (this._isEmpty(value) ? null : undefined); // Date
			},

			filter: function(val){
				if(val && val.getFullYear){
					return val.getFullYear().toString();
				}
				return this.inherited(arguments);
			}
		});
});

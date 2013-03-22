define([
	"dojo/_base/declare",
	"dojo/dom-class",
	"dojo/date/locale"
], function(declare, domClass, datelocale){

	// module:
	//		dojox/mobile/_TimePickerMixin

	return declare("dojox.mobile._TimePickerMixin", null, {
		// summary:
		//		A mixin for time picker widget.

		/*=====
		// date: Date
		//		A Date object corresponding to the current values of the picker.
		date: null,
		=====*/
		
		reset: function(){
			// summary:
			//		Goes to now. Resets the hour and minutes to the current time.
			var now = new Date(),
				h = now.getHours() + "",
				m = now.getMinutes();
			m = (m < 10 ? "0" : "") + m;
			this.set("colors", [h, m]);
			if(this.values){
				this.set("values", this.values);
				this.values = null;
			}else if(this.values12){
				this.set("values12", this.values12);
				this.values12 = null;
			}else{
				this.set("values", [h, m]);
			}
		},

		_getDateAttr: function(){
			// summary:
			//		Returns a Date object for the current values.
			// tags:
			//		private
			var v = this.get("values"); // [hour24, minute]
			return datelocale.parse(v[0] + ":" + v[1], {timePattern:"H:m", selector:"time"});
		}
	});
});

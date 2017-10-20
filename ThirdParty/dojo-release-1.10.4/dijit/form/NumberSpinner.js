define([
	"dojo/_base/declare", // declare
	"dojo/keys", // keys.END keys.HOME
	"./_Spinner",
	"./NumberTextBox"
], function(declare, keys, _Spinner, NumberTextBox){

	// module:
	//		dijit/form/NumberSpinner

	return declare("dijit.form.NumberSpinner", [_Spinner, NumberTextBox.Mixin], {
		// summary:
		//		Extends NumberTextBox to add up/down arrows and pageup/pagedown for incremental change to the value
		//
		// description:
		//		A `dijit/form/NumberTextBox` extension to provide keyboard accessible value selection
		//		as well as icons for spinning direction. When using the keyboard, the typematic rules
		//		apply, meaning holding the key will gradually increase or decrease the value and
		//		accelerate.
		//
		// example:
		//	| new NumberSpinner({ constraints:{ max:300, min:100 }}, "someInput");

		baseClass: "dijitTextBox dijitSpinner dijitNumberTextBox",

		adjust: function(/*Object*/ val, /*Number*/ delta){
			// summary:
			//		Change Number val by the given amount
			// tags:
			//		protected

			var tc = this.constraints,
				v = isNaN(val),
				gotMax = !isNaN(tc.max),
				gotMin = !isNaN(tc.min)
				;
			if(v && delta != 0){ // blank or invalid value and they want to spin, so create defaults
				val = (delta > 0) ?
					gotMin ? tc.min : gotMax ? tc.max : 0 :
					gotMax ? this.constraints.max : gotMin ? tc.min : 0
				;
			}
			var newval = val + delta;
			if(v || isNaN(newval)){
				return val;
			}
			if(gotMax && (newval > tc.max)){
				newval = tc.max;
			}
			if(gotMin && (newval < tc.min)){
				newval = tc.min;
			}
			return newval;
		},

		_onKeyDown: function(e){
			if(this.disabled || this.readOnly){
				return;
			}
			if((e.keyCode == keys.HOME || e.keyCode == keys.END) && !(e.ctrlKey || e.altKey || e.metaKey)
				&& typeof this.get('value') != 'undefined' /* gibberish, so HOME and END are default editing keys*/){
				var value = this.constraints[(e.keyCode == keys.HOME ? "min" : "max")];
				if(typeof value == "number"){
					this._setValueAttr(value, false);
				}
				// eat home or end key whether we change the value or not
				e.stopPropagation();
				e.preventDefault();
			}
		}
	});
});

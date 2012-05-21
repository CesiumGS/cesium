define([
	"dojo/_base/declare",
	"dojo/dom-class",
	"./SpinWheel",
	"./SpinWheelSlot"
], function(declare, domClass, SpinWheel, SpinWheelSlot){

/*=====
	var SpinWheel = dojox.mobile.SpinWheel;
=====*/

	// module:
	//		dojox/mobile/SpinWheelTimePicker
	// summary:
	//		A SpinWheel-based time picker widget.

	return declare("dojox.mobile.SpinWheelTimePicker", SpinWheel, {
		// summary:
		//		A SpinWheel-based time picker widget.
		// description:
		//		SpinWheelTimePicker is a time picker widget. It is a subclass of
		//		dojox.mobile.SpinWheel. It has the hour and minute slots.

		slotClasses: [
			SpinWheelSlot,
			SpinWheelSlot
		],
		slotProps: [
			{labelFrom:0, labelTo:23},
			{labels:["00","01","02","03","04","05","06","07","08","09",
					 "10","11","12","13","14","15","16","17","18","19",
					 "20","21","22","23","24","25","26","27","28","29",
					 "30","31","32","33","34","35","36","37","38","39",
					 "40","41","42","43","44","45","46","47","48","49",
					 "50","51","52","53","54","55","56","57","58","59"]}
		],

		buildRendering: function(){
			this.inherited(arguments);
			domClass.add(this.domNode, "mblSpinWheelTimePicker");
		},

		reset: function(){
			// summary:
			//		Goes to now.
			var slots = this.slots;
			var now = new Date();
			var _h = now.getHours() + "";
			slots[0].setValue(_h);
			slots[0].setColor(_h);
			var m = now.getMinutes();
			var _m = (m < 10 ? "0" : "") + m;
			slots[1].setValue(_m);
			slots[1].setColor(_m);
		}
	});
});

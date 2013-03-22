define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/dom-class",
	"./_DatePickerMixin",
	"./SpinWheel",
	"./SpinWheelSlot"
], function(array, declare, domClass, DatePickerMixin, SpinWheel, SpinWheelSlot){

	// module:
	//		dojox/mobile/SpinWheelDatePicker

	return declare("dojox.mobile.SpinWheelDatePicker", [SpinWheel, DatePickerMixin], {
		// summary:
		//		A SpinWheel-based date picker widget.
		// description:
		//		SpinWheelDatePicker is a date picker widget. It is a subclass of
		//		dojox/mobile/SpinWheel. It has three slots: year, month, and day.

		slotClasses: [
			SpinWheelSlot,
			SpinWheelSlot,
			SpinWheelSlot
		],

		slotProps: [
			{labelFrom:1970, labelTo:2038},
			{},
			{}
		],

		buildRendering: function(){
			this.initSlots();
			this.inherited(arguments);
			domClass.add(this.domNode, "mblSpinWheelDatePicker");
			this._conn = [
				this.connect(this.slots[0], "onFlickAnimationEnd", "onYearSet"),
				this.connect(this.slots[1], "onFlickAnimationEnd", "onMonthSet"),
				this.connect(this.slots[2], "onFlickAnimationEnd", "onDaySet")
			];
		},

		disableValues: function(/*Number*/nDays){
			// summary:
			//		Makes the specified items grayed out.
			array.forEach(this.slots[2].panelNodes, function(panel){
				for(var i = 27; i < 31; i++){
					domClass.toggle(panel.childNodes[i], "mblSpinWheelSlotLabelGray", i >= nDays);
				}
			});
		}
	});
});

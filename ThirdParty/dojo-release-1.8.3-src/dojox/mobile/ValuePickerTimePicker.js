define([
	"dojo/_base/declare",
	"dojo/dom-class",
	"./_TimePickerMixin",
	"./ToolBarButton",
	"./ValuePicker",
	"./ValuePickerSlot"
], function(declare, domClass, TimePickerMixin, ToolBarButton, ValuePicker, ValuePickerSlot){

	// module:
	//		dojox/mobile/ValuePickerTimePicker
	// summary:
	//		A ValuePicker-based time picker widget.

	return declare("dojox.mobile.ValuePickerTimePicker", [ValuePicker, TimePickerMixin], {
		// summary:
		//		A ValuePicker-based time picker widget.
		// description:
		//		ValuePickerTimePicker is a time picker widget. It is a subclass of
		//		dojox.mobile.ValuePicker. It has two slots: hour and minute.

		// readOnly: Boolean
		//		If true, slot input fields are read-only. Only the plus and
		//		minus buttons can be used to change the values.
		readOnly: false,

		// is24h: Boolean
		//		If true, the time is displayed in 24h format.
		//		Otherwise, displayed in AM/PM mode.
		is24h: false,

		// values: Array
		//		The time value, as an array in 24h format: [hour24, minute] (ex. ["22","06"]).
		//		Warning: Do not use this property directly, make sure to call set() or get() methods.
		/*=====
		values: null,
		=====*/

		// values12: Array
		//		The time value, as an array in 12h format: [hour12, minute, ampm] (ex. ["10","06","PM"]).
		//		Warning: Do not use this property directly, make sure to call set() or get() methods.
		/*=====
		values12: null,
		=====*/

		slotClasses: [
			ValuePickerSlot,
			ValuePickerSlot
		],

		slotProps: [
			{labelFrom:0, labelTo:23, style:{width:"72px"}},
			{labelFrom:0, labelTo:59, zeroPad:2, style:{width:"72px"}}
		],

		buildRendering: function(){
			var p = this.slotProps;
			p[0].readOnly = p[1].readOnly = this.readOnly;
			this.inherited(arguments);
			var items = this.slots[0].items;
			this._zero = items.slice(0, 1);
			this._pm = items.slice(13);

			domClass.add(this.domNode, "mblValuePickerTimePicker");
			domClass.add(this.slots[0].domNode, "mblValuePickerTimePickerHourSlot");
			domClass.add(this.slots[1].domNode, "mblValuePickerTimePickerMinuteSlot");

			this.ampmButton = new ToolBarButton();
			this.addChild(this.ampmButton);
			this._conn = [
				this.connect(this.ampmButton, "onClick", "onBtnClick")
			];
			this.set("is24h", this.is24h);
		},

		to12h: function(a){
			// summary:
			//		Converts a 24h time to a 12h time.
			// a: Array
			//		[hour24, minute] (ex. ["22","06"])
			// returns: Array
			//		[hour12, minute, ampm] (ex. ["10","06","PM"])
			// tags:
			//		private
			var h = a[0] - 0;
			var ampm = h < 12 ? "AM" : "PM";
			if(h == 0){
				h = 12;
			}else if(h > 12){
				h = h - 12;
			}
			return [h + "", a[1], ampm]; // [hour12, minute, ampm]
		},

		to24h: function(a){
			// summary:
			//		Converts a 12h time to a 24h time.
			// a: Array
			//		[hour12, minute, ampm] (ex. ["10","06","PM"])
			// returns: Array
			//		[hour24, minute] (ex. ["22","06"])
			// tags:
			//		private
			var h = a[0] - 0;
			if(a[2] == "AM"){
				h = h == 12 ? 0 : h; // 12AM is 0h
			}else{
				h = h == 12 ? h : h + 12; // 12PM is 12h
			}
			return [h + "", a[1]]; // [hour24, minute]
		},

		onBtnClick: function(e){
			// summary:
			//		The handler for the AM/PM button.
			var ampm = this.ampmButton.get("label") == "AM" ? "PM" : "AM";
			var v = this.get("values12");
			v[2] = ampm;
			this.set("values12", v);
		},

		_setIs24hAttr: function(/*Boolean*/is24h){
			// summary:
			//		Changes the time display mode, 24h or 12h.
			var items = this.slots[0].items;
			if(is24h && items.length != 24){ // 24h: 0 - 23
				this.slots[0].items = this._zero.concat(items).concat(this._pm);
			}else if(!is24h && items.length != 12){ // 12h: 1 - 12
				items.splice(0, 1);
				items.splice(12);
			}
			var v = this.get("values");
			this._set("is24h", is24h);
			this.ampmButton.domNode.style.display = is24h ? "none" : "";
			this.set("values", v);
		},

		_getValuesAttr: function(){
			// summary:
			//		Returns an array of hour and minute in 24h format.
			var v = this.inherited(arguments); // [hour, minute]
			return this.is24h ? v : this.to24h([v[0], v[1], this.ampmButton.get("label")]);
		},

		_setValuesAttr: function(/*Array*/values){
			// summary:
			//		Sets an array of hour and minute in 24h format.
			// values:
			//		[hour24, minute] (ex. ["22","06"])
			if(this.is24h){
				this.inherited(arguments);
			}else{
				values = this.to12h(values);
				this.ampmButton.set("label", values[2]);
				this.inherited(arguments);
			}
		},

		_getValues12Attr: function(){
			// summary:
			//		Returns an array of hour and minute in 12h format.
			return this.to12h(this._getValuesAttr());
		},

		_setValues12Attr: function(/*Array*/values){
			// summary:
			//		Sets an array of hour and minute in 12h format.
			// values:
			//		[hour12, minute, ampm] (ex. ["10","06","PM"])
			this.set("values", this.to24h(values));
		}
	});
});

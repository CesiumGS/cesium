define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/touch",
	"dijit/_WidgetBase",
	"./iconUtils"
], function(array, declare, event, lang, win, domClass, domConstruct, touch, WidgetBase, iconUtils){

	// module:
	//		dojox/mobile/ValuePickerSlot

	return declare("dojox.mobile.ValuePickerSlot", WidgetBase, {
		// summary:
		//		A widget representing one slot of a ValuePicker widget.
		
		// items: Array
		//		An array of array of key-label pairs.
		//		(e.g. [[0,"Jan"],[1,"Feb"],...] ) If key values for each label
		//		are not necessary, labels can be used instead.
		items: [],

		// labels: String[]
		//		An array of labels to be displayed on the value picker.
		//		(e.g. ["Jan","Feb",...] ) This is a simplified version of the
		//		items property.
		labels: [],

		// labelFrom: Number
		//		The start value of display values of the value picker. This
		//		parameter is especially useful when value picker has serial
		//		values.
		labelFrom: 0,

		// labelTo: Number
		//		The end value of display values of the value picker.
		labelTo: 0,

		// zeroPad: Number
		//		Length of zero padding numbers.
		//		Ex. zeroPad=2 -> "00", "01", ...
		//		Ex. zeroPad=3 -> "000", "001", ...
		zeroPad: 0,

		// value: String
		//		The initial value of the value picker.
		value: "",

		// step: Number
		//		The steps between labelFrom and labelTo.
		step: 1,

		// readOnly: Boolean
		//		A flag used to indicate if the input field is readonly or not.
		readOnly: false,

		// tabIndex: String
		//		Tabindex setting for this widget so users can hit the tab key to
		//		focus on it.
		tabIndex: "0",

		// key: Object
		//		The key of the currently selected value in the items array. This is a read-only property.
		//		Warning: Do not use this property directly, make sure to call the get() method.
		/*=====
		key: null,
		=====*/

		/* internal properties */	
		baseClass: "mblValuePickerSlot",

		buildRendering: function(){
			this.inherited(arguments);

			this.initLabels();
			if(this.labels.length > 0){
				this.items = [];
				for(i = 0; i < this.labels.length; i++){
					this.items.push([i, this.labels[i]]);
				}
			}

			this.plusBtnNode = domConstruct.create("div", {
				className: "mblValuePickerSlotPlusButton mblValuePickerSlotButton",
				title: "+"
			}, this.domNode);
			this.plusIconNode = domConstruct.create("div", {
				className: "mblValuePickerSlotIcon"
			}, this.plusBtnNode);
			iconUtils.createIcon("mblDomButtonGrayPlus", null, this.plusIconNode);

			this.inputAreaNode = domConstruct.create("div", {
				className: "mblValuePickerSlotInputArea"
			}, this.domNode);
			this.inputNode = domConstruct.create("input", {
				className: "mblValuePickerSlotInput",
				readonly: this.readOnly
			}, this.inputAreaNode);

			this.minusBtnNode = domConstruct.create("div", {
				className: "mblValuePickerSlotMinusButton mblValuePickerSlotButton",
				title: "-"
			}, this.domNode);
			this.minusIconNode = domConstruct.create("div", {
				className: "mblValuePickerSlotIcon"
			}, this.minusBtnNode);
			iconUtils.createIcon("mblDomButtonGrayMinus", null, this.minusIconNode);

			if(this.value === "" && this.items.length > 0){
				this.value = this.items[0][1];
			}
			this._initialValue = this.value;
		},

		startup: function(){
			if(this._started){ return; }
			this._handlers = [
				this.connect(this.plusBtnNode, touch.press, "_onTouchStart"),
				this.connect(this.minusBtnNode, touch.press, "_onTouchStart"),
				this.connect(this.plusBtnNode, "onkeydown", "_onClick"), // for desktop browsers
				this.connect(this.minusBtnNode, "onkeydown", "_onClick"), // for desktop browsers
				this.connect(this.inputNode, "onchange", lang.hitch(this, function(e){
					this._onChange(e);
				}))
			];
			this.inherited(arguments);
		},

		initLabels: function(){
			// summary:
			//		Initializes the labels of this slot according to the labelFrom and labelTo properties.
			// tags:
			//		private
			if(this.labelFrom !== this.labelTo){
				var a = this.labels = [],
					zeros = this.zeroPad && Array(this.zeroPad).join("0");
				for(var i = this.labelFrom; i <= this.labelTo; i += this.step){
					a.push(this.zeroPad ? (zeros + i).slice(-this.zeroPad) : i + "");
				}
			}
		},

		spin: function(/*Number*/steps){
			// summary:
			//		Spins the slot as specified by steps.

			// find the position of the current value
			var pos = -1,
				v = this.get("value"),
				len = this.items.length;
			for(var i = 0; i < len; i++){
				if(this.items[i][1] === v){
					pos = i;
					break;
				}
			}
			if(v == -1){ return; }
			pos += steps;
			if(pos < 0){ // shift to positive
				pos += (Math.abs(Math.ceil(pos / len)) + 1) * len;
			}
			var newItem = this.items[pos % len];
			this.set("value", newItem[1]);
		},

		setInitialValue: function(){
			// summary:
			//		Sets the initial value using this.value or the first item.
			this.set("value", this._initialValue);
		},

		_onClick: function(e){
			// summary:
			//		Internal handler for click events.
			// tags:
			//		private
			if(e && e.type === "keydown" && e.keyCode !== 13){ return; }
			if(this.onClick(e) === false){ return; } // user's click action
			var node = e.currentTarget;
			if(node === this.plusBtnNode || node === this.minusBtnNode){
				this._btn = node;
			}
			this.spin(this._btn === this.plusBtnNode ? 1 : -1);
		},

		onClick: function(/*Event*/ /*===== e =====*/){
			// summary:
			//		User defined function to handle clicks
			// tags:
			//		callback
		},

		_onChange: function(e){
			// summary:
			//		Internal handler for the input field's value change events
			// tags:
			//		callback
			if(this.onChange(e) === false){ return; } // user's click action
			var v = this.get("value"), // text in the input field
				a = this.validate(v);
			this.set("value", a.length ? a[0][1] : this.value);
		},

		onChange: function(/*Event*/ /*===== e =====*/){
			// summary:
			//		User defined function to handle value changes
			// tags:
			//		callback
		},

		validate: function(value){
			return array.filter(this.items, function(a){
				return (a[1] + "").toLowerCase() == (value + "").toLowerCase();
			});
		},

		_onTouchStart: function(e){
			this._conn = [
				this.connect(win.body(), touch.move, "_onTouchMove"),
				this.connect(win.body(), touch.release, "_onTouchEnd")
			];
			this.touchStartX = e.touches ? e.touches[0].pageX : e.clientX;
			this.touchStartY = e.touches ? e.touches[0].pageY : e.clientY;
			domClass.add(e.currentTarget, "mblValuePickerSlotButtonSelected");
			this._btn = e.currentTarget;
			if(this._timer){
				clearTimeout(this._timer); // fail safe
				this._timer = null;
			}
			if(this._interval){
				clearInterval(this._interval); // fail safe
				this._interval = null;
			}
			this._timer = setTimeout(lang.hitch(this, function(){
				this._interval = setInterval(lang.hitch(this, function(){
					this.spin(this._btn === this.plusBtnNode ? 1 : -1);
				}), 60);
				this._timer = null;
			}), 1000);
			event.stop(e);
		},

		_onTouchMove: function(e){
			var x = e.touches ? e.touches[0].pageX : e.clientX;
			var y = e.touches ? e.touches[0].pageY : e.clientY;
			if(Math.abs(x - this.touchStartX) >= 4 ||
			   Math.abs(y - this.touchStartY) >= 4){ // dojox/mobile/scrollable.threshold
			   	if(this._timer){
					clearTimeout(this._timer); // fail safe
					this._timer = null;
				}
				if(this._interval){
					clearInterval(this._interval); // fail safe
					this._interval = null;
				}
				array.forEach(this._conn, this.disconnect, this);
				domClass.remove(this._btn, "mblValuePickerSlotButtonSelected");
			}
		},

		_onTouchEnd: function(e){
			if(this._timer){
				clearTimeout(this._timer);
				this._timer = null;
			}
			array.forEach(this._conn, this.disconnect, this);
			domClass.remove(this._btn, "mblValuePickerSlotButtonSelected");
			if(this._interval){
				clearInterval(this._interval);
				this._interval = null;
			}else{
				this._onClick(e);
			}
		},

		_getKeyAttr: function(){
			var val = this.get("value");
			var item = array.filter(this.items, function(item){
				return item[1] === val;
			})[0];
			return item ? item[0] : null;
		},

		_getValueAttr: function(){
			// summary:
			//		Gets the currently selected value.
			return this.inputNode.value;
		},

		_setValueAttr: function(value){
			// summary:
			//		Sets a new value to this slot.
			this.inputNode.value = value;
			this._set("value", value);
			var parent = this.getParent();
			if(parent && parent.onValueChanged){
				parent.onValueChanged(this);
			}
		},

		_setTabIndexAttr: function(/*String*/ tabIndex){
			this.plusBtnNode.setAttribute("tabIndex", tabIndex);
			this.minusBtnNode.setAttribute("tabIndex", tabIndex);
		}
	});
});

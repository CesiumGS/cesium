define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dnd/move",
	"dojo/_base/event", // event.stop
	"dojo/_base/fx", // fx.animateProperty
	"dojo/dom-geometry", // domGeometry.position
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/keys", // keys.DOWN_ARROW keys.END keys.HOME keys.LEFT_ARROW keys.PAGE_DOWN keys.PAGE_UP keys.RIGHT_ARROW keys.UP_ARROW
	"dojo/_base/lang", // lang.hitch
	"dojo/sniff", // has("ie") has("mozilla")
	"dojo/dnd/Moveable", // Moveable
	"dojo/dnd/Mover", // Mover Mover.prototype.destroy.apply
	"dojo/query", // query
	"dojo/mouse", // mouse.wheel
	"../registry", // registry.findWidgets
	"../focus",		// focus.focus()
	"../typematic",
	"./Button",
	"./_FormValueWidget",
	"../_Container",
	"dojo/text!./templates/HorizontalSlider.html"
], function(array, declare, move, event, fx, domGeometry, domStyle, keys, lang, has, Moveable, Mover, query, mouse,
			registry, focus, typematic, Button, _FormValueWidget, _Container, template){

// module:
//		dijit/form/HorizontalSlider


var _SliderMover = declare("dijit.form._SliderMover", Mover, {
	onMouseMove: function(e){
		var widget = this.widget;
		var abspos = widget._abspos;
		if(!abspos){
			abspos = widget._abspos = domGeometry.position(widget.sliderBarContainer, true);
			widget._setPixelValue_ = lang.hitch(widget, "_setPixelValue");
			widget._isReversed_ = widget._isReversed();
		}
		var pixelValue = e[widget._mousePixelCoord] - abspos[widget._startingPixelCoord];
		widget._setPixelValue_(widget._isReversed_ ? (abspos[widget._pixelCount]-pixelValue) : pixelValue, abspos[widget._pixelCount], false);
	},

	destroy: function(e){
		Mover.prototype.destroy.apply(this, arguments);
		var widget = this.widget;
		widget._abspos = null;
		widget._setValueAttr(widget.value, true);
	}
});

var HorizontalSlider = declare("dijit.form.HorizontalSlider", [_FormValueWidget, _Container], {
	// summary:
	//		A form widget that allows one to select a value with a horizontally draggable handle

	templateString: template,

	// Overrides FormValueWidget.value to indicate numeric value
	value: 0,

	// showButtons: [const] Boolean
	//		Show increment/decrement buttons at the ends of the slider?
	showButtons: true,

	// minimum: [const] Integer
	//		The minimum value the slider can be set to.
	minimum: 0,

	// maximum: [const] Integer
	//		The maximum value the slider can be set to.
	maximum: 100,

	// discreteValues: Integer
	//		If specified, indicates that the slider handle has only 'discreteValues' possible positions,
	//		and that after dragging the handle, it will snap to the nearest possible position.
	//		Thus, the slider has only 'discreteValues' possible values.
	//
	//		For example, if minimum=10, maxiumum=30, and discreteValues=3, then the slider handle has
	//		three possible positions, representing values 10, 20, or 30.
	//
	//		If discreteValues is not specified or if it's value is higher than the number of pixels
	//		in the slider bar, then the slider handle can be moved freely, and the slider's value will be
	//		computed/reported based on pixel position (in this case it will likely be fractional,
	//		such as 123.456789).
	discreteValues: Infinity,

	// pageIncrement: Integer
	//		If discreteValues is also specified, this indicates the amount of clicks (ie, snap positions)
	//		that the slider handle is moved via pageup/pagedown keys.
	//		If discreteValues is not specified, it indicates the number of pixels.
	pageIncrement: 2,

	// clickSelect: Boolean
	//		If clicking the slider bar changes the value or not
	clickSelect: true,

	// slideDuration: Number
	//		The time in ms to take to animate the slider handle from 0% to 100%,
	//		when clicking the slider bar to make the handle move.
	slideDuration: registry.defaultDuration,

	// Map widget attributes to DOMNode attributes.
	_setIdAttr: "",		// Override _FormWidget which sends id to focusNode

	baseClass: "dijitSlider",

	// Apply CSS classes to up/down arrows and handle per mouse state
	cssStateNodes: {
		incrementButton: "dijitSliderIncrementButton",
		decrementButton: "dijitSliderDecrementButton",
		focusNode: "dijitSliderThumb"
	},

	_mousePixelCoord: "pageX",
	_pixelCount: "w",
	_startingPixelCoord: "x",
	_handleOffsetCoord: "left",
	_progressPixelSize: "width",

	_onKeyUp: function(/*Event*/ e){
		if(this.disabled || this.readOnly || e.altKey || e.ctrlKey || e.metaKey){ return; }
		this._setValueAttr(this.value, true);
	},

	_onKeyPress: function(/*Event*/ e){
		if(this.disabled || this.readOnly || e.altKey || e.ctrlKey || e.metaKey){ return; }
		switch(e.charOrCode){
			case keys.HOME:
				this._setValueAttr(this.minimum, false);
				break;
			case keys.END:
				this._setValueAttr(this.maximum, false);
				break;
			// this._descending === false: if ascending vertical (min on top)
			// (this._descending || this.isLeftToRight()): if left-to-right horizontal or descending vertical
			case ((this._descending || this.isLeftToRight()) ? keys.RIGHT_ARROW : keys.LEFT_ARROW):
			case (this._descending === false ? keys.DOWN_ARROW : keys.UP_ARROW):
			case (this._descending === false ? keys.PAGE_DOWN : keys.PAGE_UP):
				this.increment(e);
				break;
			case ((this._descending || this.isLeftToRight()) ? keys.LEFT_ARROW : keys.RIGHT_ARROW):
			case (this._descending === false ? keys.UP_ARROW : keys.DOWN_ARROW):
			case (this._descending === false ? keys.PAGE_UP : keys.PAGE_DOWN):
				this.decrement(e);
				break;
			default:
				return;
		}
		event.stop(e);
	},

	_onHandleClick: function(e){
		if(this.disabled || this.readOnly){ return; }
		if(!has("ie")){
			// make sure you get focus when dragging the handle
			// (but don't do on IE because it causes a flicker on mouse up (due to blur then focus)
			focus.focus(this.sliderHandle);
		}
		event.stop(e);
	},

	_isReversed: function(){
		// summary:
		//		Returns true if direction is from right to left
		// tags:
		//		protected extension
		return !this.isLeftToRight();
	},

	_onBarClick: function(e){
		if(this.disabled || this.readOnly || !this.clickSelect){ return; }
		focus.focus(this.sliderHandle);
		event.stop(e);
		var abspos = domGeometry.position(this.sliderBarContainer, true);
		var pixelValue = e[this._mousePixelCoord] - abspos[this._startingPixelCoord];
		this._setPixelValue(this._isReversed() ? (abspos[this._pixelCount] - pixelValue) : pixelValue, abspos[this._pixelCount], true);
		this._movable.onMouseDown(e);
	},

	_setPixelValue: function(/*Number*/ pixelValue, /*Number*/ maxPixels, /*Boolean?*/ priorityChange){
		if(this.disabled || this.readOnly){ return; }
		var count = this.discreteValues;
		if(count <= 1 || count == Infinity){ count = maxPixels; }
		count--;
		var pixelsPerValue = maxPixels / count;
		var wholeIncrements = Math.round(pixelValue / pixelsPerValue);
		this._setValueAttr(Math.max(Math.min((this.maximum-this.minimum)*wholeIncrements/count + this.minimum, this.maximum), this.minimum), priorityChange);
	},

	_setValueAttr: function(/*Number*/ value, /*Boolean?*/ priorityChange){
		// summary:
		//		Hook so set('value', value) works.
		this._set("value", value);
		this.valueNode.value = value;
		this.focusNode.setAttribute("aria-valuenow", value);
		this.inherited(arguments);
		var percent = (value - this.minimum) / (this.maximum - this.minimum);
		var progressBar = (this._descending === false) ? this.remainingBar : this.progressBar;
		var remainingBar = (this._descending === false) ? this.progressBar : this.remainingBar;
		if(this._inProgressAnim && this._inProgressAnim.status != "stopped"){
			this._inProgressAnim.stop(true);
		}
		if(priorityChange && this.slideDuration > 0 && progressBar.style[this._progressPixelSize]){
			// animate the slider
			var _this = this;
			var props = {};
			var start = parseFloat(progressBar.style[this._progressPixelSize]);
			var duration = this.slideDuration * (percent-start/100);
			if(duration == 0){ return; }
			if(duration < 0){ duration = 0 - duration; }
			props[this._progressPixelSize] = { start: start, end: percent*100, units:"%" };
			this._inProgressAnim = fx.animateProperty({ node: progressBar, duration: duration,
				onAnimate: function(v){
					remainingBar.style[_this._progressPixelSize] = (100 - parseFloat(v[_this._progressPixelSize])) + "%";
				},
				onEnd: function(){
					delete _this._inProgressAnim;
				},
				properties: props
			});
			this._inProgressAnim.play();
		}else{
			progressBar.style[this._progressPixelSize] = (percent*100) + "%";
			remainingBar.style[this._progressPixelSize] = ((1-percent)*100) + "%";
		}
	},

	_bumpValue: function(signedChange, /*Boolean?*/ priorityChange){
		if(this.disabled || this.readOnly){ return; }
		var s = domStyle.getComputedStyle(this.sliderBarContainer);
		var c = domGeometry.getContentBox(this.sliderBarContainer, s);
		var count = this.discreteValues;
		if(count <= 1 || count == Infinity){ count = c[this._pixelCount]; }
		count--;
		var value = (this.value - this.minimum) * count / (this.maximum - this.minimum) + signedChange;
		if(value < 0){ value = 0; }
		if(value > count){ value = count; }
		value = value * (this.maximum - this.minimum) / count + this.minimum;
		this._setValueAttr(value, priorityChange);
	},

	_onClkBumper: function(val){
		if(this.disabled || this.readOnly || !this.clickSelect){ return; }
		this._setValueAttr(val, true);
	},

	_onClkIncBumper: function(){
		this._onClkBumper(this._descending === false ? this.minimum : this.maximum);
	},

	_onClkDecBumper: function(){
		this._onClkBumper(this._descending === false ? this.maximum : this.minimum);
	},

	decrement: function(/*Event*/ e){
		// summary:
		//		Decrement slider
		// tags:
		//		private
		this._bumpValue(e.charOrCode == keys.PAGE_DOWN ? -this.pageIncrement : -1);
	},

	increment: function(/*Event*/ e){
		// summary:
		//		Increment slider
		// tags:
		//		private
		this._bumpValue(e.charOrCode == keys.PAGE_UP ? this.pageIncrement : 1);
	},

	_mouseWheeled: function(/*Event*/ evt){
		// summary:
		//		Event handler for mousewheel where supported
		event.stop(evt);
		this._bumpValue(evt.wheelDelta < 0 ? -1 : 1, true); // negative scroll acts like a decrement
	},

	startup: function(){
		if(this._started){ return; }

		array.forEach(this.getChildren(), function(child){
			if(this[child.container] != this.containerNode){
				this[child.container].appendChild(child.domNode);
			}
		}, this);

		this.inherited(arguments);
	},

	_typematicCallback: function(/*Number*/ count, /*Object*/ button, /*Event*/ e){
		if(count == -1){
			this._setValueAttr(this.value, true);
		}else{
			this[(button == (this._descending? this.incrementButton : this.decrementButton)) ? "decrement" : "increment"](e);
		}
	},

	buildRendering: function(){
		this.inherited(arguments);
		if(this.showButtons){
			this.incrementButton.style.display="";
			this.decrementButton.style.display="";
		}

		// find any associated label element and add to slider focusnode.
		var label = query('label[for="'+this.id+'"]');
		if(label.length){
			if(!label[0].id){ label[0].id = this.id + "_label"; }
			this.focusNode.setAttribute("aria-labelledby", label[0].id);
		}

		this.focusNode.setAttribute("aria-valuemin", this.minimum);
		this.focusNode.setAttribute("aria-valuemax", this.maximum);
	},

	postCreate: function(){
		this.inherited(arguments);

		if(this.showButtons){
			this.own(
				typematic.addMouseListener(this.decrementButton, this, "_typematicCallback", 25, 500),
				typematic.addMouseListener(this.incrementButton, this, "_typematicCallback", 25, 500)
			);
		}
		this.connect(this.domNode, mouse.wheel, "_mouseWheeled");

		// define a custom constructor for a SliderMover that points back to me
		var mover = declare(_SliderMover, {
			widget: this
		});
		this._movable = new Moveable(this.sliderHandle, {mover: mover});

		this._layoutHackIE7();
	},

	destroy: function(){
		this._movable.destroy();
		if(this._inProgressAnim && this._inProgressAnim.status != "stopped"){
			this._inProgressAnim.stop(true);
		}
		this.inherited(arguments);
	}
});

HorizontalSlider._Mover = _SliderMover;	// for monkey patching

return HorizontalSlider;
});

define([
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/keys",
	"dijit/_WidgetBase",
	"dijit/form/_FormValueMixin"
],
	function(array, connect, declare, lang, win, domClass, domConstruct, domGeometry, domStyle, keys, WidgetBase, FormValueMixin){

	return declare("dojox.mobile.Slider", [WidgetBase, FormValueMixin], {
		// summary:
		//		A non-templated Slider widget similar to the HTML5 INPUT type=range.

		// value: [const] Number
		//		The current slider value.
		value: 0,

		// min: [const] Number
		//		The first value the slider can be set to.
		min: 0,

		// max: [const] Number
		//		The last value the slider can be set to.
		max: 100,

		// step: [const] Number
		//		The delta from 1 value to another.
		//		This causes the slider handle to snap/jump to the closest possible value.
		//		A value of 0 means continuous (as much as allowed by pixel resolution).
		step: 1,

		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblSlider",

		// flip: [const] Boolean
		//		Specifies if the slider should change its default: ascending <--> descending.
		flip: false,

		// orientation: [const] String
		//		The slider direction.
		//
		//		- "H": horizontal
		//		- "V": vertical
		//		- "auto": use width/height comparison at instantiation time (default is "H" if width/height are 0)
		orientation: "auto",

		// halo: Number
		//		Size of the boundary that extends beyond the edges of the slider
		//		to make it easier to touch.
		halo: "8pt",

		buildRendering: function(){
			this.focusNode = this.domNode = domConstruct.create("div", {});
			this.valueNode = domConstruct.create("input", (this.srcNodeRef && this.srcNodeRef.name) ? { type: "hidden", name: this.srcNodeRef.name } : { type: "hidden" }, this.domNode, "last");
			var relativeParent = domConstruct.create("div", { style: { position:"relative", height:"100%", width:"100%" } }, this.domNode, "last");
			this.progressBar = domConstruct.create("div", { style:{ position:"absolute" }, "class":"mblSliderProgressBar" }, relativeParent, "last");
			this.touchBox = domConstruct.create("div", { style:{ position:"absolute" }, "class":"mblSliderTouchBox" }, relativeParent, "last");
			this.handle = domConstruct.create("div", { style:{ position:"absolute" }, "class":"mblSliderHandle" }, relativeParent, "last");
			this.inherited(arguments);
		},

		_setValueAttr: function(/*Number*/ value, /*Boolean?*/ priorityChange){
			// summary:
			//		Hook such that set('value', value) works.
			// tags:
			//		private
			value = Math.max(Math.min(value, this.max), this.min);
			var fromPercent = (this.value - this.min) * 100 / (this.max - this.min);
			this.valueNode.value = value;
			this.inherited(arguments);
			if(!this._started){ return; } // don't move images until all the properties are set
			this.focusNode.setAttribute("aria-valuenow", value);
			var toPercent = (value - this.min) * 100 / (this.max - this.min);
			// now perform visual slide
			var horizontal = this.orientation != "V";
			if(priorityChange === true){
				domClass.add(this.handle, "mblSliderTransition");
				domClass.add(this.progressBar, "mblSliderTransition");
			}else{
				domClass.remove(this.handle, "mblSliderTransition");
				domClass.remove(this.progressBar, "mblSliderTransition");
			}
			domStyle.set(this.handle, this._attrs.handleLeft, (this._reversed ? (100-toPercent) : toPercent) + "%");
			domStyle.set(this.progressBar, this._attrs.width, toPercent + "%");
		},

		postCreate: function(){
			this.inherited(arguments);

			function beginDrag(e){
				function getEventData(e){
					point = isMouse ? e[this._attrs.pageX] : (e.touches ? e.touches[0][this._attrs.pageX] : e[this._attrs.clientX]);
					pixelValue = point - startPixel;
					pixelValue = Math.min(Math.max(pixelValue, 0), maxPixels);
					var discreteValues = this.step ? ((this.max - this.min) / this.step) : maxPixels;
					if(discreteValues <= 1 || discreteValues == Infinity ){ discreteValues = maxPixels; }
					var wholeIncrements = Math.round(pixelValue * discreteValues / maxPixels);
					value = (this.max - this.min) * wholeIncrements / discreteValues;
					value = this._reversed ? (this.max - value) : (this.min + value);
				}
				function continueDrag(e){
					e.preventDefault();
					lang.hitch(this, getEventData)(e);
					this.set('value', value, false);
				}
		
				function endDrag(e){
					e.preventDefault();
					array.forEach(actionHandles, lang.hitch(this, "disconnect"));
					actionHandles = [];
					this.set('value', this.value, true);
				}

				e.preventDefault();
				var isMouse = e.type == "mousedown";
				var box = domGeometry.position(node, false); // can't use true since the added docScroll and the returned x are body-zoom incompatibile
				var bodyZoom = domStyle.get(win.body(), "zoom") || 1;
				if(isNaN(bodyZoom)){ bodyZoom = 1; }
				var nodeZoom = domStyle.get(node, "zoom") || 1;
				if(isNaN(nodeZoom)){ nodeZoom = 1; }
				var startPixel = box[this._attrs.x] * nodeZoom * bodyZoom + domGeometry.docScroll()[this._attrs.x];
				var maxPixels = box[this._attrs.w] * nodeZoom * bodyZoom;
				lang.hitch(this, getEventData)(e);
				if(e.target == this.touchBox){
					this.set('value', value, true);
				}
				array.forEach(actionHandles, connect.disconnect);
				var root = win.doc.documentElement;
				var actionHandles = [
					this.connect(root, isMouse ? "onmousemove" : "ontouchmove", continueDrag),
					this.connect(root, isMouse ? "onmouseup" : "ontouchend", endDrag)
				];
			}

			function keyPress(/*Event*/ e){
				if(this.disabled || this.readOnly || e.altKey || e.ctrlKey || e.metaKey){ return; }
				var	step = this.step,
					multiplier = 1,
					newValue;
				switch(e.keyCode){
					case keys.HOME:
						newValue = this.min;
						break;
					case keys.END:
						newValue = this.max;
						break;
					case keys.RIGHT_ARROW:
						multiplier = -1;
					case keys.LEFT_ARROW:
						newValue = this.value + multiplier * ((flip && horizontal) ? step : -step);
						break;
					case keys.DOWN_ARROW:
						multiplier = -1;
					case keys.UP_ARROW:
						newValue = this.value + multiplier * ((!flip || horizontal) ? step : -step);
						break;
					default:
						return;
				}
				e.preventDefault();
				this._setValueAttr(newValue, false);
			}

			function keyUp(/*Event*/ e){
				if(this.disabled || this.readOnly || e.altKey || e.ctrlKey || e.metaKey){ return; }
				this._setValueAttr(this.value, true);
			}

			var	point, pixelValue, value,
				node = this.domNode;
			if(this.orientation == "auto"){
				 this.orientation = node.offsetHeight <= node.offsetWidth ? "H" : "V";
			}
			// add V or H suffix to baseClass for styling purposes
			domClass.add(this.domNode, array.map(this.baseClass.split(" "), lang.hitch(this, function(c){ return c+this.orientation; })));
			var	horizontal = this.orientation != "V",
				ltr = horizontal ? this.isLeftToRight() : false,
				flip = !!this.flip;
			// _reversed is complicated since you can have flipped right-to-left and vertical is upside down by default
			this._reversed = !((horizontal && ((ltr && !flip) || (!ltr && flip))) || (!horizontal && flip));
			this._attrs = horizontal ? { x:'x', w:'w', l:'l', r:'r', pageX:'pageX', clientX:'clientX', handleLeft:"left", left:this._reversed ? "right" : "left", width:"width" } : { x:'y', w:'h', l:'t', r:'b', pageX:'pageY', clientX:'clientY', handleLeft:"top", left:this._reversed ? "bottom" : "top", width:"height" };
			this.progressBar.style[this._attrs.left] = "0px";
			this.connect(this.touchBox, "ontouchstart", beginDrag);
			this.connect(this.touchBox, "onmousedown", beginDrag); // in case this works
			this.connect(this.handle, "ontouchstart", beginDrag);
			this.connect(this.handle, "onmousedown", beginDrag); // in case this works
			this.connect(this.domNode, "onkeypress", keyPress); // for desktop a11y
			this.connect(this.domNode, "onkeyup", keyUp); // fire onChange on desktop
			this.startup();
			this.set('value', this.value);
		}
	});
});

define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/fx",
	"dojo/_base/event",
	"dojo/_base/sniff",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/keys",
	"dijit",
	"dojo/dnd/Mover",
	"dojo/dnd/Moveable",
	"dojo/text!./resources/HorizontalRangeSlider.html",
	"dojo/text!./resources/VerticalRangeSlider.html",
	"dijit/form/HorizontalSlider",
	"dijit/form/VerticalSlider",
	"dijit/form/_FormValueWidget",
	"dijit/focus",
	"dojo/fx",
	"dojox/fx" // unused?
], function(declare, lang, array, fx, event, has, domStyle, domGeometry, keys, dijit, Mover, Moveable, hTemplate, vTemplate, HorizontalSlider, VerticalSlider, FormValueWidget, FocusManager, fxUtils){

	// make these functions once:
	var sortReversed = function(a, b){ return b - a; },
		sortForward = function(a, b){ return a - b; }
	;


	var RangeSliderMixin = declare("dojox.form._RangeSliderMixin", null, {

		value: [0,100],
		postMixInProperties: function(){
			this.inherited(arguments);
			this.value = array.map(this.value, function(i){ return parseInt(i, 10); });
		},

		postCreate: function(){
			this.inherited(arguments);
			// we sort the values!
			// TODO: re-think, how to set the value
			this.value.sort(this._isReversed() ? sortReversed : sortForward);

			// define a custom constructor for a SliderMoverMax that points back to me
			var _self = this;
			var mover = declare(SliderMoverMax, {
				constructor: function(){
					this.widget = _self;
				}
			});

			this._movableMax = new Moveable(this.sliderHandleMax,{ mover: mover });

			//The valuenow of the sliderHandle (min) usually determines the valuemin of sliderHandleMax
			//and valuenow of sliderHandleMax usually determines the valueMax of sliderHandle
			//However, in our RangeSlider dragging one handle past the other one causes both to
			//'snap' together and move so both sliders will have the same min, max values			

			this.sliderHandle.setAttribute("aria-valuemin", this.minimum);
			this.sliderHandle.setAttribute("aria-valuemax", this.maximum);
			this.sliderHandleMax.setAttribute("aria-valuemin", this.minimum);
			this.sliderHandleMax.setAttribute("aria-valuemax", this.maximum);
			
			// a dnd for the bar!
			var barMover = declare(SliderBarMover, {
				constructor: function(){
					this.widget = _self;
				}
			});
			this._movableBar = new Moveable(this.progressBar,{ mover: barMover });
				
			// Remove these from the progress bar since it isn't a slider
			this.focusNode.removeAttribute("aria-valuemin");
			this.focusNode.removeAttribute("aria-valuemax");
			this.focusNode.removeAttribute("aria-valuenow");

		},		

		destroy: function(){
			this.inherited(arguments);
			this._movableMax.destroy();
			this._movableBar.destroy();
		},

		_onKeyPress: function(/*Event*/ e){
			if(this.disabled || this.readOnly || e.altKey || e.ctrlKey){ return; }

			var useMaxValue = e.target === this.sliderHandleMax;
			var barFocus = e.target === this.progressBar;
			var k = lang.delegate(keys, this.isLeftToRight() ? {PREV_ARROW: keys.LEFT_ARROW, NEXT_ARROW: keys.RIGHT_ARROW} 
			                                                 : {PREV_ARROW: keys.RIGHT_ARROW, NEXT_ARROW: keys.LEFT_ARROW});			
			var delta = 0;
			var down = false;

			switch(e.keyCode){
				case k.HOME       :	this._setValueAttr(this.minimum, true, useMaxValue);event.stop(e);return;
				case k.END        :	this._setValueAttr(this.maximum, true, useMaxValue);event.stop(e);return;
				case k.PREV_ARROW :
				case k.DOWN_ARROW :	down = true;
				case k.NEXT_ARROW :
				case k.UP_ARROW   :	delta = 1; break;
				case k.PAGE_DOWN  :	down = true;
				case k.PAGE_UP    :	delta = this.pageIncrement; break;
				default           : this.inherited(arguments);return;
			}
			
			if(down){delta = -delta;}

			if(delta){
				if(barFocus){
					this._bumpValue([
						{ change: delta, useMaxValue: false },
						{ change: delta, useMaxValue: true }
					]);
				}else{
					this._bumpValue(delta, useMaxValue);
				}
				event.stop(e);
			}
		},

		_onHandleClickMax: function(e){
			if(this.disabled || this.readOnly){ return; }
			if(!has("ie")){
				// make sure you get focus when dragging the handle
				// (but don't do on IE because it causes a flicker on mouse up (due to blur then focus)
				FocusManager.focus(this.sliderHandleMax);
			}
			event.stop(e);
		},

		_onClkIncBumper: function(){
			this._setValueAttr(this._descending === false ? this.minimum : this.maximum, true, true);
		},

		_bumpValue: function(signedChange, useMaxValue){

			// we pass an array to _setValueAttr when signedChange is an array
			var value = lang.isArray(signedChange) ? [
					this._getBumpValue(signedChange[0].change, signedChange[0].useMaxValue),
					this._getBumpValue(signedChange[1].change, signedChange[1].useMaxValue)
				]
				: this._getBumpValue(signedChange, useMaxValue)

			this._setValueAttr(value, true, useMaxValue);
		},

		_getBumpValue: function(signedChange, useMaxValue){

			var idx = useMaxValue ? 1 : 0;
			if(this._isReversed()){
				idx = 1 - idx;
			}

			var s = domStyle.getComputedStyle(this.sliderBarContainer),
				c = domGeometry.getContentBox(this.sliderBarContainer, s),
				count = this.discreteValues,
				myValue = this.value[idx]
			;

			if(count <= 1 || count == Infinity){ count = c[this._pixelCount]; }
			count--;

			var value = (myValue - this.minimum) * count / (this.maximum - this.minimum) + signedChange;
			if(value < 0){ value = 0; }
			if(value > count){ value = count; }

			return value * (this.maximum - this.minimum) / count + this.minimum;
		},

		_onBarClick: function(e){
			if(this.disabled || this.readOnly){ return; }
			if(!has("ie")){
				// make sure you get focus when dragging the handle
				// (but don't do on IE because it causes a flicker on mouse up (due to blur then focus)
				FocusManager.focus(this.progressBar);
			}
			event.stop(e);
		},

		_onRemainingBarClick: function(e){
			if(this.disabled || this.readOnly){ return; }
			if(!has("ie")){
				// make sure you get focus when dragging the handle
				// (but don't do on IE because it causes a flicker on mouse up (due to blur then focus)
				FocusManager.focus(this.progressBar);
			}

			// now we set the min/max-value of the slider!
			var abspos = domGeometry.position(this.sliderBarContainer, true),
				bar = domGeometry.position(this.progressBar, true),
				relMousePos = e[this._mousePixelCoord] - abspos[this._startingPixelCoord],
				leftPos = bar[this._startingPixelCoord],
				rightPos = leftPos + bar[this._pixelCount],
				isMaxVal = this._isReversed() ? relMousePos <= leftPos : relMousePos >= rightPos,
				p = this._isReversed() ? abspos[this._pixelCount] - relMousePos : relMousePos
			;

			this._setPixelValue(p, abspos[this._pixelCount], true, isMaxVal);
			event.stop(e);
		},

		_setPixelValue: function(/*Number*/ pixelValue, /*Number*/ maxPixels, /*Boolean*/ priorityChange, /*Boolean*/ isMaxVal){
			if(this.disabled || this.readOnly){ return; }
			var myValue = this._getValueByPixelValue(pixelValue, maxPixels);
			this._setValueAttr(myValue, priorityChange, isMaxVal);
		},

		_getValueByPixelValue: function(/*Number*/ pixelValue, /*Number*/ maxPixels){
			pixelValue = pixelValue < 0 ? 0 : maxPixels < pixelValue ? maxPixels : pixelValue;
			var count = this.discreteValues;
			if(count <= 1 || count == Infinity){ count = maxPixels; }
			count--;
			var pixelsPerValue = maxPixels / count;
			var wholeIncrements = Math.round(pixelValue / pixelsPerValue);
			return (this.maximum-this.minimum)*wholeIncrements/count + this.minimum;
		},

		_setValueAttr: function(/*Array or Number*/ value, /*Boolean, optional*/ priorityChange, /*Boolean, optional*/ isMaxVal){
			// we pass an array, when we move the slider with the bar
			var actValue = this.value;
			if(!lang.isArray(value)){
				if(isMaxVal){
					if(this._isReversed()){
						actValue[0] = value;
					}else{
						actValue[1] = value;
					}
				}else{
					if(this._isReversed()){
						actValue[1] = value;
					}else{
						actValue[0] = value;
					}
				}
			}else{
				actValue = value;
			}
			// we have to reset this values. don't know the reason for that
			this._lastValueReported = "";
			this.valueNode.value = this.value = value = actValue;

			this.value.sort(this._isReversed() ? sortReversed : sortForward);

			this.sliderHandle.setAttribute("aria-valuenow", actValue[0]);
			this.sliderHandleMax.setAttribute("aria-valuenow", actValue[1]);
			
			// not calling the _setValueAttr-function of Slider, but the super-super-class (needed for the onchange-event!)
			FormValueWidget.prototype._setValueAttr.apply(this, arguments);
			this._printSliderBar(priorityChange, isMaxVal);
		},

		_printSliderBar: function(priorityChange, isMaxVal){
			var percentMin = (this.value[0] - this.minimum) / (this.maximum - this.minimum);
			var percentMax = (this.value[1] - this.minimum) / (this.maximum - this.minimum);
			var percentMinSave = percentMin;
			if(percentMin > percentMax){
				percentMin = percentMax;
				percentMax = percentMinSave;
			}
			var sliderHandleVal = this._isReversed() ? ((1-percentMin)*100) : (percentMin * 100);
			var sliderHandleMaxVal = this._isReversed() ? ((1-percentMax)*100) : (percentMax * 100);
			var progressBarVal = this._isReversed() ? ((1-percentMax)*100) : (percentMin * 100);
			if(priorityChange && this.slideDuration > 0 && this.progressBar.style[this._progressPixelSize]){
				// animate the slider
				var percent = isMaxVal ? percentMax : percentMin;
				var _this = this;
				var props = {};
				var start = parseFloat(this.progressBar.style[this._handleOffsetCoord]);
				var duration = this.slideDuration / 10; // * (percent-start/100);
				if(duration === 0){ return; }
				if(duration < 0){ duration = 0 - duration; }
				var propsHandle = {};
				var propsHandleMax = {};
				var propsBar = {};
				// hui, a lot of animations :-)
				propsHandle[this._handleOffsetCoord] = { start: this.sliderHandle.style[this._handleOffsetCoord], end: sliderHandleVal, units:"%"};
				propsHandleMax[this._handleOffsetCoord] = { start: this.sliderHandleMax.style[this._handleOffsetCoord], end: sliderHandleMaxVal, units:"%"};
				propsBar[this._handleOffsetCoord] = { start: this.progressBar.style[this._handleOffsetCoord], end: progressBarVal, units:"%"};
				propsBar[this._progressPixelSize] = { start: this.progressBar.style[this._progressPixelSize], end: (percentMax - percentMin) * 100, units:"%"};
				var animHandle = fx.animateProperty({node: this.sliderHandle,duration: duration, properties: propsHandle});
				var animHandleMax = fx.animateProperty({node: this.sliderHandleMax,duration: duration, properties: propsHandleMax});
				var animBar = fx.animateProperty({node: this.progressBar,duration: duration, properties: propsBar});
				var animCombine = fxUtils.combine([animHandle, animHandleMax, animBar]);
				animCombine.play();
			}else{
				this.sliderHandle.style[this._handleOffsetCoord] = sliderHandleVal + "%";
				this.sliderHandleMax.style[this._handleOffsetCoord] = sliderHandleMaxVal + "%";
				this.progressBar.style[this._handleOffsetCoord] = progressBarVal + "%";
				this.progressBar.style[this._progressPixelSize] = ((percentMax - percentMin) * 100) + "%";
			}
		}
	});

	var SliderMoverMax = declare("dijit.form._SliderMoverMax", dijit.form._SliderMover, {

		onMouseMove: function(e){
			var widget = this.widget;
			var abspos = widget._abspos;
			if(!abspos){
				abspos = widget._abspos = domGeometry.position(widget.sliderBarContainer, true);
				widget._setPixelValue_ = lang.hitch(widget, "_setPixelValue");
				widget._isReversed_ = widget._isReversed();
			}

			var pixelValue = e[widget._mousePixelCoord] - abspos[widget._startingPixelCoord];
			widget._setPixelValue_(widget._isReversed_ ? (abspos[widget._pixelCount]-pixelValue) : pixelValue, abspos[widget._pixelCount], false, true);
		},

		destroy: function(e){
			Mover.prototype.destroy.apply(this, arguments);
			var widget = this.widget;
			widget._abspos = null;
			widget._setValueAttr(widget.value, true);
		}
	});

	var SliderBarMover = declare("dijit.form._SliderBarMover", Mover, {

		onMouseMove: function(e){
			var widget = this.widget;
			if(widget.disabled || widget.readOnly){ return; }
			var abspos = widget._abspos;
			var bar = widget._bar;
			var mouseOffset = widget._mouseOffset;
			if(!abspos){
				abspos = widget._abspos = domGeometry.position(widget.sliderBarContainer, true);
				widget._setPixelValue_ = lang.hitch(widget, "_setPixelValue");
				widget._getValueByPixelValue_ = lang.hitch(widget, "_getValueByPixelValue");
				widget._isReversed_ = widget._isReversed();
			}

			if(!bar){
				bar = widget._bar = domGeometry.position(widget.progressBar, true);
			}

			if(!mouseOffset){
				mouseOffset = widget._mouseOffset = e[widget._mousePixelCoord] - bar[widget._startingPixelCoord];
			}

			var pixelValueMin = e[widget._mousePixelCoord] - abspos[widget._startingPixelCoord] - mouseOffset,
				pixelValueMax = pixelValueMin + bar[widget._pixelCount];
				// we don't narrow the slider when it reaches the bumper!
				// maybe there is a simpler way
				pixelValues = [pixelValueMin, pixelValueMax]
			;

			pixelValues.sort(sortForward);

			if(pixelValues[0] <= 0){
				pixelValues[0] = 0;
				pixelValues[1] = bar[widget._pixelCount];
			}
			if(pixelValues[1] >= abspos[widget._pixelCount]){
				pixelValues[1] = abspos[widget._pixelCount];
				pixelValues[0] = abspos[widget._pixelCount] - bar[widget._pixelCount];
			}
			// getting the real values by pixel
			var myValues = [
				widget._getValueByPixelValue(widget._isReversed_ ? (abspos[widget._pixelCount] - pixelValues[0]) : pixelValues[0], abspos[widget._pixelCount]),
				widget._getValueByPixelValue(widget._isReversed_ ? (abspos[widget._pixelCount] - pixelValues[1]) : pixelValues[1], abspos[widget._pixelCount])
			];
			// and setting the value of the widget
			widget._setValueAttr(myValues, false, false);
		},

		destroy: function(){
			Mover.prototype.destroy.apply(this, arguments);
			var widget = this.widget;
			widget._abspos = null;
			widget._bar = null;
			widget._mouseOffset = null;
			widget._setValueAttr(widget.value, true);
		}
	});

	declare("dojox.form.HorizontalRangeSlider", [HorizontalSlider, RangeSliderMixin], {
		// summary:
		//		A form widget that allows one to select a range with two horizontally draggable images
		templateString: hTemplate
	});

	declare("dojox.form.VerticalRangeSlider", [VerticalSlider, RangeSliderMixin], {
		// summary:
		//		A form widget that allows one to select a range with two vertically draggable images
		templateString: vTemplate
	});

	return RangeSliderMixin;

});

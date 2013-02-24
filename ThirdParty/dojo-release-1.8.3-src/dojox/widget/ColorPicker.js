define([
	"dojo/_base/kernel","dojo/_base/declare","dojo/_base/lang","dojo/_base/array",
	"dojo/_base/html","dojo/_base/connect","dojo/_base/sniff","dojo/_base/window",
	"dojo/_base/event","dojo/dom","dojo/dom-class","dojo/keys","dojo/fx","dojo/dnd/move",
	"dijit/registry","dijit/_base/focus","dijit/form/_FormWidget","dijit/typematic",
	"dojox/color","dojo/i18n","dojo/i18n!./nls/ColorPicker","dojo/i18n!dojo/cldr/nls/number",
	"dojo/text!./ColorPicker/ColorPicker.html"
], function(kernel,declare,lang,ArrayUtil,html,Hub,has,win,Event,DOM,DOMClass,Keys,fx,move,
		registry,FocusManager,FormWidget,Typematic,color,i18n,bundle1,bundle2,template){

	kernel.experimental("dojox.widget.ColorPicker");
	
	var webSafeFromHex = function(hex){
		// stub, this is planned later:
		return hex;
	};

	// TODO: shouldn't this extend _FormValueWidget?
	return declare("dojox.widget.ColorPicker", FormWidget, {
		// summary:
		//		a HSV color picker - similar to Photoshop picker
		// description:
		//		Provides an interactive HSV ColorPicker similar to
		//		PhotoShop's color selction tool. This is an enhanced
		//		version of the default dijit.ColorPalette, though provides
		//		no accessibility.
		// example:
		// |	var picker = new dojox.widget.ColorPicker({
		// |		// a couple of example toggles:
		// |		animatePoint:false,
		// |		showHsv: false,
		// |		webSafe: false,
		// |		showRgb: false
		// |	});
		// example:
		// |	<!-- markup: -->
		// |	<div dojoType="dojox.widget.ColorPicker"></div>

		// showRgb: Boolean
		//		show/update RGB input nodes
		showRgb: true,
	
		// showHsv: Boolean
		//		show/update HSV input nodes
		showHsv: true,
	
		// showHex: Boolean
		//		show/update Hex value field
		showHex: true,

		// webSafe: Boolean
		//		deprecated? or just use a toggle to show/hide that node, too?
		webSafe: true,

		// animatePoint: Boolean
		//		toggle to use slideTo (true) or just place the cursor (false) on click
		animatePoint: true,

		// slideDuration: Integer
		//		time in ms picker node will slide to next location (non-dragging) when animatePoint=true
		slideDuration: 250,

		// liveUpdate: Boolean
		//		Set to true to fire onChange in an indeterminate way
		liveUpdate: false,

		// PICKER_HUE_H: int
		//		Height of the hue picker, used to calculate positions
		PICKER_HUE_H: 150,
		
		// PICKER_SAT_VAL_H: int
		//		Height of the 2d picker, used to calculate positions
		PICKER_SAT_VAL_H: 150,
		
		// PICKER_SAT_VAL_W: int
		//		Width of the 2d picker, used to calculate positions
		PICKER_SAT_VAL_W: 150,

		// PICKER_HUE_SELECTOR_H: int
		//		Height of the hue selector DOM node, used to calc offsets so that selection
		//		is center of the image node.
		PICKER_HUE_SELECTOR_H: 8,
		
		// PICKER_SAT_SELECTOR_H: int
		//		Height of the saturation selector DOM node, used to calc offsets so that selection
		//		is center of the image node.
		PICKER_SAT_SELECTOR_H: 10,

		// PICKER_SAT_SELECTOR_W: int
		//		Width of the saturation selector DOM node, used to calc offsets so that selection
		//		is center of the image node.
		PICKER_SAT_SELECTOR_W: 10,

		// value: String
		//		Default color for this component. Only hex values are accepted as incoming/returned
		//		values. Adjust this value with `.attr`, eg: dijit.byId("myPicker").attr("value", "#ededed");
		//		to cause the points to adjust and the values to reflect the current color.
		value: "#ffffff",
		
		_underlay: kernel.moduleUrl("dojox.widget","ColorPicker/images/underlay.png"),

		_hueUnderlay: kernel.moduleUrl("dojox.widget","ColorPicker/images/hue.png"),

		_pickerPointer: kernel.moduleUrl("dojox.widget","ColorPicker/images/pickerPointer.png"),

		_huePickerPointer: kernel.moduleUrl("dojox.widget","ColorPicker/images/hueHandle.png"),

		_huePickerPointerAlly: kernel.moduleUrl("dojox.widget","ColorPicker/images/hueHandleA11y.png"),

		templateString: template,

		postMixInProperties: function(){
			if(DOMClass.contains(win.body(), "dijit_a11y")){
				// Use the pointer that will show up in high contrast.
				this._huePickerPointer = this._huePickerPointerAlly;
			}
			this._uId = registry.getUniqueId(this.id);
			lang.mixin(this, i18n.getLocalization("dojox.widget", "ColorPicker"));
			lang.mixin(this, i18n.getLocalization("dojo.cldr", "number"));
			this.inherited(arguments);
		},

		postCreate: function(){
			// summary:
			//		As quickly as we can, set up ie6 alpha-filter support for our
			//		underlay.  we don't do image handles (done in css), just the 'core'
			//		of this widget: the underlay.
			this.inherited(arguments);
			if(has("ie") < 7){
				this.colorUnderlay.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+this._underlay+"', sizingMethod='scale')";
				this.colorUnderlay.src = this._blankGif.toString();
			}
			// hide toggle-able nodes:
			if(!this.showRgb){ this.rgbNode.style.visibility = "hidden"; }
			if(!this.showHsv){ this.hsvNode.style.visibility = "hidden"; }
			if(!this.showHex){ this.hexNode.style.visibility = "hidden"; }
			if(!this.webSafe){ this.safePreviewNode.style.visibility = "hidden"; }
		},
		
		startup: function(){
			if(this._started){
				return;
			}
			this._started = true;
			this.set("value", this.value);
			this._mover = new move.boxConstrainedMoveable(this.cursorNode, {
				box: {
					t: -(this.PICKER_SAT_SELECTOR_H/2),
					l: -(this.PICKER_SAT_SELECTOR_W/2),
					w:this.PICKER_SAT_VAL_W,
					h:this.PICKER_SAT_VAL_H
				}
			});
			
			this._hueMover = new move.boxConstrainedMoveable(this.hueCursorNode, {
				box: {
					t: -(this.PICKER_HUE_SELECTOR_H/2),
					l:0,
					w:0,
					h:this.PICKER_HUE_H
				}
			});
			
			this._subs = [];
			// no dnd/move/move published ... use a timer:
			this._subs.push(Hub.subscribe("/dnd/move/stop", lang.hitch(this, "_clearTimer")));
			this._subs.push(Hub.subscribe("/dnd/move/start", lang.hitch(this, "_setTimer")));

			// Bind to up, down, left and right  arrows on the hue and saturation nodes.
			this._keyListeners = [];
			this._connects.push(Typematic.addKeyListener(this.hueCursorNode,{
				charOrCode: Keys.UP_ARROW,
				shiftKey: false,
				metaKey: false,
				ctrlKey: false,
				altKey: false
			}, this, lang.hitch(this, this._updateHueCursorNode), 25, 25));
			this._connects.push(Typematic.addKeyListener(this.hueCursorNode,{
				charOrCode: Keys.DOWN_ARROW,
				shiftKey: false,
				metaKey: false,
				ctrlKey: false,
				altKey: false
			}, this, lang.hitch(this, this._updateHueCursorNode), 25, 25));
			this._connects.push(Typematic.addKeyListener(this.cursorNode,{
				charOrCode: Keys.UP_ARROW,
				shiftKey: false,
				metaKey: false,
				ctrlKey: false,
				altKey: false
			}, this, lang.hitch(this, this._updateCursorNode), 25, 25));
			this._connects.push(Typematic.addKeyListener(this.cursorNode,{
				charOrCode: Keys.DOWN_ARROW,
				shiftKey: false,
				metaKey: false,
				ctrlKey: false,
				altKey: false
			}, this, lang.hitch(this, this._updateCursorNode), 25, 25));
			this._connects.push(Typematic.addKeyListener(this.cursorNode,{
				charOrCode: Keys.LEFT_ARROW,
				shiftKey: false,
				metaKey: false,
				ctrlKey: false,
				altKey: false
			}, this, lang.hitch(this, this._updateCursorNode), 25, 25));
			this._connects.push(Typematic.addKeyListener(this.cursorNode,{
				charOrCode: Keys.RIGHT_ARROW,
				shiftKey: false,
				metaKey: false,
				ctrlKey: false,
				altKey: false
			}, this, lang.hitch(this, this._updateCursorNode), 25, 25));
		},
		
		_setValueAttr: function(value){
			if(!this._started){ return; }
			this.setColor(value, true);
		},
		
		setColor: function(/* String */col, force){
			// summary:
			//		Set a color on a picker. Usually used to set
			//		initial color as an alternative to passing defaultColor option
			//		to the constructor.
			col = color.fromString(col);
			this._updatePickerLocations(col);
			this._updateColorInputs(col);
			this._updateValue(col, force);
		},
		
		_setTimer: function(/* dojo/dnd/Mover */mover){
			if(mover.node != this.cursorNode){ return; }
			// FIXME: should I assume this? focus on mouse down so on mouse up
			FocusManager.focus(mover.node);
			DOM.setSelectable(this.domNode,false);
			this._timer = setInterval(lang.hitch(this, "_updateColor"), 45);
		},
		
		_clearTimer: function(/* dojo/dnd/Mover */mover){
			if(!this._timer){ return; }
			clearInterval(this._timer);
			this._timer = null;
			this.onChange(this.value);
			DOM.setSelectable(this.domNode,true);
		},
		
		_setHue: function(/* Float */h){
			// summary:
			//		Sets a natural color background for the
			//		underlay image against closest hue value (full saturation)
			// h:
			//		0..360
			html.style(this.colorUnderlay, "backgroundColor", color.fromHsv(h,100,100).toHex());
			
		},

		_updateHueCursorNode: function(count, node, e){
			// summary:
			//		Function used by the typematic code to handle cursor position and update
			//		via keyboard.
			// count: Number
			//		-1 means stop, anything else is just how many times it was called.
			// node: DomNode
			//		The node generating the event.
			// e: Event
			//		The event.
			if(count !== -1){
				var y = html.style(this.hueCursorNode, "top");
				var selCenter = this.PICKER_HUE_SELECTOR_H/2;

				// Account for our offset
				y += selCenter;
				var update = false;
				if(e.charOrCode == Keys.UP_ARROW){
					if(y > 0){
						y -= 1;
						update = true;
					}
				}else if(e.charOrCode == Keys.DOWN_ARROW){
					if(y < this.PICKER_HUE_H){
						y += 1;
						update = true;
					}
				}
				y -= selCenter;
				if(update){
					html.style(this.hueCursorNode, "top", y + "px");
				}
			}else{
				this._updateColor(true);
			}
		},
		
		_updateCursorNode: function(count, node, e){
			// summary:
			//		Function used by the typematic code to handle cursor position and update
			//		via keyboard.
			// count:
			//		-1 means stop, anything else is just how many times it was called.
			// node:
			//		The node generating the event.
			// e:
			//		The event.
			var selCenterH = this.PICKER_SAT_SELECTOR_H/2;
			var selCenterW = this.PICKER_SAT_SELECTOR_W/2;

			if(count !== -1){
				var y = html.style(this.cursorNode, "top");
				var x = html.style(this.cursorNode, "left");
				
				// Account for our offsets to center
				y += selCenterH;
				x += selCenterW;

				var update = false;
				if(e.charOrCode == Keys.UP_ARROW){
					if(y > 0){
						y -= 1;
						update = true;
					}
				}else if(e.charOrCode == Keys.DOWN_ARROW){
					if(y < this.PICKER_SAT_VAL_H){
						y += 1;
						update = true;
					}
				}else if(e.charOrCode == Keys.LEFT_ARROW){
					if(x > 0){
						x -= 1;
						update = true;
					}
				}else if(e.charOrCode == Keys.RIGHT_ARROW){
					if(x < this.PICKER_SAT_VAL_W){
						x += 1;
						update = true;
					}
				}
				if(update){
					// Account for our offsets to center
					y -= selCenterH;
					x -= selCenterW;
					html.style(this.cursorNode, "top", y + "px");
					html.style(this.cursorNode, "left", x + "px");
				}
			}else{
				this._updateColor(true);
			}
		},

		_updateColor: function(){
			// summary:
			//		update the previewNode color, and input values [optional]
			
			var hueSelCenter = this.PICKER_HUE_SELECTOR_H/2,
				satSelCenterH = this.PICKER_SAT_SELECTOR_H/2,
				satSelCenterW = this.PICKER_SAT_SELECTOR_W/2;

			var _huetop = html.style(this.hueCursorNode,"top") + hueSelCenter,
				_pickertop = html.style(this.cursorNode,"top") + satSelCenterH,
				_pickerleft = html.style(this.cursorNode,"left") + satSelCenterW,
				h = Math.round(360 - (_huetop / this.PICKER_HUE_H * 360)),
				col = color.fromHsv(h, _pickerleft / this.PICKER_SAT_VAL_W * 100, 100 - (_pickertop / this.PICKER_SAT_VAL_H * 100))
			;
			
			this._updateColorInputs(col);
			this._updateValue(col, true);
			
			// update hue, not all the pickers
			if(h!=this._hue){
				this._setHue(h);
			}
		},
		
		_colorInputChange: function(e){
			// summary:
			//		updates picker position and inputs
			//		according to rgb, hex or hsv input changes
			var col, hasit = false;
			switch(e.target){
				//transform to hsv to pixels

				case this.hexCode:
					col = color.fromString(e.target.value);
					hasit = true;
					
					break;
				case this.Rval:
				case this.Gval:
				case this.Bval:
					col = color.fromArray([this.Rval.value, this.Gval.value, this.Bval.value]);
					hasit = true;
					break;
				case this.Hval:
				case this.Sval:
				case this.Vval:
					col = color.fromHsv(this.Hval.value, this.Sval.value, this.Vval.value);
					hasit = true;
					break;
			}
			
			if(hasit){
				this._updatePickerLocations(col);
				this._updateColorInputs(col);
				this._updateValue(col, true);
			}
			
		},
		
		_updateValue: function(/* dojox/color/Color */col, /* Boolean */fireChange){
			// summary:
			//		updates the value of the widget
			//		can cancel reverse onChange by specifying second param
			var hex = col.toHex();
			
			this.value = this.valueNode.value = hex;
			
			// anytime we muck with the color, fire onChange?
			if(fireChange && (!this._timer || this.liveUpdate)){
				this.onChange(hex);
			}
		},
		
		_updatePickerLocations: function(/* dojox/color/Color */col){
			// summary:
			//		update handles on the pickers acording to color values
			
			var hueSelCenter = this.PICKER_HUE_SELECTOR_H/2,
				satSelCenterH = this.PICKER_SAT_SELECTOR_H/2,
				satSelCenterW = this.PICKER_SAT_SELECTOR_W/2;

			var hsv = col.toHsv(),
				ypos = Math.round(this.PICKER_HUE_H - hsv.h / 360 * this.PICKER_HUE_H) - hueSelCenter,
				newLeft = Math.round(hsv.s / 100 * this.PICKER_SAT_VAL_W) - satSelCenterW,
				newTop = Math.round(this.PICKER_SAT_VAL_H - hsv.v / 100 * this.PICKER_SAT_VAL_H) - satSelCenterH
			;
			
			if(this.animatePoint){
				fx.slideTo({
					node: this.hueCursorNode,
					duration: this.slideDuration,
					top: ypos,
					left: 0
				}).play();
				
				fx.slideTo({
					node: this.cursorNode,
					duration: this.slideDuration,
					top: newTop,
					left: newLeft
				}).play();
				
			}
			else {
				html.style(this.hueCursorNode, "top", ypos + "px");
				html.style(this.cursorNode, {
					left: newLeft + "px",
					top: newTop + "px"
				});
			}
			
			// limit hue calculations to only when it changes
			if(hsv.h != this._hue){
				this._setHue(hsv.h);
			}
			
		},
		
		_updateColorInputs: function(/* dojox/color/Color */ col){
			// summary:
			//		updates color inputs that were changed through other inputs
			//		or by clicking on the picker
			
			var hex = col.toHex();
			
			if(this.showRgb){
				this.Rval.value = col.r;
				this.Gval.value = col.g;
				this.Bval.value = col.b;
			}
			
			if(this.showHsv){
				var hsv = col.toHsv();
				this.Hval.value = Math.round((hsv.h)); // convert to 0..360
				this.Sval.value = Math.round(hsv.s);
				this.Vval.value = Math.round(hsv.v);
			}
			
			if(this.showHex){
				this.hexCode.value = hex;
			}
			
			this.previewNode.style.backgroundColor = hex;
			
			if(this.webSafe){
				this.safePreviewNode.style.backgroundColor = webSafeFromHex(hex);
			}
		},
		
		_setHuePoint: function(/* Event */evt){
			// summary:
			//		set the hue picker handle on relative y coordinates
			var selCenter = this.PICKER_HUE_SELECTOR_H/2;
			var ypos = evt.layerY - selCenter;
			if(this.animatePoint){
				fx.slideTo({
					node: this.hueCursorNode,
					duration:this.slideDuration,
					top: ypos,
					left: 0,
					onEnd: lang.hitch(this, function(){ this._updateColor(true); FocusManager.focus(this.hueCursorNode); })
				}).play();
			}else{
				html.style(this.hueCursorNode, "top", ypos + "px");
				this._updateColor(false);
			}
		},
		
		_setPoint: function(/* Event */evt){
			// summary:
			//		set our picker point based on relative x/y coordinates

			//	evt.preventDefault();
			var satSelCenterH = this.PICKER_SAT_SELECTOR_H/2;
			var satSelCenterW = this.PICKER_SAT_SELECTOR_W/2;
			var newTop = evt.layerY - satSelCenterH;
			var newLeft = evt.layerX - satSelCenterW;
			
			if(evt){ FocusManager.focus(evt.target); }

			if(this.animatePoint){
				fx.slideTo({
					node: this.cursorNode,
					duration: this.slideDuration,
					top: newTop,
					left: newLeft,
					onEnd: lang.hitch(this, function(){ this._updateColor(true); FocusManager.focus(this.cursorNode); })
				}).play();
			}else{
				html.style(this.cursorNode, {
					left: newLeft + "px",
					top: newTop + "px"
				});
				this._updateColor(false);
			}
		},
		
		_handleKey: function(/* Event */e){
			// TODO: not implemented YET
			// var keys = d.keys;
		},

		focus: function(){
			// summary:
			//		Put focus on this widget, only if focus isn't set on it already.
			if(!this.focused){
				FocusManager.focus(this.focusNode);
			}
		},

		_stopDrag: function(e){
			// summary:
			//		Function to halt the mouse down default
			//		to disable dragging of images out of the color
			//		picker.
			Event.stop(e);
		},

		destroy: function(){
			// summary:
			//		Over-ride to clean up subscriptions, etc.
			this.inherited(arguments);
			ArrayUtil.forEach(this._subs, function(sub){
				Hub.unsubscribe(sub);
			});
			delete this._subs;
		}
	});
});

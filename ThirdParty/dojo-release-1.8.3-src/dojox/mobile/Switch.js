define([
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/touch",
	"dijit/_Contained",
	"dijit/_WidgetBase",
	"./sniff"
], function(array, connect, declare, event, win, domClass, domConstruct, domStyle, touch, Contained, WidgetBase, has){

	// module:
	//		dojox/mobile/Switch

	return declare("dojox.mobile.Switch", [WidgetBase, Contained],{
		// summary:
		//		A toggle switch with a sliding knob.
		// description:
		//		Switch is a toggle switch with a sliding knob. You can either
		//		tap or slide the knob to toggle the switch. The onStateChanged
		//		handler is called when the switch is manipulated.

		// value: String
		//		The initial state of the switch. "on" or "off". The default
		//		value is "on".
		value: "on",

		// name: String
		//		A name for a hidden input field, which holds the current value.
		name: "",

		// leftLabel: String
		//		The left-side label of the switch.
		leftLabel: "ON",

		// rightLabel: String
		//		The right-side label of the switch.
		rightLabel: "OFF",

		// shape: String
		//		The shape of the switch.
		//		"mblSwDefaultShape", "mblSwSquareShape", "mblSwRoundShape1",
		//		"mblSwRoundShape2", "mblSwArcShape1" or "mblSwArcShape2".
		//		The default value is "mblSwDefaultShape".
		shape: "mblSwDefaultShape",

		// tabIndex: String
		//		Tabindex setting for this widget so users can hit the tab key to
		//		focus on it.
		tabIndex: "0",
		_setTabIndexAttr: "", // sets tabIndex to domNode

		/* internal properties */
		baseClass: "mblSwitch",
		// role: [private] String
		//		The accessibility role.
		role: "", // a11y
		_createdMasks: [],

		buildRendering: function(){
			this.domNode = (this.srcNodeRef && this.srcNodeRef.tagName === "SPAN") ?
				this.srcNodeRef : domConstruct.create("span");
			this.inherited(arguments);
			var c = (this.srcNodeRef && this.srcNodeRef.className) || this.className || this["class"];
			if((c = c.match(/mblSw.*Shape\d*/))){ this.shape = c; }
			domClass.add(this.domNode, this.shape);
			var nameAttr = this.name ? " name=\"" + this.name + "\"" : "";
			this.domNode.innerHTML =
				  '<div class="mblSwitchInner">'
				+	'<div class="mblSwitchBg mblSwitchBgLeft">'
				+		'<div class="mblSwitchText mblSwitchTextLeft"></div>'
				+	'</div>'
				+	'<div class="mblSwitchBg mblSwitchBgRight">'
				+		'<div class="mblSwitchText mblSwitchTextRight"></div>'
				+	'</div>'
				+	'<div class="mblSwitchKnob"></div>'
				+	'<input type="hidden"'+nameAttr+'></div>'
				+ '</div>';
			var n = this.inner = this.domNode.firstChild;
			this.left = n.childNodes[0];
			this.right = n.childNodes[1];
			this.knob = n.childNodes[2];
			this.input = n.childNodes[3];
		},

		postCreate: function(){
			this._clickHandle = this.connect(this.domNode, "onclick", "_onClick");
			this._keydownHandle = this.connect(this.domNode, "onkeydown", "_onClick"); // for desktop browsers
			this._startHandle = this.connect(this.domNode, touch.press, "onTouchStart");
			this._initialValue = this.value; // for reset()
		},

		_changeState: function(/*String*/state, /*Boolean*/anim){
			var on = (state === "on");
			this.left.style.display = "";
			this.right.style.display = "";
			this.inner.style.left = "";
			if(anim){
				domClass.add(this.domNode, "mblSwitchAnimation");
			}
			domClass.remove(this.domNode, on ? "mblSwitchOff" : "mblSwitchOn");
			domClass.add(this.domNode, on ? "mblSwitchOn" : "mblSwitchOff");

			var _this = this;
			setTimeout(function(){
				_this.left.style.display = on ? "" : "none";
				_this.right.style.display = !on ? "" : "none";
				domClass.remove(_this.domNode, "mblSwitchAnimation");
			}, anim ? 300 : 0);
		},

		_createMaskImage: function(){
			if(this._hasMaskImage){ return; }
			this._width = this.domNode.offsetWidth - this.knob.offsetWidth;
			this._hasMaskImage = true;
			if(!has("webkit")){ return; }
			var rDef = domStyle.get(this.left, "borderTopLeftRadius");
			if(rDef == "0px"){ return; }
			var rDefs = rDef.split(" ");
			var rx = parseFloat(rDefs[0]), ry = (rDefs.length == 1) ? rx : parseFloat(rDefs[1]);
			var w = this.domNode.offsetWidth, h = this.domNode.offsetHeight;
			var id = (this.shape+"Mask"+w+h+rx+ry).replace(/\./,"_");
			if(!this._createdMasks[id]){
				this._createdMasks[id] = 1;
				var ctx = win.doc.getCSSCanvasContext("2d", id, w, h);
				ctx.fillStyle = "#000000";
				ctx.beginPath();
				if(rx == ry){
					// round arc
					ctx.moveTo(rx, 0);
					ctx.arcTo(0, 0, 0, rx, rx);
					ctx.lineTo(0, h - rx);
					ctx.arcTo(0, h, rx, h, rx);
					ctx.lineTo(w - rx, h);
					ctx.arcTo(w, h, w, rx, rx);
					ctx.lineTo(w, rx);
					ctx.arcTo(w, 0, w - rx, 0, rx);
				}else{
					// elliptical arc
					var pi = Math.PI;
					ctx.scale(1, ry/rx);
					ctx.moveTo(rx, 0);
					ctx.arc(rx, rx, rx, 1.5 * pi, 0.5 * pi, true);
					ctx.lineTo(w - rx, 2 * rx);
					ctx.arc(w - rx, rx, rx, 0.5 * pi, 1.5 * pi, true);
				}
				ctx.closePath();
				ctx.fill();
			}
			this.domNode.style.webkitMaskImage = "-webkit-canvas(" + id + ")";
		},

		_onClick: function(e){
			// summary:
			//		Internal handler for click events.
			// tags:
			//		private
			if(e && e.type === "keydown" && e.keyCode !== 13){ return; }
			if(this.onClick(e) === false){ return; } // user's click action
			if(this._moved){ return; }
			this.value = this.input.value = (this.value == "on") ? "off" : "on";
			this._changeState(this.value, true);
			this.onStateChanged(this.value);
		},

		onClick: function(/*Event*/ /*===== e =====*/){
			// summary:
			//		User defined function to handle clicks
			// tags:
			//		callback
		},

		onTouchStart: function(/*Event*/e){
			// summary:
			//		Internal function to handle touchStart events.
			this._moved = false;
			this.innerStartX = this.inner.offsetLeft;
			if(!this._conn){
				this._conn = [
					this.connect(this.inner, touch.move, "onTouchMove"),
					this.connect(this.inner, touch.release, "onTouchEnd")
				];
			}
			this.touchStartX = e.touches ? e.touches[0].pageX : e.clientX;
			this.left.style.display = "";
			this.right.style.display = "";
			event.stop(e);
			this._createMaskImage();
		},

		onTouchMove: function(/*Event*/e){
			// summary:
			//		Internal function to handle touchMove events.
			e.preventDefault();
			var dx;
			if(e.targetTouches){
				if(e.targetTouches.length != 1){ return; }
				dx = e.targetTouches[0].clientX - this.touchStartX;
			}else{
				dx = e.clientX - this.touchStartX;
			}
			var pos = this.innerStartX + dx;
			var d = 10;
			if(pos <= -(this._width-d)){ pos = -this._width; }
			if(pos >= -d){ pos = 0; }
			this.inner.style.left = pos + "px";
			if(Math.abs(dx) > d){
				this._moved = true;
			}
		},

		onTouchEnd: function(/*Event*/e){
			// summary:
			//		Internal function to handle touchEnd events.
			array.forEach(this._conn, connect.disconnect);
			this._conn = null;
			if(this.innerStartX == this.inner.offsetLeft){
				// #15936 The reason we send this synthetic click event is that we assume that the OS
				// will not send the click because we stopped the touchstart.
				// However, this does not seem true any more in Android 4.1 where the click is
				// actually sent by the OS. So we must not send it a second time.
				if(has('touch') && !(has("android") >= 4.1)){
					var ev = win.doc.createEvent("MouseEvents");
					ev.initEvent("click", true, true);
					this.inner.dispatchEvent(ev);
				}
				return;
			}
			var newState = (this.inner.offsetLeft < -(this._width/2)) ? "off" : "on";
			this._changeState(newState, true);
			if(newState != this.value){
				this.value = this.input.value = newState;
				this.onStateChanged(newState);
			}
		},

		onStateChanged: function(/*String*/newState){
			// summary:
			//		Stub function to connect to from your application.
			// description:
			//		Called when the state has been changed.
		},

		_setValueAttr: function(/*String*/value){
			this._changeState(value, false);
			if(this.value != value){
				this.onStateChanged(value);
			}
			this.value = this.input.value = value;
		},

		_setLeftLabelAttr: function(/*String*/label){
			this.leftLabel = label;
			this.left.firstChild.innerHTML = this._cv ? this._cv(label) : label;
		},

		_setRightLabelAttr: function(/*String*/label){
			this.rightLabel = label;
			this.right.firstChild.innerHTML = this._cv ? this._cv(label) : label;
		},

		reset: function(){
			// summary:
			//		Reset the widget's value to what it was at initialization time
			this.set("value", this._initialValue);
		}
	});
});

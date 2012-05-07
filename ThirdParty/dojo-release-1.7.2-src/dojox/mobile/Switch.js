define([
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/window",
	"dojo/dom-class",
	"dijit/_Contained",
	"dijit/_WidgetBase",
	"./sniff"
], function(array, connect, declare, event, win, domClass, Contained, WidgetBase, has){

/*=====
	Contained = dijit._Contained;
	WidgetBase = dijit._WidgetBase;
=====*/

	// module:
	//		dojox/mobile/Switch
	// summary:
	//		A toggle switch with a sliding knob.

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

		/* internal properties */	
		_width: 53,

		buildRendering: function(){
			this.domNode = win.doc.createElement("DIV");
			var c = (this.srcNodeRef && this.srcNodeRef.className) || this.className || this["class"];
			this._swClass = (c || "").replace(/ .*/,"");
			this.domNode.className = "mblSwitch";
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
			this.connect(this.domNode, "onclick", "onClick");
			this.connect(this.domNode, has('touch') ? "touchstart" : "onmousedown", "onTouchStart");
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

		startup: function(){
			if(this._swClass.indexOf("Round") != -1){
				var r = Math.round(this.domNode.offsetHeight / 2);
				this.createRoundMask(this._swClass, r, this.domNode.offsetWidth);
			}
		},
	
		createRoundMask: function(className, r, w){
			if(!has("webkit") || !className){ return; }
			if(!this._createdMasks){ this._createdMasks = []; }
			if(this._createdMasks[className]){ return; }
			this._createdMasks[className] = 1;
	
			var ctx = win.doc.getCSSCanvasContext("2d", className+"Mask", w, 100);
			ctx.fillStyle = "#000000";
			ctx.beginPath();
			ctx.moveTo(r, 0);
			ctx.arcTo(0, 0, 0, 2*r, r);
			ctx.arcTo(0, 2*r, r, 2*r, r);
			ctx.lineTo(w - r, 2*r);
			ctx.arcTo(w, 2*r, w, r, r);
			ctx.arcTo(w, 0, w - r, 0, r);
			ctx.closePath();
			ctx.fill();
		},
	
		onClick: function(e){
			if(this._moved){ return; }
			this.value = this.input.value = (this.value == "on") ? "off" : "on";
			this._changeState(this.value, true);
			this.onStateChanged(this.value);
		},
	
		onTouchStart: function(e){
			// summary:
			//		Internal function to handle touchStart events.
			this._moved = false;
			this.innerStartX = this.inner.offsetLeft;
			if(!this._conn){
				this._conn = [];
				this._conn.push(connect.connect(this.inner, has('touch') ? "touchmove" : "onmousemove", this, "onTouchMove"));
				this._conn.push(connect.connect(this.inner, has('touch') ? "touchend" : "onmouseup", this, "onTouchEnd"));
			}
			this.touchStartX = e.touches ? e.touches[0].pageX : e.clientX;
			this.left.style.display = "";
			this.right.style.display = "";
			event.stop(e);
		},
	
		onTouchMove: function(e){
			// summary:
			//		Internal function to handle touchMove events.
			e.preventDefault();
			var dx;
			if(e.targetTouches){
				if(e.targetTouches.length != 1){ return false; }
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
	
		onTouchEnd: function(e){
			// summary:
			//		Internal function to handle touchEnd events.
			array.forEach(this._conn, connect.disconnect);
			this._conn = null;
			if(this.innerStartX == this.inner.offsetLeft){
				if(has('touch')){
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

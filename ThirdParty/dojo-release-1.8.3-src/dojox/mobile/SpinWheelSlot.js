define([
	"dojo/_base/kernel",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dijit/_Contained",
	"dijit/_WidgetBase",
	"./scrollable"
], function(dojo, array, declare, lang, win, domClass, domConstruct, Contained, WidgetBase, Scrollable){

	// module:
	//		dojox/mobile/SpinWheelSlot

	return declare("dojox.mobile.SpinWheelSlot", [WidgetBase, Contained, Scrollable], {
		// summary:
		//		A slot of a SpinWheel.
		// description:
		//		SpinWheelSlot is a slot that is placed in the SpinWheel widget.

		// items: Array
		//		An array of array of key-label paris.
		//		(e.g. [[0,"Jan"],[1,"Feb"],...] ) If key values for each label
		//		are not necessary, labels can be used instead.
		items: [],

		// labels: Array
		//		An array of labels to be displayed on the slot.
		//		(e.g. ["Jan","Feb",...] ) This is a simplified version of the
		//		items property.
		labels: [],

		// labelFrom: Number
		//		The start value of display values of the slot. This parameter is
		//		especially useful when slot has serial values.
		labelFrom: 0,

		// labelTo: Number
		//		The end value of display values of the slot.
		labelTo: 0,

		// zeroPad: Number
		//		Length of zero padding numbers.
		//		Ex. zeroPad=2 -> "00", "01", ...
		//		Ex. zeroPad=3 -> "000", "001", ...
		zeroPad: 0,

		// value: String
		//		The initial value of the slot.
		value: "",

		// step: Number
		//		The steps between labelFrom and labelTo.
		step: 1,

		// tabIndex: String
		//		Tabindex setting for this widget so users can hit the tab key to
		//		focus on it.
		tabIndex: "0",
		_setTabIndexAttr: "", // sets tabIndex to domNode

		/* internal properties */	
		baseClass: "mblSpinWheelSlot",
		// maxSpeed: [private] Number
		//		Maximum speed.
		maxSpeed: 500,
		// minItems: [private] int
		//		Minimum number of items.
		minItems: 15,
		// centerPos: [private] Number
		//		Inherited from parent.
		centerPos: 0,
		// scrollbar: [private] Boolean
		//		False: no scrollbars must be shown.
		scrollBar: false,
		// constraint: [private] Boolean
		//		False: no scroll constraint.
		constraint: false,
		// propagatable: [private] Boolean
		//		False: stop touchstart event propagation.
		propagatable: false, // stop touchstart event propagation to make spin wheel work inside scrollable
		// androidWorkaroud: [private] Boolean
		//		False.
		androidWorkaroud: false, // disable workaround in SpinWheel TODO:remove this line later

		buildRendering: function(){
			this.inherited(arguments);

			this.initLabels();
			if(this.labels.length > 0){
				this.items = [];
				for(i = 0; i < this.labels.length; i++){
					this.items.push([i, this.labels[i]]);
				}
			}

			this.containerNode = domConstruct.create("div", {className:"mblSpinWheelSlotContainer"});
			this.containerNode.style.height
				= (win.global.innerHeight||win.doc.documentElement.clientHeight) * 2 + "px"; // must bigger than the screen
			this.panelNodes = [];
			for(var k = 0; k < 3; k++){
				this.panelNodes[k] = domConstruct.create("div", {className:"mblSpinWheelSlotPanel"});
				var len = this.items.length;
				var n = Math.ceil(this.minItems / len);
				for(j = 0; j < n; j++){
					for(i = 0; i < len; i++){
						domConstruct.create("div", {
							className: "mblSpinWheelSlotLabel",
							name: this.items[i][0],
							val: this.items[i][1],
							innerHTML: this._cv ? this._cv(this.items[i][1]) : this.items[i][1]
						}, this.panelNodes[k]);
					}
				}
				this.containerNode.appendChild(this.panelNodes[k]);
			}
			this.domNode.appendChild(this.containerNode);
			this.touchNode = domConstruct.create("div", {className:"mblSpinWheelSlotTouch"}, this.domNode);
			this.setSelectable(this.domNode, false);

			if(this.value === "" && this.items.length > 0){
				this.value = this.items[0][1];
			}
			this._initialValue = this.value;
		},

		startup: function(){
			if(this._started){ return; }
			this.inherited(arguments);
			this.noResize = true;
			this.init();
			this.centerPos = this.getParent().centerPos;
			var items = this.panelNodes[1].childNodes;
			this._itemHeight = items[0].offsetHeight;
			this.adjust();
			this._keydownHandle = this.connect(this.domNode, "onkeydown", "_onKeyDown"); // for desktop browsers
		},

		initLabels: function(){
			// summary:
			//		Initializes the slot labels according to the labelFrom/labelTo properties.
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

		adjust: function(){
			// summary:
			//		Adjusts the position of slot panels.
			var items = this.panelNodes[1].childNodes;
			var adjustY;
			for(var i = 0, len = items.length; i < len; i++){
				var item = items[i];
				if(item.offsetTop <= this.centerPos && this.centerPos < item.offsetTop + item.offsetHeight){
					adjustY = this.centerPos - (item.offsetTop + Math.round(item.offsetHeight/2));
					break;
				}
			}
			var h = this.panelNodes[0].offsetHeight;
			this.panelNodes[0].style.top = -h + adjustY + "px";
			this.panelNodes[1].style.top = adjustY + "px";
			this.panelNodes[2].style.top = h + adjustY + "px";
		},

		setInitialValue: function(){
			// summary:
			//		Sets the initial value using this.value or the first item.
			this.set("value", this._initialValue);
		},

		_onKeyDown: function(e){
			if(!e || e.type !== "keydown"){ return; }
			if(e.keyCode === 40){ // down arrow key
				this.spin(-1);
			}else if(e.keyCode === 38){ // up arrow key
				this.spin(1);
			}
		},

		_getCenterPanel: function(){
			// summary:
			//		Gets a panel that contains the currently selected item.
			var pos = this.getPos();
			for(var i = 0, len = this.panelNodes.length; i < len; i++){
				var top = pos.y + this.panelNodes[i].offsetTop;
				if(top <= this.centerPos && this.centerPos < top + this.panelNodes[i].offsetHeight){
					return this.panelNodes[i];
				}
			}
			return null;
		},

		setColor: function(/*String*/value, /*String?*/color){
			// summary:
			//		Sets the color of the specified item as blue.
			array.forEach(this.panelNodes, function(panel){
				array.forEach(panel.childNodes, function(node, i){
					domClass.toggle(node, color || "mblSpinWheelSlotLabelBlue", node.innerHTML === value);
				}, this);
			}, this);
		},

		disableValues: function(/*Number*/n){
			// summary:
			//		Makes the specified items grayed out.
			array.forEach(this.panelNodes, function(panel){
				for(var i = 27; i < 31; i++){
					domClass.toggle(panel.childNodes[i], "mblSpinWheelSlotLabelGray", i >= nDays);
				}
			});
		},

		getCenterItem: function(){
			// summary:
			//		Gets the currently selected item.
			var pos = this.getPos();
			var centerPanel = this._getCenterPanel();
			if(centerPanel){
				var top = pos.y + centerPanel.offsetTop;
				var items = centerPanel.childNodes;
				for(var i = 0, len = items.length; i < len; i++){
					if(top + items[i].offsetTop <= this.centerPos && this.centerPos < top + items[i].offsetTop + items[i].offsetHeight){
						return items[i];
					}
				}
			}
			return null;

		},

		_getKeyAttr: function(){
			// summary:
			//		Gets the key for the currently selected value.
			var item = this.getCenterItem();
			return (item && item.getAttribute("name"));
		},

		_getValueAttr: function(){
			// summary:
			//		Gets the currently selected value.
			var item = this.getCenterItem();
			return (item && item.getAttribute("val"));
		},

		_setValueAttr: function(value){
			// summary:
			//		Sets the value to this slot.
			var idx0, idx1;
			var curValue = this.get("value");
			if(!curValue){
				this._penddingValue = value;
				return;
			}
			this._penddingValue = undefined;
			this._set("value", value);
			var n = this.items.length;
			for(var i = 0; i < n; i++){
				if(this.items[i][1] === String(curValue)){
					idx0 = i;
				}
				if(this.items[i][1] === String(value)){
					idx1 = i;
				}
				if(idx0 !== undefined && idx1 !== undefined){
					break;
				}
			}
			var d = idx1 - (idx0 || 0);
			var m;
			if(d > 0){
				m = (d < n - d) ? -d : n - d;
			}else{
				m = (-d < n + d) ? -d : -(n + d);
			}
			this.spin(m);
		},

		stopAnimation: function(){
			// summary:
			//		Stops the currently running animation.
  			this.inherited(arguments);
  			this._set("value", this.get("value")); // ensure the watches are notified
		},	

		spin: function(/*Number*/steps){
			// summary:
			//		Spins the slot as specified by steps.
			if(!this._started){ return; } // do not work until start up
			var to = this.getPos();
			if(to.y % this._itemHeight){ return; } // maybe still spinning
			to.y += steps * this._itemHeight;
			this.slideTo(to, 1);
		},

		getSpeed: function(){
			// summary:
			//		Overrides dojox/mobile/scrollable.getSpeed().
			var y = 0, n = this._time.length;
			var delta = (new Date()).getTime() - this.startTime - this._time[n - 1];
			if(n >= 2 && delta < 200){
				var dy = this._posY[n - 1] - this._posY[(n - 6) >= 0 ? n - 6 : 0];
				var dt = this._time[n - 1] - this._time[(n - 6) >= 0 ? n - 6 : 0];
				y = this.calcSpeed(dy, dt);
			}
			return {x:0, y:y};
		},

		calcSpeed: function(/*Number*/d, /*Number*/t){
			// summary:
			//		Overrides dojox/mobile/scrollable.calcSpeed().
			var speed = this.inherited(arguments);
			if(!speed){ return 0; }
			var v = Math.abs(speed);
			var ret = speed;
			if(v > this.maxSpeed){
				ret = this.maxSpeed*(speed/v);
			}
			return ret;
		},

		adjustDestination: function(to, pos, dim){
			// summary:
			//		Overrides dojox/mobile/scrollable.adjustDestination().
			var h = this._itemHeight;
			var j = to.y + Math.round(h/2);
			var a = Math.abs(j);
			var r = j >= 0 ? j % h : j % h + h;
			to.y = j - r;
			return true;
		},

		resize: function(e){
			if(this._penddingValue){
				this.set("value", this._penddingValue);
			}
		},

		slideTo: function(/*Object*/to, /*Number*/duration, /*String*/easing){
			// summary:
			//		Overrides dojox/mobile/scrollable.slideTo().
			var pos = this.getPos();
			var top = pos.y + this.panelNodes[1].offsetTop;
			var bottom = top + this.panelNodes[1].offsetHeight;
			var vh = this.domNode.parentNode.offsetHeight;
			var t;
			if(pos.y < to.y){ // going down
				if(bottom > vh){
					// move up the bottom panel
					t = this.panelNodes[2];
					t.style.top = this.panelNodes[0].offsetTop - this.panelNodes[0].offsetHeight + "px";
					this.panelNodes[2] = this.panelNodes[1];
					this.panelNodes[1] = this.panelNodes[0];
					this.panelNodes[0] = t;
				}
			}else if(pos.y > to.y){ // going up
				if(top < 0){
					// move down the top panel
					t = this.panelNodes[0];
					t.style.top = this.panelNodes[2].offsetTop + this.panelNodes[2].offsetHeight + "px";
					this.panelNodes[0] = this.panelNodes[1];
					this.panelNodes[1] = this.panelNodes[2];
					this.panelNodes[2] = t;
				}
			}
			if(!this._initialized){
				duration = 0; // to reduce flickers at start-up especially on android
				this._initialized = true;
			}else if(Math.abs(this._speed.y) < 40){
				duration = 0.2;
			}
			this.inherited(arguments, [to, duration, easing]); // 2nd arg is to avoid excessive optimization by closure compiler
		}
	});
});

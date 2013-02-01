define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/window", "dojo/on", "dojo/_base/connect", "dojo/_base/fx", "dojox/gfx", "dojox/widget/_Invalidating", "./IndicatorBase"],
	function(lang, declare, win, on, connect, fx, gfx, _Invalidating, IndicatorBase){
	return declare("dojox.dgauges.ScaleIndicatorBase", IndicatorBase, {
		// summary:
		//		The base class for indicators that rely on a scale for their rendering.
		//		Typically, value indicators and range indicators are subclasses of ScaleIndicatorBase.

		// summary:
		//		The scale associated with this indicator.
		scale: null,
		// summary:
		//		The value of the indicator. Default is 0.
		value: 0,
		
		// interactionArea: String
		//		How to interact with the indicator using mouse or touch interactions.
		//		Can be "indicator", "gauge", "area" or "none". The default value is "gauge".
		//		If set to "indicator", the indicator shape reacts to mouse and touch events.
		//		If set to "gauge", the whole gauge reacts to mouse and touch events.
		//		If set to "area", the whole bounding box of the widget reacts to mouse and touch events.
		//		If "none", interactions are disabled.
		interactionArea: "gauge",

		// interactionMode: String
		//		Can be "mouse" or "touch".
		interactionMode: "mouse",

		// animationDuration: Number
		//		The duration of the value change animation in milliseconds. Default is 0.
		//		The animation occurs on both user interactions and programmatic value changes.
		//		Set this property to 0 to disable animation.
		animationDuration: 0,

		// animationEaser: Object
		//		The easer function of the value change animation. Default is fx._defaultEasing.
		animationEaser: null,

		_indicatorShapeFuncFlag: true,
		
		_interactionAreaFlag: true,
		
		_downListeners: null,
		
		_cursorListeners: null,
		
		_moveAndUpListeners: null,
		
		_transitionValue: NaN,
		
		_preventAnimation: false,
		
		_animation: null,
		
		constructor: function(){
		
			// watches changed happening on the "value" property to call this.valueChanged() function which
			// can be listen by user with connect.connect
			this.watch("value", lang.hitch(this, function(){
				this.valueChanged(this);
			}));
			this.watch("value", lang.hitch(this, this._startAnimation));
			
			this.watch("interactionArea", lang.hitch(this, function(){
				this._interactionAreaFlag = true;
			}));
			this.watch("interactionMode", lang.hitch(this, function(){
				this._interactionAreaFlag = true;
			}));
			
			this.watch("indicatorShapeFunc", lang.hitch(this, function(){
				this._indicatorShapeFuncFlag = true;
			}));
			
			this.addInvalidatingProperties(["scale", "value", "indicatorShapeFunc", "interactionArea", "interactionMode"]);
			
			this._downListeners = [];
			this._moveAndUpListeners = [];
			this._cursorListeners = [];
		},
		
		_startAnimation: function(prop, oldValue, newValue){
			// summary:
			//		Internal method.
			// tags:
			//		private
			if(this.animationDuration == 0){
				return;
			}
			if(this._animation && (this._preventAnimation || oldValue == newValue)){
				this._animation.stop();
				return;
			}
			this._animation = new fx.Animation({curve: [oldValue, newValue], 
										duration: this.animationDuration, 
										easing: this.animationEaser ? this.animationEaser : fx._defaultEasing,
										onAnimate: lang.hitch(this, this._updateAnimation),
										onEnd: lang.hitch(this, this._endAnimation),
										onStop: lang.hitch(this, this._endAnimation)});
			
			this._animation.play();
		},
		
		_updateAnimation: function(v){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this._transitionValue = v;
			this.invalidateRendering();
		},
		
		_endAnimation: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this._transitionValue = NaN; 
			this.invalidateRendering();			
		},
		
		refreshRendering: function(){
			if(this._gfxGroup == null || this.scale == null){
				return;
			}else{
				if(this._indicatorShapeFuncFlag && lang.isFunction(this.indicatorShapeFunc)){
					this._gfxGroup.clear();
					this.indicatorShapeFunc(this._gfxGroup, this);
					this._indicatorShapeFuncFlag = false;
				}
				
				if(this._interactionAreaFlag){
					this._interactionAreaFlag = this._connectDownListeners();
				}
			}
		},
		
		valueChanged: function(indicator){
			// summary:
			//		Invoked when the value of the indicator changes.
			//		User can connect an listener on this function: 
			// |	connect.connect(theIndicator, "valueChanged", lang.hitch(this, function(){
			// |		//do something
			// |	}));
			on.emit(this, "valueChanged", {
				target: this,
				bubbles: true,
				cancelable: true
			});
		},
		
		_disconnectDownListeners: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			for(var i = 0; i < this._downListeners.length; i++){
				connect.disconnect(this._downListeners[i]);
			}
			this._downListeners = [];
		},
		
		_disconnectMoveAndUpListeners: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			for(var i = 0; i < this._moveAndUpListeners.length; i++){
				connect.disconnect(this._moveAndUpListeners[i]);
			}
			this._moveAndUpListeners = [];
		},
		
		_disconnectListeners: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this._disconnectDownListeners();
			this._disconnectMoveAndUpListeners();
			this._disconnectCursorListeners();
		},
		
		_connectCursorListeners: function(target){
			// summary:
			//		Internal method.
			// tags:
			//		private
			var listener = target.connect("onmouseover", this, function(){
				this.scale._gauge._setCursor("pointer");
			});
			this._cursorListeners.push(listener);
			listener = target.connect("onmouseout", this, function(event){
					this.scale._gauge._setCursor("");
				}
			);
			this._cursorListeners.push(listener);
		},
		
		_disconnectCursorListeners: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			for(var i = 0; i < this._cursorListeners.length; i++){
				connect.disconnect(this._cursorListeners[i]);
			}
			this._cursorListeners = [];
		},

		_connectDownListeners: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this._disconnectDownListeners();
			this._disconnectCursorListeners();
			var listener = null;
			var downEventName;
			if(this.interactionMode == "mouse"){
				downEventName = "onmousedown";
			}else if(this.interactionMode == "touch"){
				downEventName = "ontouchstart";
			}
			
			if(this.interactionMode == "mouse" || this.interactionMode == "touch"){
				if(this.interactionArea == "indicator"){
					listener = this._gfxGroup.connect(downEventName, this, this._onMouseDown);
					this._downListeners.push(listener);
					if (this.interactionMode == "mouse") {
						this._connectCursorListeners(this._gfxGroup);
					}
				}else if(this.interactionArea == "gauge"){
					if(!this.scale || !this.scale._gauge || !this.scale._gauge._gfxGroup){
						return true;
					}
					listener = this.scale._gauge._gfxGroup.connect(downEventName, this, this._onMouseDown);
					this._downListeners.push(listener);
					listener = this._gfxGroup.connect(downEventName, this, this._onMouseDown);
					this._downListeners.push(listener);
					if (this.interactionMode == "mouse") {
						this._connectCursorListeners(this.scale._gauge._gfxGroup);
					}
				}else if(this.interactionArea == "area"){
					if(!this.scale || !this.scale._gauge || !this.scale._gauge._baseGroup){
						return true;
					}
					listener = this.scale._gauge._baseGroup.connect(downEventName, this, this._onMouseDown);
					this._downListeners.push(listener);
					listener = this._gfxGroup.connect(downEventName, this, this._onMouseDown);
					this._downListeners.push(listener);
					if (this.interactionMode == "mouse") {
						this._connectCursorListeners(this.scale._gauge._baseGroup);
					}
				}
			}
			return false;
		},
		
		_connectMoveAndUpListeners: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			var listener = null;
			var moveEventName;
			var upEventName;
			if(this.interactionMode == "mouse"){
				moveEventName = "onmousemove";
				upEventName = "onmouseup";
			}else if(this.interactionMode == "touch"){
				moveEventName = "ontouchmove";
				upEventName = "ontouchend";
			}
			
			listener = connect.connect(win.doc, moveEventName, this, this._onMouseMove);
			this._moveAndUpListeners.push(listener);
			
			listener = connect.connect(win.doc, upEventName, this, this._onMouseUp);
			this._moveAndUpListeners.push(listener);
		},
		
		_onMouseDown: function(event){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this._connectMoveAndUpListeners();
			this._startEditing();
		},
		
		_onMouseMove: function(event){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this._preventAnimation = true;
			if(this._animation){
				this._animation.stop();
			}
		},
		
		_onMouseUp: function(event){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this._disconnectMoveAndUpListeners();
			this._preventAnimation = false;
			this._endEditing();
		},
		
		_startEditing: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			if(!this.scale || !this.scale._gauge){
				return;
			}else{
				this.scale._gauge.onStartEditing({
					indicator: this
				});
			}
		},
		
		_endEditing: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			if(!this.scale || !this.scale._gauge){
				return;
			}else{
				this.scale._gauge.onEndEditing({
					indicator: this
				});
			}
		}
		
	});
});

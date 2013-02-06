define(["dojo/_base/declare", "dojo/_base/event", "dojo/_base/lang", "dojo/on", "dojo/dom-style", "dijit/_WidgetBase"],
function(declare, event, lang, on, domStyle, _WidgetBase){
	
		return declare('dojox.calendar._VerticalScrollBarBase', _WidgetBase, {
		
		// value: Number 
		//		The value of the scroll bar in pixel offset.
		value: 0,
		
		// minimum: Number 
		//		The minimum value of the scroll bar.
		minimum: 0,
		
		// maximum: Number 
		//		The maximum value of the scroll bar.
		maximum: 100,
		
		_scrollHandle: null,
		
		buildRendering: function(){
			this.inherited(arguments);
			this._scrollHandle = on(this.domNode, "scroll", lang.hitch(this, function(param) {
				this.value = this._getDomScrollerValue();
				this.onChange(this.value);
				this.onScroll(this.value);
			}));
		},
		
		destroy: function(preserveDom){
			this._scrollHandle.remove();
			this.inherited(arguments);
		},

		_getDomScrollerValue : function() {
			return this.domNode.scrollTop;
		},
		
		_setDomScrollerValue : function(value) {
			this.domNode.scrollTop = value;	
		},
			
		_setValueAttr: function(value){
			value = Math.min(this.maximum, value);
			value = Math.max(this.minimum, value);
			if (this.value != value) {
				this.value = value;			 
				this.onChange(value);
				this._setDomScrollerValue(value);
			}
		},
				
		onChange: function(value){
			// summary:
			//		 An extension point invoked when the value has changed.
			// value: Integer
			//		The postiion of the scroll bar in pixels.
			// tags:
			//		callback
		},
		
		onScroll: function(value){
			// summary:
			//		 An extension point invoked when the user scrolls with the mouse.
			// value: Integer
			//		The position of the scroll bar in pixels.
			// tags:
			//		callback
		},
		
		_setMinimumAttr: function(value){
			value = Math.min(value, this.maximum);
			this.minimum = value;
		},
		
		_setMaximumAttr: function(value){
			value = Math.max(value, this.minimum);
			this.maximum = value;
			
			domStyle.set(this.content, "height", value + "px");
		}

	});

});

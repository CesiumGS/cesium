define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/sniff", "dojo/_base/array", "dojo/on", "dojox/gfx", "./IndicatorBase"],
	function(lang, declare, has, array, on, gfx, IndicatorBase){
	return declare("dojox.dgauges.TextIndicator", IndicatorBase, {
		// summary:
		//		This type of indicator is used to render text.
		//		To render an arbitrary text, set the value property.
		//		To render the value of a value indicator or a range indicator, set the indicator property.
		//		Setting the indicator property takes precedence on setting the value property.
		//		When the indicator property is set, the text is automatically updated on value changes.

		// font: Object
		//		Font used by this element.
		font: null,
		// x: Number
		//		The text anchor x-position. Default is 0.
		x: 0,
		// y: Number
		//		The text anchor y-position. Default is 0.
		y: 0,
		// align: String
		//		An alignment of a text in regards to the anchor position:
		//
		//		- "start": A text's baseline starts at the anchor. 
		//		This is the default value of the align attribute.
		//		- "middle": A text's baseline is centered on the anchor point.
		//		- "end": A text's baseline ends at the anchor point.
		align: "middle",
		// color: Object
		//		The color of the text.
		color: "black",
		// indicator: dojox/dgauges/IndicatorBase
		//		If this property is set, the value of the indicator is automatically
		//		rendered by this text element.
		indicator: null,
		// labelFunc: Object
		//		If set, this method allows to format the value of this text indicator.
		//		A label function takes the text to render as argument and returns a String. 
		labelFunc: null,
		
		constructor: function(){
			this.addInvalidatingProperties(["indicator"]);

			var resetProps = ["x", "y", "font", "align", "color", "labelFunc"];
			array.forEach(resetProps, lang.hitch(this, function(entry){
				this.watch(entry, this._resetText);
			}));
			
			this.watch("indicator", lang.hitch(this, this._indicatorChanged));
		},

		postscript: function(mixin){
			// summary:
			//		Internal method
			// tags:
			//		private
			this.inherited(arguments);
			if(mixin && mixin.indicator){
				this._indicatorChanged("indicator", null, mixin.indicator);
			}
		},
		
		_resetText: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this._textCreated = false;
			this.invalidateRendering();
		},
		
		_valueWatcher: null,
		
		_indicatorChanged: function(name, oldValue, newValue){
			// summary:
			//		Internal method.
			// tags:
			//		private
			if(this._valueWatcher){
				this._valueWatcher.unwatch();
			}
			this._valueWatcher = newValue.watch("value", lang.hitch(this, this.refreshRendering));
		},
		
		_getFont: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			var font = this.font;
			if(!font && this._gauge){
				font = this._gauge.font;
			}
			if(!font){
				font = gfx.defaultFont;
			}
			return font;
		},
		
		_textCreated: false,
		_textInstance: null,
		
		_createText: function(group, font, color, text, x, y, align){
			// summary:
			//		Internal method.
			// tags:
			//		private
			var gfxText = group.createText({
				x: x,
				y: y,
				text: text,
				align: align
			}).setFont(font).setFill(color);
			return gfxText;
		},
		
		refreshRendering: function(){
			if(this._gfxGroup == null){
				return;
			}
			var text;
			if(this.indicator){
				text = this.indicator.value;
			}else{
				text = this.value;
			}
			if(this.labelFunc){
				text = this.labelFunc(text);
			}
			var iOsVersion = has("iphone");
			// Workaround for a bug on iOS version < 5.0: Recreate the text every times
			if(!this._textCreated || (iOsVersion != undefined && iOsVersion < 5)){
				this._gfxGroup.clear();
				var font = this._getFont();
				this._textInstance = this._createText(this._gfxGroup, font, font.color ? font.color : this.color, "", this.x, this.y, this.align);
				this._textCreated = true;
			}
			this._textInstance.setShape({
				text: text
			});
			
			return this._textInstance;
		}
	})
});

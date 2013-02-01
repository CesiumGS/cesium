define(["dojo/_base/lang", "dojo/_base/declare", "dojox/gfx", "dojo/_base/array", "dojox/widget/_Invalidating", "dojo/_base/sniff"],
	function(lang, declare, gfx, array, _Invalidating, has){
	return declare("dojox.dgauges.ScaleBase", _Invalidating, {
		// summary:
		//		The ScaleBase class is the base class for the circular and rectangular scales.
		//		A scaler must be set to use this class. A scaler is responsible for
		//		tick generation and various data-transform operations.	

		// scaler: Object
		//		The scaler used for tick generation and data-transform operations.
		//		This property is mandatory for using the scale.
		scaler: null,
		// font: Object
		//		The font used for the ticks labels.
		//		This is null by default which means this scale use the font defined 
		//		on the gauge.
		font: null,
		// labelPosition: String
		//		See CircularScale and RectangularScale for valid values.
		labelPosition: null,
		// labelGap: Number
		//		The label gap between the ticks and their labels. Default value is 1.
		labelGap: 1,
		// tickStroke: Object
		//		The GFX stroke used by the default tickShapeFunc implementation.
		tickStroke: null,
		_gauge: null,
		_gfxGroup: null,
		_bgGroup: null,
		_fgGroup: null,
		_indicators: null,
		_indicatorsIndex: null,
		_indicatorsRenderers: null,
		
		constructor: function(){
			this._indicators = [];
			this._indicatorsIndex = {};
			this._indicatorsRenderers = {};
			this._gauge = null;
			this._gfxGroup = null;
			// Fix for #1, IE<9 don't render correctly stroke with width<1
			this.tickStroke = {color: "black", width: has("ie") <= 8 ? 1 : 0.5};
			
			this.addInvalidatingProperties(["scaler", "font", "labelGap", "labelPosition", "tickShapeFunc", "tickLabelFunc", "tickStroke"]);
			
			this.watch("scaler", lang.hitch(this, this._watchScaler));
		},

		postscript: function(mixin){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this.inherited(arguments);
			if(mixin && mixin.scaler){
				this._watchScaler("scaler", null, mixin.scaler);
			}
		},
		
		_watchers: null,

		_watchScaler: function(name, oldValue, newValue){
			// summary:
			//		Internal method.
			// tags:
			//		private
			array.forEach(this._watchers, lang.hitch(this, function(entry){
				entry.unwatch();
			}));

			// Get the properties declared by the watched object
			var props = newValue.watchedProperties;
			this._watchers = [];
			array.forEach(props, lang.hitch(this, function(entry){
				this._watchers.push(newValue.watch(entry, lang.hitch(this, this.invalidateRendering)));
			}));
		},
		
		_getFont: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			var font = this.font;
			if(!font){
				font = this._gauge.font;
			}
			if(!font){
				font = gfx.defaultFont;
			}
			return font;
		},
		
		positionForValue: function(value){
			// summary:
			//		See CircularScale and Rectangular for more informations.
			// value: Number
			//		The value to convert.
			// returns: Number
			//		The position corresponding to the value.
			return 0;
		},
		
		valueForPosition: function(position){
			// summary:
			//		See CircularScale and Rectangular for more informations.
			// position: Number
			//		The position to convert.
			// returns: Number
			//		The value corresponding to the position.
		},
		
		tickLabelFunc: function(tickItem){
			// summary:
			//		Customize the text of ticks labels.
			// tickItem: Object
			//		An object containing the tick informations.
			// returns: String
			//		The text to be aligned with the tick. If null, the tick has no label.
			if(tickItem.isMinor){
				return null;
			}else{
				return String(tickItem.value);
			}
		},
		
		tickShapeFunc: function(group, scale, tickItem){
			// summary:
			//		Customize the shape of ticks.
			// group: dojox/gfx/Group
			//		The GFX group used for drawing the tick.
			// scale: dojox/dgauges/ScaleBase
			//		The scale being processed.
			// tickItem: Object
			//		An object containing the tick informations.
			return group.createLine({
				x1: 0,
				y1: 0,
				x2: tickItem.isMinor ? 6 : 10,
				y2: 0
			}).setStroke(this.tickStroke);
		},
		
		getIndicatorRenderer: function(name){
			// summary:
			//		Gets the GFX shape of an indicator.
			// name: String
			//		The name of the indicator as defined using addIndicator.
			// returns: dojox/gfx/canvas/Shape
			//		The GFX shape of the indicator.
			return this._indicatorsRenderers[name];
		},
		
		removeIndicator: function(name){
			// summary:
			//		Removes an indicator.
			// name: String
			//		The name of the indicator as defined using addIndicator.
			// returns: IndicatorBase
			//		The removed indicator.
			var indicator = this._indicatorsIndex[name];
			if(indicator){
				indicator._gfxGroup.removeShape();
				var idx = this._indicators.indexOf(indicator);
				this._indicators.splice(idx, 1);
				
				indicator._disconnectListeners();
				
				delete this._indicatorsIndex[name];
				delete this._indicatorsRenderers[name];
			}
			if(this._gauge){
				this._gauge._resetMainIndicator();
			}
			this.invalidateRendering();
			return indicator;
		},
		
		getIndicator: function(name){
			// summary:
			//		Get an indicator instance.
			// name: String
			//		The name of the indicator as defined using addIndicator.
			// returns: IndicatorBase
			//		The indicator associated with the name parameter.
			return this._indicatorsIndex[name];
		},
		
		addIndicator: function(name, indicator, behindScale){
			// summary:
			//		Add an indicator to the scale. Before calling this function, ensure 
			//		this scale has already been added to a gauge using the addElement method
			//		of the gauge.
			// name: String
			//		The name of the indicator to be added.
			// indicator: dojox/dgauges/IndicatorBase
			//		The indicator to add to this scale.
			// behindScale: Boolean
			//		If true, this indicator is drawn behind the scale. Default value is false.	
			if(this._indicatorsIndex[name] && this._indicatorsIndex[name] != indicator){
				this.removeIndicator(name);
			}
			
			this._indicators.push(indicator);
			this._indicatorsIndex[name] = indicator;
			
			if(!this._ticksGroup){
				this._createSubGroups();
			}
			
			var group = behindScale ? this._bgGroup : this._fgGroup;
			indicator._gfxGroup = group.createGroup();
			
			indicator.scale = this;
			
			return this.invalidateRendering();
		},
		
		_createSubGroups: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			if(!this._gfxGroup || this._ticksGroup){
				return;
			}
			this._bgGroup = this._gfxGroup.createGroup();
			this._ticksGroup = this._gfxGroup.createGroup();
			this._fgGroup = this._gfxGroup.createGroup();
		},
		
		refreshRendering: function(){
			if(!this._ticksGroup){
				this._createSubGroups();
			}
		}
	});
});

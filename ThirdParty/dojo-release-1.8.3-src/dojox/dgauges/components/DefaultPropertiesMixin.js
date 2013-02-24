define(["dojo/_base/declare", "dojo/_base/Color"], function(declare, Color){
	return declare("dojox.dgauges.components.DefaultPropertiesMixin", null, {
		// summary:
		//		This class defines default properties of predefined gauges.

		// minimum: Number
		//		The minimum value of the scaler. Default is 0.
		minimum: 0,
		// maximum: Number
		//		The maximum value of the scaler. Default is 100.
		maximum: 100,
		// snapInterval:
		//		Specifies the increment value to be used as snap values on this scale 
		//		during user interaction.
		//		Default is 1.
		snapInterval: 1,
		// majorTickInterval: Number
		//		The interval between two major ticks.
		majorTickInterval: NaN,
		// minorTickInterval: Number
		//		The interval between two minor ticks.
		minorTickInterval: NaN,
		// minorTicksEnabled: Boolean
		//		If false, minor ticks are not generated. Default is true.
		minorTicksEnabled: true,

		// summary:
		//		The value of the indicator. Default is 0.
		value: 0,
		
		// interactionArea: String
		//		How to interact with the indicator using mouse or touch interactions.
		//		Can be "indicator", "gauge" or "none". The default value is "gauge".
		//		If set to "indicator", the indicator shape reacts to mouse and touch events.
		//		If set to "gauge", the whole gauge reacts to mouse and touch events.
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

		_setMinimumAttr: function(v){
			this.getElement("scale").scaler.set("minimum", v);
		},
		_setMaximumAttr: function(v){
			this.getElement("scale").scaler.set("maximum", v);
		},
		_setSnapIntervalAttr: function(v){
			this.getElement("scale").scaler.set("snapInterval", v);
		},
		_setMajorTickIntervalAttr: function(v){
			this.getElement("scale").scaler.set("majorTickInterval", v);
		},
		_setMinorTickIntervalAttr: function(v){
			this.getElement("scale").scaler.set("minorTickInterval", v);
		},
		_setMinorTicksEnabledAttr: function(v){
			this.getElement("scale").scaler.set("minorTicksEnabled", v);
		},
		_setInteractionAreaAttr: function(v){
			this.getElement("scale").getIndicator("indicator").set("interactionArea", v);
		},
		_setInteractionModeAttr: function(v){
			this.getElement("scale").getIndicator("indicator").set("interactionMode", v);
		},
		_setAnimationDurationAttr: function(v){
			this.getElement("scale").getIndicator("indicator").set("animationDuration", v);
		},
		_setBorderColorAttr: function(v){
			this.borderColor = new Color(v);
			this.invalidateRendering();
		},
		_setFillColorAttr: function(v){
			this.fillColor = new Color(v);
			this.invalidateRendering();
		},
		_setIndicatorColorAttr: function(v){
			this.indicatorColor = new Color(v);
			this.invalidateRendering();
		}
	});
});

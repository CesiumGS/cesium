define(["dojo/_base/lang","dojo/_base/declare","dojo/_base/fx","dojo/_base/html","dojo/_base/connect","dijit/_Widget","dojo/dom-construct", "dojo/dom-class"], 
function(lang,declare,fx,html,connect,Widget,dom,domClass) {

return declare("dojox.gauges._Indicator",[Widget],{
	// summary:
	//		An indicator to be used in a gauge
	//
	// description:
	//		An indicator widget, which has given properties.  drawn by a gauge.
	//
	// example:
	//	|	<script type="text/javascript">
	//	|		require(["dojox/gauges/AnalogGauge","dojox/gauges/Indicator"]);
	//	|	</script>
	//	|	...
	//	|	<div	dojoType="dojox.gauges.AnalogGauge"
	//	|			id="testGauge"
	//	|			width="300"
	//	|			height="200"
	//	|			cx=150
	//	|			cy=175
	//	|			radius=125
	//	|			image="gaugeOverlay.png"
	//	|			imageOverlay="false"
	//	|			imageWidth="280"
	//	|			imageHeight="155"
	//	|			imageX="12"
	//	|			imageY="38">
	//	|		<div 	dojoType="dojox.gauges.Indicator"
	//	|				value=17
	//	|				type="arrow"
	//	|				length=135
	//	|				width=3
	//	|				hover="Value: 17"
	//	|				onDragMove="handleDragMove">
	//	|		</div>
	//	|	</div>

	// value: Number
	//		The value (on the gauge) that this indicator should be placed at
	value: 0,

	// type: String
	//		The type of indicator to draw.  Varies by gauge type.  Some examples include
	//		"line", "arrow", and "bar"
	type: '',

	// color: String
	//		The color of the indicator.
	color: 'black',
	
	// strokeColor: String
	//		The color to stroke the outline of the indicator.
	strokeColor: '',

	// label: String
	//		The text label for the indicator.
	label: '',

	// font: Object
	//		The font for the indicator. The font is enerally in a format similar to:
	//		{family: "Helvetica", weight: "bold", style: "italic", size: "18pt", rotated: true}
	font: {family: "sans-serif", size: "12px"},

	// length: Number
	//		The length of the indicator.  In the above example, the radius of the AnalogGauge
	//		is 125, but the length of the indicator is 135, meaning it would project beyond
	//		the edge of the AnalogGauge
	length: 0,

	// width: Number
	//		The width of the indicator.
	width: 0,

	// offset: Number
	//		The offset of the indicator
	offset: 0,

	// hover: String
	//		The string to put in the tooltip when this indicator is hovered over.
	hover: '',

	// front: boolean
	//		Keep this indicator at the front
	front: false,

	// onDragMove: String
	//		The function to call when this indicator is moved by dragging.
	//		onDragMove: '',

	// easing: String|Object
	//		indicates the easing function to be used when animating the of an indicator.
	easing: fx._defaultEasing,

	// duration: Number
	//		indicates how long an animation of the indicator should take
	duration: 1000,

	// hideValues: Boolean
	//		Indicates whether the text boxes showing the value of the indicator (as text
	//		content) should be hidden or shown.  Default is not hidden, aka shown.
	hideValue: false,

	// noChange: Boolean
	//		Indicates whether the indicator's value can be changed.  Useful for
	//		a static target indicator.  Default is false (that the value can be changed).
	noChange: false,

	// interactionMode: String
	//		The interactionMode can have two values: "indicator" (the default) or "gauge".
	//		When the value is "indicator", the user must click on the indicator to change the value.
	//		When the value is "gauge", the user can click on the gauge to change the indicator value.
	//		If a gauge contains several indicators with the indicatorMode property set to "gauge", then
	//		only the first indicator will be moved when clicking the gauge.
	interactionMode: "indicator",
	
	_gauge: null,
	
	// title: String
	//		 The title of the indicator, to be displayed next to it's input box for the text-representation.
	title: "",

	startup: function(){
		if(this.onDragMove){
			this.onDragMove = lang.hitch(this.onDragMove);
		}
		if (this.strokeColor === ""){
			this.strokeColor = undefined;
		}
	},

	postCreate: function(){
		if(this.title === ""){
			html.style(this.domNode, "display", "none");
		}
		if(lang.isString(this.easing)){
			this.easing = lang.getObject(this.easing);
		}
	},
		
	buildRendering: function(){
		// summary:
		//		Overrides _Widget.buildRendering
		
		var n = this.domNode = this.srcNodeRef ? this.srcNodeRef: dom.create("div");
		domClass.add(n, "dojoxGaugeIndicatorDiv");
		var title = dom.create("label");
		if (this.title) title.innerHTML = this.title + ":";
		dom.place(title, n);
		this.valueNode = dom.create("input", {
			className: "dojoxGaugeIndicatorInput",
			size: 5,
			value: this.value
		});
		
		dom.place(this.valueNode, n);
		connect.connect(this.valueNode, "onchange", this, this._update);
	},
	
	_update: function(){
		// summary:
		//		A private function, handling the updating of the gauge

		this._updateValue(true);
	},
	
	_updateValue: function(animate){
		// summary:
		//		A private function, handling the updating of the gauge
		var value = this.valueNode.value;
		if(value === ''){
			this.value = null;
		}else{
			this.value = Number(value);
			this.hover = this.title+': '+value;
		}
		if(this._gauge){
			this.draw(this._gauge._indicatorsGroup, animate || animate==undefined ? false: true);
			this.valueNode.value = this.value;
			if((this.title == 'Target' || this.front) && this._gauge.moveIndicator){
				// if re-drawing value, make sure target is still on top
				this._gauge.moveIndicatorToFront(this);
			}
			this.valueChanged();
		}
	},
	
	valueChanged: function(){
		// summary:
		//		Invoked every time the value of the indicator changes.
	
	},
	 
	update: function(value, animate){
		// summary:
		//		Updates the value of the indicator, including moving/re-drawing at it's new location and
		//		updating the text box
		if(!this.noChange){
			this.valueNode.value = value;
			this._updateValue(animate);
		}
	},

	handleMouseOver: function(e){
		// summary:
		//		Handles mouse-over events in the indicator.
		this._gauge._handleMouseOverIndicator(this, e);
	},
	
	handleMouseOut: function(e){
		// summary:
		//		Handles mouse-out events in the indicator.
		this._gauge._handleMouseOutIndicator(this,e);
		this._gauge.gaugeContent.style.cursor = '';
	},
	
	handleMouseDown: function(e){
		// summary:
		//		Handles mouse-down events in the indicator.
		this._gauge._handleMouseDownIndicator(this,e);
	},
	
	handleTouchStart: function(e){
		// summary:
		//		Handles touch start events in the indicator.
		this._gauge.handleTouchStartIndicator(this, e);
	},	
	
	onDragMove: function(){
		// summary:
		//		Handles updating the text box and the hover text while dragging an indicator
		this.value = Math.floor(this.value);
		this.valueNode.value = this.value;
		this.hover = this.title+': '+this.value;
	},

	draw: function(/* Boolean? */ dontAnimate){
		// summary:
		//		Performs the initial drawing of the indicator.
		// dontAnimate: Boolean
		//		Indicates if the drawing should not be animated (rather than teh default, to animate)
	},

	remove: function(){
		// summary:
		//		Removes the indicator's shape from the gauge surface.
		if (this.shape)
			this.shape.parent.remove(this.shape);
		this.shape = null;
		if(this.text){
			this.text.parent.remove(this.text);
		}
		this.text = null;
	}
});
});

define(["dojo/_base/declare","dijit/_Widget"], 
  function(declare, Widget) {
	
return declare("dojox.gauges.Range", [Widget], {
	// summary:
	//		a range to be used in a _Gauge
	// description:
	//		a range widget, which has given properties.  drawn by a _Gauge.
	// example:
	//	|	<script type="text/javascript">
	//	|		require(["dojox/gauges/AnalogGauge"]);
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
	//	|		<div	dojoType="dojox.gauges.Range"
	//	|				low=5
	//	|				high=10
	//	|				hover="5 - 10"
	//	|		></div>
	//	|		<div	dojoType="dojox.gauges.Range"
	//	|				low=10
	//	|				high=20
	//	|				hover="10 - 20"
	//	|		></div>
	//	|	</div>
	
	// low: Number
	//		the low value of the range
	low: 0,
	
	// high: Number
	//		the high value of the range
	high: 0,
	
	// hover: String
	//		the text to put in the tooltip for the gauge
	hover: '',
	
	// color: Object
	//		the color of the range.  This must be an object of one of two forms:
	//		{'color': 'color-name'}
	//		OR
	//		(for a gradient:)
	//		{'type': 'linear', 'colors': [{offset: 0, color:'#C0C0C0'}, {offset: 1, color: '#E0E0E0'}] }
	color: null,
	
	// size: Number
	//		for a circular gauge (such as an AnalogGauge), this dictates the size of the arc
	size: 0,

	startup: function(){
		this.color = this.color ? ( this.color.color || this.color) : 'black';
	}
});
});
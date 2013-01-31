define(["dojo/_base/lang", "dojo/_base/Color", "../../Theme", "../common"],
	function(lang, Color, Theme, themes){

	// the baseline theme for all PlotKIt themes
	var pk = lang.getObject("PlotKit", true, themes);

	pk.base = new Theme({
		chart:{
			stroke: null,
			fill:   "yellow"
		},
		plotarea:{
			stroke: null,
			fill:   "yellow"
		},
		axis:{
			stroke:    {color:"#fff", width:1},
			line:      {color:"#fff", width:.5},
			majorTick: {color: "#fff", width: .5, length: 6},
			minorTick: {color: "#fff", width: .5, length: 3},
			tick:      {font: "normal normal normal 7pt Helvetica,Arial,sans-serif", fontColor: "#999"}
		},
		series:{
			stroke:    {width: 2.5, color:"#fff"},
			fill:      "#666",
			font:      "normal normal normal 7.5pt Helvetica,Arial,sans-serif",	//	label
			fontColor: "#666"
		},
		marker:{	//	any markers on a series.
			stroke:    {width: 2},
			fill:      "#333",
			font:      "normal normal normal 7pt Helvetica,Arial,sans-serif",	//	label
			fontColor: "#666"
		},
		colors: ["red", "green", "blue"]
	});

	pk.base.next = function(elementType, mixin, doPost){
		var theme = Theme.prototype.next.apply(this, arguments);
		if(elementType == "line"){
			theme.marker.outline = {width: 2, color: "#fff"};
			theme.series.stroke.width = 3.5;
			theme.marker.stroke.width = 2;
		}else if(elementType == "candlestick"){
			theme.series.stroke.width = 1;
		}else if(theme.series.stroke.color && (theme.series.stroke.color.toString() ==
				new Color(this.colors[(this._current-1) % this.colors.length]).toString())){
			// if the user did not override the stroke, let's force blank
			theme.series.stroke.color = "#fff";
		}
		return theme;
	};
	
	return pk;
});

define(["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){

	// created by Tom Trenka
	
	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 100};
	
	themes.Tom = new Theme({
		chart: {
			fill:      "#181818",
			stroke:    {color: "#181818"},
			pageStyle: {backgroundColor: "#181818", backgroundImage: "none", color: "#eaf2cb"}
		},
		plotarea: {
			fill: "#181818"
		},
		axis:{
			stroke:	{ // the axis itself
				color: "#a0a68b",
				width: 1
			},
			tick: {	// used as a foundation for all ticks
				color:     "#888c76",
				position:  "center",
				font:      "normal normal normal 7pt Helvetica, Arial, sans-serif",	// labels on axis
				fontColor: "#888c76"	// color of labels
			}
		},
		series: {
			stroke:  {width: 2.5, color: "#eaf2cb"},
			outline: null,
			font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
			fontColor: "#eaf2cb"
		},
		marker: {
			stroke:  {width: 1.25, color: "#eaf2cb"},
			outline: {width: 1.25, color: "#eaf2cb"},
			font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
			fontColor: "#eaf2cb"
		},
		seriesThemes: [
			{fill: g(defaultFill, "#bf9e0a", "#ecc20c")},
			{fill: g(defaultFill, "#73b086", "#95e5af")},
			{fill: g(defaultFill, "#c7212d", "#ed2835")},
			{fill: g(defaultFill, "#87ab41", "#b6e557")},
			{fill: g(defaultFill, "#b86c25", "#d37d2a")}
		],
		markerThemes: [
			{fill: "#bf9e0a", stroke: {color: "#ecc20c"}},
			{fill: "#73b086", stroke: {color: "#95e5af"}},
			{fill: "#c7212d", stroke: {color: "#ed2835"}},
			{fill: "#87ab41", stroke: {color: "#b6e557"}},
			{fill: "#b86c25", stroke: {color: "#d37d2a"}}
		]
	});
	
	themes.Tom.next = function(elementType, mixin, doPost){
		var isLine = elementType == "line";
		if(isLine || elementType == "area"){
			// custom processing for lines: substitute colors
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			if(isLine){
				s.stroke  = { width: 4, color: s.fill.colors[0].color};
			}
			var theme = Theme.prototype.next.apply(this, arguments);
			// cleanup
			delete s.outline;
			delete s.stroke;
			s.fill.space = "shape";
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};
	
	themes.Tom.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if((elementType == "slice" || elementType == "circle") && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Tom;
});

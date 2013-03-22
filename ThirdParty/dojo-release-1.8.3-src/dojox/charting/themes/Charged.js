define(["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){

	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 75};
	
	themes.Charged = new Theme({
		chart: {
			fill: "#ededdf",
			pageStyle: {backgroundColor: "#ededdf", backgroundImage: "none", color: "inherit"}
		},
		plotarea: {
			fill: "transparent"
		},
		axis:{
			stroke:	{ // the axis itself
				color: "#808078",
				width: 1
			},
			tick: {	// used as a foundation for all ticks
				color:     "#b3b3a8",
				position:  "center",
				font:      "normal normal normal 7pt Helvetica, Arial, sans-serif",	// labels on axis
				fontColor: "#808078"								// color of labels
			}
		},
		series: {
			stroke:  {width: 2, color: "#595954"},
			outline: null,
			font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
			fontColor: "#808078"
		},
		marker: {
			stroke:  {width: 3, color: "#595954"},
			outline: null,
			font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
			fontColor: "#808078"
		},
		seriesThemes: [
			{fill: g(defaultFill, "#004cbf", "#06f")},
			{fill: g(defaultFill, "#bf004c", "#f06")},
			{fill: g(defaultFill, "#43bf00", "#6f0")},
			{fill: g(defaultFill, "#7300bf", "#90f")},
			{fill: g(defaultFill, "#bf7300", "#f90")},
			{fill: g(defaultFill, "#00bf73", "#0f9")}
		],
		markerThemes: [
			{fill: "#06f", stroke: {color: "#06f"}},
			{fill: "#f06", stroke: {color: "#f06"}},
			{fill: "#6f0", stroke: {color: "#6f0"}},
			{fill: "#90f", stroke: {color: "#90f"}},
			{fill: "#f90", stroke: {color: "#f90"}},
			{fill: "#0f9", stroke: {color: "#0f9"}}
		]
	});
	
	themes.Charged.next = function(elementType, mixin, doPost){
		var isLine = elementType == "line";
		if(isLine || elementType == "area"){
			// custom processing for lines: substitute colors
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			if(isLine){
				s.stroke  = { width: 2.5, color: s.fill.colors[1].color};
			}
			if(elementType == "area"){
				s.fill.y2 = 90;
			}
			var theme = Theme.prototype.next.apply(this, arguments);
			// cleanup
			delete s.stroke;
			s.fill.y2 = 75;
			s.fill.space = "shape";
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};
	
	themes.Charged.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if((elementType == "slice" || elementType == "circle") && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Charged;
});

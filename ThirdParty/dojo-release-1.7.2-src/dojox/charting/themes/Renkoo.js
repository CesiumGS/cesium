define(["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){

	// created by Tom Trenka

	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 150};
	
	themes.Renkoo = new Theme({
		chart: {
			fill:      "#123666",
			pageStyle: {backgroundColor: "#123666", backgroundImage: "none", color: "#95afdb"}
		},
		plotarea: {
			fill: "#123666"
		},
		axis:{
			stroke:	{ // the axis itself
				color: "#95afdb",
				width: 1
			},
			tick: {	// used as a foundation for all ticks
				color:     "#95afdb",
				position:  "center",
				font:      "normal normal normal 7pt Lucida Grande, Helvetica, Arial, sans-serif",	// labels on axis
				fontColor: "#95afdb"	// color of labels
			}
		},
		series: {
			stroke:  {width: 2.5, color: "#123666"},
			outline: null,
			font:      "normal normal normal 8pt Lucida Grande, Helvetica, Arial, sans-serif",	// labels on axis
			fontColor: "#95afdb"
		},
		marker: {
			stroke:  {width: 2.5, color: "#ccc"},
			outline: null,
			font:      "normal normal normal 8pt Lucida Grande, Helvetica, Arial, sans-serif",	// labels on axis
			fontColor: "#95afdb"
		},
		seriesThemes: [
			{fill: g(defaultFill, "#e7e391", "#f8f7de")},
			{fill: g(defaultFill, "#ffb6b6", "#ffe8e8")},
			{fill: g(defaultFill, "#bcda7d", "#eef7da")},
			{fill: g(defaultFill, "#d5d5d5", "#f4f4f4")},
			{fill: g(defaultFill, "#c1e3fd", "#e4f3ff")}
		],
		markerThemes: [
			{fill: "#fcfcf3", stroke: {color: "#e7e391"}},
			{fill: "#fff1f1", stroke: {color: "#ffb6b6"}},
			{fill: "#fafdf4", stroke: {color: "#bcda7d"}},
			{fill: "#fbfbfb", stroke: {color: "#d5d5d5"}},
			{fill: "#f3faff", stroke: {color: "#c1e3fd"}}
		]
	});
	
	themes.Renkoo.next = function(elementType, mixin, doPost){
		if("slice,column,bar".indexOf(elementType) == -1){
			// custom processing to substitute colors
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			s.stroke  = { width: 2, color: s.fill.colors[0].color};
			if(elementType == "line" || elementType == "area"){
				s.stroke.width = 4;
			}
			var theme = Theme.prototype.next.apply(this, arguments);
			// cleanup
			delete s.stroke;
			s.fill.space = "shape";
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};
	
	themes.Renkoo.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if((elementType == "slice" || elementType == "circle") && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Renkoo;
});

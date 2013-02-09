define(["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){

	// created by Christopher Anderson

	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 100};
	
	themes.Chris = new Theme({
		chart: {
			fill:   "#c1c1c1",
			stroke: {color: "#666"}
		},
		plotarea: {
			fill: "#c1c1c1"
		},
		series: {
			stroke:  {width: 2, color: "white"},
			outline: null,
			fontColor: "#333"
		},
		marker: {
			stroke:  {width: 2, color: "white"},
			outline: {width: 2, color: "white"},
			fontColor: "#333"
		},
		seriesThemes: [
			{fill: g(defaultFill, "#01b717", "#238c01")},	// green
			{fill: g(defaultFill, "#d04918", "#7c0344")},	// red
			{fill: g(defaultFill, "#0005ec", "#002578")},	// blue
			{fill: g(defaultFill, "#f9e500", "#786f00")},	// yellow
			{fill: g(defaultFill, "#e27d00", "#773e00")},	// orange
			{fill: g(defaultFill, "#00b5b0", "#005f5d")},	// teal
			{fill: g(defaultFill, "#ac00cb", "#590060")}	// purple
		],
		markerThemes: [
			{fill: "#01b717", stroke: {color: "#238c01"}},	// green
			{fill: "#d04918", stroke: {color: "#7c0344"}},	// red
			{fill: "#0005ec", stroke: {color: "#002578"}},	// blue
			{fill: "#f9e500", stroke: {color: "#786f00"}},	// yellow
			{fill: "#e27d00", stroke: {color: "#773e00"}},	// orange
			{fill: "#00b5b0", stroke: {color: "#005f5d"}},	// teal
			{fill: "#ac00cb", stroke: {color: "#590060"}}	// purple
		]
	});
	
	themes.Chris.next = function(elementType, mixin, doPost){
		var isLine = elementType == "line";
		if(isLine || elementType == "area"){
			// custom processing for lines: substitute colors
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			if(isLine){
				s.stroke  = {color: s.fill.colors[1].color};
				s.outline = {width: 2, color: "white"};
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
	
	themes.Chris.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if((elementType == "slice" || elementType == "circle") && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Chris;
});

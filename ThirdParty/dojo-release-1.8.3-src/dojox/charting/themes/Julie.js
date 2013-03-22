define(["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){

	// created by Julie Santilli (Claro-based theme)
	
	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 100};
	
	themes.Julie = new Theme({
		seriesThemes: [
			{fill: g(defaultFill, "#59a0bd", "#497c91"), stroke: {color: "#22627d"}},	// blue
			{fill: g(defaultFill, "#8d88c7", "#6c6d8e"), stroke: {color: "#8a84c5"}},	// purple
			{fill: g(defaultFill, "#85a54a", "#768b4e"), stroke: {color: "#5b6d1f"}},	// green
			{fill: g(defaultFill, "#e8e667", "#c6c361"), stroke: {color: "#918e38"}},	// yellow
			{fill: g(defaultFill, "#e9c756", "#c7a223"), stroke: {color: "#947b30"}},	// orange
			{fill: g(defaultFill, "#a05a5a", "#815454"), stroke: {color: "#572828"}},	// red
			{fill: g(defaultFill, "#b17044", "#72543e"), stroke: {color: "#74482e"}},	// brown
			{fill: g(defaultFill, "#a5a5a5", "#727272"), stroke: {color: "#535353"}},	// grey

			{fill: g(defaultFill, "#9dc7d9", "#59a0bd"), stroke: {color: "#22627d"}},	// blue
			{fill: g(defaultFill, "#b7b3da", "#8681b3"), stroke: {color: "#8a84c5"}},	// purple
			{fill: g(defaultFill, "#a8c179", "#85a54a"), stroke: {color: "#5b6d1f"}},	// green
			{fill: g(defaultFill, "#eeea99", "#d6d456"), stroke: {color: "#918e38"}},	// yellow
			{fill: g(defaultFill, "#ebcf81", "#e9c756"), stroke: {color: "#947b30"}},	// orange
			{fill: g(defaultFill, "#c99999", "#a05a5a"), stroke: {color: "#572828"}},	// red
			{fill: g(defaultFill, "#c28b69", "#7d5437"), stroke: {color: "#74482e"}},	// brown
			{fill: g(defaultFill, "#bebebe", "#8c8c8c"), stroke: {color: "#535353"}},	// grey

			{fill: g(defaultFill, "#c7e0e9", "#92baca"), stroke: {color: "#22627d"}},	// blue
			{fill: g(defaultFill, "#c9c6e4", "#ada9d6"), stroke: {color: "#8a84c5"}},	// purple
			{fill: g(defaultFill, "#c0d0a0", "#98ab74"), stroke: {color: "#5b6d1f"}},	// green
			{fill: g(defaultFill, "#f0eebb", "#dcd87c"), stroke: {color: "#918e38"}},	// yellow
			{fill: g(defaultFill, "#efdeb0", "#ebcf81"), stroke: {color: "#947b30"}},	// orange
			{fill: g(defaultFill, "#ddc0c0", "#c99999"), stroke: {color: "#572828"}},	// red
			{fill: g(defaultFill, "#cfb09b", "#c28b69"), stroke: {color: "#74482e"}},	// brown
			{fill: g(defaultFill, "#d8d8d8", "#bebebe"), stroke: {color: "#535353"}},	// grey

			{fill: g(defaultFill, "#ddeff5", "#a5c4cd"), stroke: {color: "#22627d"}},	// blue
			{fill: g(defaultFill, "#dedcf0", "#b3afd3"), stroke: {color: "#8a84c5"}},	// purple
			{fill: g(defaultFill, "#dfe9ca", "#c0d0a0"), stroke: {color: "#5b6d1f"}},	// green
			{fill: g(defaultFill, "#f8f7db", "#e5e28f"), stroke: {color: "#918e38"}},	// yellow
			{fill: g(defaultFill, "#f7f0d8", "#cfbd88"), stroke: {color: "#947b30"}},	// orange
			{fill: g(defaultFill, "#eedede", "#caafaf"), stroke: {color: "#572828"}},	// red
			{fill: g(defaultFill, "#e3cdbf", "#cfb09b"), stroke: {color: "#74482e"}},	// brown
			{fill: g(defaultFill, "#efefef", "#cacaca"), stroke: {color: "#535353"}}	// grey
		]
	});
	
	themes.Julie.next = function(elementType, mixin, doPost){
		if(elementType == "line" || elementType == "area"){
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			var theme = Theme.prototype.next.apply(this, arguments);
			s.fill.space = "shape";
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};

	themes.Julie.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if(elementType == "slice" && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Julie;
});

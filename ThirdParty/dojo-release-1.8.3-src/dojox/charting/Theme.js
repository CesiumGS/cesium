define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/Color", "./SimpleTheme",
	    "dojox/color/_base", "dojox/color/Palette", "dojox/gfx/gradutils"],
	function(lang, declare, Color, SimpleTheme, colorX, Palette){
	
	var Theme = declare("dojox.charting.Theme", SimpleTheme, {
	// summary:
	//		A Theme is a pre-defined object, primarily JSON-based, that makes up the definitions to
	//		style a chart. It extends SimpleTheme with additional features like color definition by
	//		palettes and gradients definition.
	});

	/*=====
	var __DefineColorArgs = {
		// summary:
		//		The arguments object that can be passed to define colors for a theme.
		// num: Number?
		//		The number of colors to generate.  Defaults to 5.
		// colors: String[]|dojo/_base/Color[]?
		//		A pre-defined set of colors; this is passed through to the Theme directly.
		// hue: Number?
		//		A hue to base the generated colors from (a number from 0 - 359).
		// saturation: Number?
		//		If a hue is passed, this is used for the saturation value (0 - 100).
		// low: Number?
		//		An optional value to determine the lowest value used to generate a color (HSV model)
		// high: Number?
		//		An optional value to determine the highest value used to generate a color (HSV model)
		// base: String|dojo/_base/Color?
		//		A base color to use if we are defining colors using dojox.color.Palette
		// generator: String?
		//		The generator function name from dojox/color/Palette.
	};
	=====*/
	lang.mixin(Theme, {

		defineColors: function(kwArgs){
			// summary:
			//		Generate a set of colors for the theme based on keyword
			//		arguments.
			// kwArgs: __DefineColorArgs
			//		The arguments object used to define colors.
			// returns: dojo/_base/Color[]
			//		An array of colors for use in a theme.
			//
			// example:
			//	|	var colors = Theme.defineColors({
			//	|		base: "#369",
			//	|		generator: "compound"
			//	|	});
			//
			// example:
			//	|	var colors = Theme.defineColors({
			//	|		hue: 60,
			//	|		saturation: 90,
			//	|		low: 30,
			//	|		high: 80
			//	|	});
			kwArgs = kwArgs || {};
			var l, c = [], n = kwArgs.num || 5;	// the number of colors to generate
			if(kwArgs.colors){
				// we have an array of colors predefined, so fix for the number of series.
				l = kwArgs.colors.length;
				for(var i = 0; i < n; i++){
					c.push(kwArgs.colors[i % l]);
				}
				return c;	//	dojo.Color[]
			}
			if(kwArgs.hue){
				// single hue, generate a set based on brightness
				var s = kwArgs.saturation || 100,	// saturation
					st = kwArgs.low || 30,
					end = kwArgs.high || 90;
				// we'd like it to be a little on the darker side.
				l = (end + st) / 2;
				// alternately, use "shades"
				return Palette.generate(
					colorX.fromHsv(kwArgs.hue, s, l), "monochromatic"
				).colors;
			}
			if(kwArgs.generator){
				//	pass a base color and the name of a generator
				return colorX.Palette.generate(kwArgs.base, kwArgs.generator).colors;
			}
			return c;	//	dojo.Color[]
		},

		generateGradient: function(fillPattern, colorFrom, colorTo){
			var fill = lang.delegate(fillPattern);
			fill.colors = [
				{offset: 0, color: colorFrom},
				{offset: 1, color: colorTo}
			];
			return fill;
		},

		generateHslColor: function(color, luminance){
			color = new Color(color);
			var hsl    = color.toHsl(),
				result = colorX.fromHsl(hsl.h, hsl.s, luminance);
			result.a = color.a;	// add missing opacity
			return result;
		},

		generateHslGradient: function(color, fillPattern, lumFrom, lumTo){
			color = new Color(color);
			var hsl       = color.toHsl(),
				colorFrom = colorX.fromHsl(hsl.h, hsl.s, lumFrom),
				colorTo   = colorX.fromHsl(hsl.h, hsl.s, lumTo);
			colorFrom.a = colorTo.a = color.a;	// add missing opacity
			return Theme.generateGradient(fillPattern, colorFrom, colorTo);	// Object
		}
	});

	// for compatibility
	Theme.defaultMarkers = SimpleTheme.defaultMarkers;
	Theme.defaultColors = SimpleTheme.defaultColors;
	Theme.defaultTheme = SimpleTheme.defaultTheme;

	return Theme;
});

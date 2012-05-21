define(["dojo/_base/lang", "dojo/_base/html", "dojo/_base/Color", "dojo/_base/sniff", "dojo/_base/window",
	    "dojo/_base/array","dojo/dom", "dojo/dom-construct","dojo/dom-geometry"], 
  function(lang, html, Color, has, win, arr, dom, domConstruct, domGeom){
	// module:
	//		dojox/gfx
	// summary:
	//		This module contains common core Graphics API used by different graphics renderers.
	var g = lang.getObject("dojox.gfx", true),
		b = g._base = {};
	/*===== g = dojox.gfx; b = dojox.gfx._base; =====*/
	
	// candidates for dojox.style (work on VML and SVG nodes)
	g._hasClass = function(/*DomNode*/node, /*String*/classStr){
		//	summary:
		//		Returns whether or not the specified classes are a portion of the
		//		class list currently applied to the node.
		// return (new RegExp('(^|\\s+)'+classStr+'(\\s+|$)')).test(node.className)	// Boolean
		var cls = node.getAttribute("className");
		return cls && (" " + cls + " ").indexOf(" " + classStr + " ") >= 0;  // Boolean
	};
	g._addClass = function(/*DomNode*/node, /*String*/classStr){
		//	summary:
		//		Adds the specified classes to the end of the class list on the
		//		passed node.
		var cls = node.getAttribute("className") || "";
		if(!cls || (" " + cls + " ").indexOf(" " + classStr + " ") < 0){
			node.setAttribute("className", cls + (cls ? " " : "") + classStr);
		}
	};
	g._removeClass = function(/*DomNode*/node, /*String*/classStr){
		//	summary: Removes classes from node.
		var cls = node.getAttribute("className");
		if(cls){
			node.setAttribute(
				"className",
				cls.replace(new RegExp('(^|\\s+)' + classStr + '(\\s+|$)'), "$1$2")
			);
		}
	};

	// candidate for dojox.html.metrics (dynamic font resize handler is not implemented here)

	//	derived from Morris John's emResized measurer
	b._getFontMeasurements = function(){
		//	summary:
		//		Returns an object that has pixel equivilents of standard font
		//		size values.
		var heights = {
			'1em': 0, '1ex': 0, '100%': 0, '12pt': 0, '16px': 0, 'xx-small': 0,
			'x-small': 0, 'small': 0, 'medium': 0, 'large': 0, 'x-large': 0,
			'xx-large': 0
		};
		var p;

		if(has("ie")){
			//	we do a font-size fix if and only if one isn't applied already.
			//	NOTE: If someone set the fontSize on the HTML Element, this will kill it.
			win.doc.documentElement.style.fontSize="100%";
		}

		//	set up the measuring node.
		var div = domConstruct.create("div", {style: {
				position: "absolute",
				left: "0",
				top: "-100px",
				width: "30px",
				height: "1000em",
				borderWidth: "0",
				margin: "0",
				padding: "0",
				outline: "none",
				lineHeight: "1",
				overflow: "hidden"
			}}, win.body());

		//	do the measurements.
		for(p in heights){
			div.style.fontSize = p;
			heights[p] = Math.round(div.offsetHeight * 12/16) * 16/12 / 1000;
		}

		win.body().removeChild(div);
		return heights; //object
	};

	var fontMeasurements = null;

	b._getCachedFontMeasurements = function(recalculate){
		if(recalculate || !fontMeasurements){
			fontMeasurements = b._getFontMeasurements();
		}
		return fontMeasurements;
	};

	// candidate for dojox.html.metrics

	var measuringNode = null, empty = {};
	b._getTextBox = function(	/*String*/ text,
								/*Object*/ style,
								/*String?*/ className){
		var m, s, al = arguments.length;
		var i;
		if(!measuringNode){
			measuringNode = domConstruct.create("div", {style: {
				position: "absolute",
				top: "-10000px",
				left: "0"
			}}, win.body());
		}
		m = measuringNode;
		// reset styles
		m.className = "";
		s = m.style;
		s.borderWidth = "0";
		s.margin = "0";
		s.padding = "0";
		s.outline = "0";
		// set new style
		if(al > 1 && style){
			for(i in style){
				if(i in empty){ continue; }
				s[i] = style[i];
			}
		}
		// set classes
		if(al > 2 && className){
			m.className = className;
		}
		// take a measure
		m.innerHTML = text;

		if(m["getBoundingClientRect"]){
			var bcr = m.getBoundingClientRect();
			return {l: bcr.left, t: bcr.top, w: bcr.width || (bcr.right - bcr.left), h: bcr.height || (bcr.bottom - bcr.top)};
		}else{
			return domGeom.getMarginBox(m);
		}
	};

	// candidate for dojo.dom

	var uniqueId = 0;
	b._getUniqueId = function(){
		// summary: returns a unique string for use with any DOM element
		var id;
		do{
			id = dojo._scopeName + "xUnique" + (++uniqueId);
		}while(dom.byId(id));
		return id;
	};

	lang.mixin(g, {
		//	summary:
		//		defines constants, prototypes, and utility functions for the core Graphics API

		// default shapes, which are used to fill in missing parameters
		defaultPath: {
			//	summary:
			//		Defines the default Path prototype object.
			type: "path", 
			//	type: String
			//		Specifies this object is a Path, default value 'path'.
			path: ""
			//	path: String
			//		The path commands. See W32C SVG 1.0 specification. 
			//		Defaults to empty string value.
		},
		defaultPolyline: {
			//	summary:
			//		Defines the default PolyLine prototype.
			type: "polyline", 
			//	type: String
			//		Specifies this object is a PolyLine, default value 'polyline'.
			points: []
			//	points: Array
			//		An array of point objects [{x:0,y:0},...] defining the default polyline's line segments. Value is an empty array [].
		},
		defaultRect: {
			//	summary:
			//		Defines the default Rect prototype.
			type: "rect",
			//	type: String
			//		Specifies this default object is a type of Rect. Value is 'rect' 
			x: 0, 
			//	x: Number
			//		The X coordinate of the default rectangles position, value 0.
			y: 0, 
			//	y: Number
			//		The Y coordinate of the default rectangle's position, value 0.
			width: 100, 
			//	width: Number
			//		The width of the default rectangle, value 100.
			height: 100, 
			//	height: Number
			//		The height of the default rectangle, value 100.
			r: 0
			//	r: Number
			//		The corner radius for the default rectangle, value 0.
		},
		defaultEllipse: {
			//	summary:
			//		Defines the default Ellipse prototype.
			type: "ellipse", 
			//	type: String
			//		Specifies that this object is a type of Ellipse, value is 'ellipse'
			cx: 0, 
			//	cx: Number
			//		The X coordinate of the center of the ellipse, default value 0.
			cy: 0, 
			//	cy: Number
			//		The Y coordinate of the center of the ellipse, default value 0.
			rx: 200,
			//	rx: Number
			//		The radius of the ellipse in the X direction, default value 200.
			ry: 100
			//	ry: Number
			//		The radius of the ellipse in the Y direction, default value 200.
		},
		defaultCircle: {
			//	summary:
			//		An object defining the default Circle prototype.
			type: "circle", 
			//	type: String
			//		Specifies this object is a circle, value 'circle'
			cx: 0, 
			//	cx: Number
			//		The X coordinate of the center of the circle, default value 0.
			cy: 0, 
			//	cy: Number
			//		The Y coordinate of the center of the circle, default value 0.
			r: 100
			//	r: Number
			//		The radius, default value 100.
		},
		defaultLine: {
			//	summary:
			//		An pbject defining the default Line prototype.
			type: "line", 
			//	type: String
			//		Specifies this is a Line, value 'line'
			x1: 0, 
			//	x1: Number
			//		The X coordinate of the start of the line, default value 0.
			y1: 0, 
			//	y1: Number
			//		The Y coordinate of the start of the line, default value 0.
			x2: 100,
			//	x2: Number
			//		The X coordinate of the end of the line, default value 100.
			y2: 100
			//	y2: Number
			//		The Y coordinate of the end of the line, default value 100.
		},
		defaultImage: {
			//	summary:
			//		Defines the default Image prototype.
			type: "image",
			//	type: String
			//		Specifies this object is an image, value 'image'.
			x: 0, 
			//	x: Number
			//		The X coordinate of the image's position, default value 0.
			y: 0, 
			//	y: Number
			//		The Y coordinate of the image's position, default value 0.
			width: 0,
			//	width: Number
			//		The width of the image, default value 0.
			height: 0,
			//	height:Number
			//		The height of the image, default value 0.
			src: ""
			//	src: String
			//		The src url of the image, defaults to empty string.
		},
		defaultText: {
			//	summary:
			//		Defines the default Text prototype.
			type: "text", 
			//	type: String
			//		Specifies this is a Text shape, value 'text'.
			x: 0, 
			//	x: Number
			//		The X coordinate of the text position, default value 0.
			y: 0, 
			//	y: Number
			//		The Y coordinate of the text position, default value 0.
			text: "",
			//	text: String
			//		The text to be displayed, default value empty string.
			align: "start",
			//	align:	String
			//		The horizontal text alignment, one of 'start', 'end', 'center'. Default value 'start'.
			decoration: "none",
			//	decoration: String
			//		The text decoration , one of 'none', ... . Default value 'none'.
			rotated: false,
			//	rotated: Boolean
			//		Whether the text is rotated, boolean default value false.
			kerning: true
			//	kerning: Boolean
			//		Whether kerning is used on the text, boolean default value true.
		},
		defaultTextPath: {
			//	summary:
			//		Defines the default TextPath prototype.
			type: "textpath", 
			//	type: String
			//		Specifies this is a TextPath, value 'textpath'.
			text: "", 
			//	text: String
			//		The text to be displayed, default value empty string.
			align: "start",
			//	align: String
			//		The horizontal text alignment, one of 'start', 'end', 'center'. Default value 'start'.
			decoration: "none",
			//	decoration: String
			//		The text decoration , one of 'none', ... . Default value 'none'.
			rotated: false,
			//	rotated: Boolean
			//		Whether the text is rotated, boolean default value false.
			kerning: true
			//	kerning: Boolean
			//		Whether kerning is used on the text, boolean default value true.
		},

		// default stylistic attributes
		defaultStroke: {
			//	summary:
			//		A stroke defines stylistic properties that are used when drawing a path.  
			//		This object defines the default Stroke prototype.
			type: "stroke", 
			//	type: String
			//		Specifies this object is a type of Stroke, value 'stroke'.
			color: "black", 
			//	color: String
			//		The color of the stroke, default value 'black'.
			style: "solid",
			//	style: String
			//		The style of the stroke, one of 'solid', ... . Default value 'solid'.
			width: 1,
			//	width: Number
			//		The width of a stroke, default value 1.
			cap: "butt",
			//	cap: String
			//		The endcap style of the path. One of 'butt', 'round', ... . Default value 'butt'.
			join: 4
			//	join: Number
			//		The join style to use when combining path segments. Default value 4.
		},
		defaultLinearGradient: {
			//	summary:
			//		An object defining the default stylistic properties used for Linear Gradient fills.
			//		Linear gradients are drawn along a virtual line, which results in appearance of a rotated pattern in a given direction/orientation.
			type: "linear", 
			//	type: String
			//		Specifies this object is a Linear Gradient, value 'linear'
			x1: 0, 
			//	x1: Number
			//		The X coordinate of the start of the virtual line along which the gradient is drawn, default value 0.
			y1: 0, 
			//	y1: Number
			//		The Y coordinate of the start of the virtual line along which the gradient is drawn, default value 0.
			x2: 100,
			//	x2: Number
			//		The X coordinate of the end of the virtual line along which the gradient is drawn, default value 100.
			y2: 100,
			//	y2: Number
			//		The Y coordinate of the end of the virtual line along which the gradient is drawn, default value 100.
			colors: [
				{ offset: 0, color: "black" }, { offset: 1, color: "white" }
			]
			//	colors: Array
			//		An array of colors at given offsets (from the start of the line).  The start of the line is
			//		defined at offest 0 with the end of the line at offset 1.
			//		Default value, [{ offset: 0, color: 'black'},{offset: 1, color: 'white'}], is a gradient from black to white. 
		},
		defaultRadialGradient: {
			// summary:
			//		An object specifying the default properties for RadialGradients using in fills patterns.
			type: "radial",
			//	type: String
			//		Specifies this is a RadialGradient, value 'radial'
			cx: 0, 
			//	cx: Number
			//		The X coordinate of the center of the radial gradient, default value 0.
			cy: 0, 
			//	cy: Number
			//		The Y coordinate of the center of the radial gradient, default value 0.
			r: 100,
			//	r: Number
			//		The radius to the end of the radial gradient, default value 100.
			colors: [
				{ offset: 0, color: "black" }, { offset: 1, color: "white" }
			]
			//	colors: Array
			//		An array of colors at given offsets (from the center of the radial gradient).  
			//		The center is defined at offest 0 with the outer edge of the gradient at offset 1.
			//		Default value, [{ offset: 0, color: 'black'},{offset: 1, color: 'white'}], is a gradient from black to white. 
		},
		defaultPattern: {
			// summary:
			//		An object specifying the default properties for a Pattern using in fill operations.
			type: "pattern", 
			// type: String
			//		Specifies this object is a Pattern, value 'pattern'.
			x: 0, 
			//	x: Number
			//		The X coordinate of the position of the pattern, default value is 0.
			y: 0, 
			//	y: Number
			//		The Y coordinate of the position of the pattern, default value is 0.
			width: 0, 
			//	width: Number
			//		The width of the pattern image, default value is 0.
			height: 0, 
			//	height: Number
			//		The height of the pattern image, default value is 0.
			src: ""
			//	src: String
			//		A url specifing the image to use for the pattern.
		},
		defaultFont: {
			// summary:
			//		An object specifying the default properties for a Font used in text operations.
			type: "font", 
			// type: String
			//		Specifies this object is a Font, value 'font'.
			style: "normal", 
			//	style: String
			//		The font style, one of 'normal', 'bold', default value 'normal'.
			variant: "normal",
			//	variant: String
			//		The font variant, one of 'normal', ... , default value 'normal'.
			weight: "normal", 
			//	weight: String
			//		The font weight, one of 'normal', ..., default value 'normal'.
			size: "10pt", 
			//	size: String
			//		The font size (including units), default value '10pt'.
			family: "serif"
			//	family: String
			//		The font family, one of 'serif', 'sanserif', ..., default value 'serif'.
		},

		getDefault: (function(){
			//	summary:
			//		Returns a function used to access default memoized prototype objects (see them defined above).
			var typeCtorCache = {};
			// a memoized delegate()
			return function(/*String*/ type){
				var t = typeCtorCache[type];
				if(t){
					return new t();
				}
				t = typeCtorCache[type] = new Function();
				t.prototype = g[ "default" + type ];
				return new t();
			}
		})(),

		normalizeColor: function(/*dojo.Color|Array|string|Object*/ color){
			//	summary:
			//		converts any legal color representation to normalized
			//		dojo.Color object
			return (color instanceof Color) ? color : new Color(color); // dojo.Color
		},
		normalizeParameters: function(existed, update){
			//	summary:
			//		updates an existing object with properties from an 'update'
			//		object
			//	existed: Object
			//		the target object to be updated
			//	update:  Object
			//		the 'update' object, whose properties will be used to update
			//		the existed object
			var x;
			if(update){
				var empty = {};
				for(x in existed){
					if(x in update && !(x in empty)){
						existed[x] = update[x];
					}
				}
			}
			return existed;	// Object
		},
		makeParameters: function(defaults, update){
			//	summary:
			//		copies the original object, and all copied properties from the
			//		'update' object
			//	defaults: Object
			//		the object to be cloned before updating
			//	update:   Object
			//		the object, which properties are to be cloned during updating
			var i = null;
			if(!update){
				// return dojo.clone(defaults);
				return lang.delegate(defaults);
			}
			var result = {};
			for(i in defaults){
				if(!(i in result)){
					result[i] = lang.clone((i in update) ? update[i] : defaults[i]);
				}
			}
			return result; // Object
		},
		formatNumber: function(x, addSpace){
			// summary: converts a number to a string using a fixed notation
			// x: Number
			//		number to be converted
			// addSpace: Boolean
			//		whether to add a space before a positive number
			var val = x.toString();
			if(val.indexOf("e") >= 0){
				val = x.toFixed(4);
			}else{
				var point = val.indexOf(".");
				if(point >= 0 && val.length - point > 5){
					val = x.toFixed(4);
				}
			}
			if(x < 0){
				return val; // String
			}
			return addSpace ? " " + val : val; // String
		},
		// font operations
		makeFontString: function(font){
			// summary: converts a font object to a CSS font string
			// font:	Object:	font object (see dojox.gfx.defaultFont)
			return font.style + " " + font.variant + " " + font.weight + " " + font.size + " " + font.family; // Object
		},
		splitFontString: function(str){
			// summary:
			//		converts a CSS font string to a font object
			// description:
			//		Converts a CSS font string to a gfx font object. The CSS font
			//		string components should follow the W3C specified order
			//		(see http://www.w3.org/TR/CSS2/fonts.html#font-shorthand):
			//		style, variant, weight, size, optional line height (will be
			//		ignored), and family.
			// str: String
			//		a CSS font string
			var font = g.getDefault("Font");
			var t = str.split(/\s+/);
			do{
				if(t.length < 5){ break; }
				font.style   = t[0];
				font.variant = t[1];
				font.weight  = t[2];
				var i = t[3].indexOf("/");
				font.size = i < 0 ? t[3] : t[3].substring(0, i);
				var j = 4;
				if(i < 0){
					if(t[4] == "/"){
						j = 6;
					}else if(t[4].charAt(0) == "/"){
						j = 5;
					}
				}
				if(j < t.length){
					font.family = t.slice(j).join(" ");
				}
			}while(false);
			return font;	// Object
		},
		// length operations
		cm_in_pt: 72 / 2.54, 
			//	cm_in_pt: Number
			//		points per centimeter (constant)
		mm_in_pt: 7.2 / 2.54,
			//	mm_in_pt: Number
			//		points per millimeter (constant)
		px_in_pt: function(){
			//	summary: returns the current number of pixels per point.
			return g._base._getCachedFontMeasurements()["12pt"] / 12;	// Number
		},
		pt2px: function(len){
			//	summary: converts points to pixels
			//	len: Number
			//		a value in points
			return len * g.px_in_pt();	// Number
		},
		px2pt: function(len){
			//	summary: converts pixels to points
			//	len: Number
			//		a value in pixels
			return len / g.px_in_pt();	// Number
		},
		normalizedLength: function(len) {
			//	summary: converts any length value to pixels
			//	len: String
			//		a length, e.g., '12pc'
			if(len.length === 0){ return 0; }
			if(len.length > 2){
				var px_in_pt = g.px_in_pt();
				var val = parseFloat(len);
				switch(len.slice(-2)){
					case "px": return val;
					case "pt": return val * px_in_pt;
					case "in": return val * 72 * px_in_pt;
					case "pc": return val * 12 * px_in_pt;
					case "mm": return val * g.mm_in_pt * px_in_pt;
					case "cm": return val * g.cm_in_pt * px_in_pt;
				}
			}
			return parseFloat(len);	// Number
		},

		pathVmlRegExp: /([A-Za-z]+)|(\d+(\.\d+)?)|(\.\d+)|(-\d+(\.\d+)?)|(-\.\d+)/g,
			//	pathVmlRegExp: RegExp
			//		a constant regular expression used to split a SVG/VML path into primitive components
		pathSvgRegExp: /([A-Za-z])|(\d+(\.\d+)?)|(\.\d+)|(-\d+(\.\d+)?)|(-\.\d+)/g,
			//	pathVmlRegExp: RegExp
			//		a constant regular expression used to split a SVG/VML path into primitive components

		equalSources: function(a /*Object*/, b /*Object*/){
			//	summary: compares event sources, returns true if they are equal
			//	a: first event source
			//	b: event source to compare against a
			return a && b && a === b;
		},

		switchTo: function(renderer/*String|Object*/){
			//	summary: switch the graphics implementation to the specified renderer.
			//	renderer: 
			//		Either the string name of a renderer (eg. 'canvas', 'svg, ...) or the renderer
			//		object to switch to.
			var ns = typeof renderer == "string" ? g[renderer] : renderer;
			if(ns){
				arr.forEach(["Group", "Rect", "Ellipse", "Circle", "Line",
						"Polyline", "Image", "Text", "Path", "TextPath",
						"Surface", "createSurface", "fixTarget"], function(name){
					g[name] = ns[name];
				});
			}
		}
	});
	return g; // defaults object api
});

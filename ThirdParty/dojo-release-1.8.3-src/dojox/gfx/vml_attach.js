define(["dojo/_base/kernel", "dojo/_base/lang", "./_base", "./matrix", "./path", "dojo/_base/Color", "./vml"],
  function (kernel, lang, g, m, pathLib, Color, vml){

	kernel.experimental("dojox.gfx.vml_attach");
	
	vml.attachNode = function(node){
		// summary:
		//		creates a shape from a Node
		// node: Node
		//		a VML node
		if(!node) return null;
		var s = null;
		switch(node.tagName.toLowerCase()){
			case vml.Rect.nodeType:
				s = new vml.Rect(node);
				attachRect(s);
				break;
			case vml.Ellipse.nodeType:
				if(node.style.width == node.style.height){
					s = new vml.Circle(node);
					attachCircle(s);
				}else{
					s = new vml.Ellipse(node);
					attachEllipse(s);
				}
				break;
			case vml.Path.nodeType:
				switch(node.getAttribute("dojoGfxType")){
					case "line":
						s = new vml.Line(node);
						attachLine(s);
						break;
					case "polyline":
						s = new vml.Polyline(node);
						attachPolyline(s);
						break;
					case "path":
						s = new vml.Path(node);
						attachPath(s);
						break;
					case "text":
						s = new vml.Text(node);
						attachText(s);
						attachFont(s);
						attachTextTransform(s);
						break;
					case "textpath":
						s = new vml.TextPath(node);
						attachPath(s);
						attachText(s);
						attachFont(s);
						break;
				}
				break;
			case vml.Image.nodeType:
				switch(node.getAttribute("dojoGfxType")){
					case "image":
						s = new vml.Image(node);
						attachImage(s);
						attachImageTransform(s);
						break;
				}
				break;
			default:
				//console.debug("FATAL ERROR! tagName = " + node.tagName);
				return null;
		}
		if(!(s instanceof vml.Image)){
			attachFill(s);
			attachStroke(s);
			if(!(s instanceof vml.Text)){
				attachTransform(s);
			}
		}
		return s;	// dojox/gfx/shape.Shape
	};

	vml.attachSurface = function(node){
		// summary:
		//		creates a surface from a Node
		// node: Node
		//		a VML node
		var s = new vml.Surface();
		s.clipNode = node;
		var r = s.rawNode = node.firstChild;
		var b = r.firstChild;
		if(!b || b.tagName != "rect"){
			return null;	// dojox/gfx.Surface
		}
		s.bgNode = r;
		return s;	// dojox/gfx.Surface
	};

	var attachFill = function(object){
		// summary:
		//		deduces a fill style from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var fillStyle = null, r = object.rawNode, fo = r.fill, stops, i, t;
		if(fo.on && fo.type == "gradient"){
			fillStyle = lang.clone(g.defaultLinearGradient),
				rad = m._degToRad(fo.angle);
			fillStyle.x2 = Math.cos(rad);
			fillStyle.y2 = Math.sin(rad);
			fillStyle.colors = [];
			stops = fo.colors.value.split(";");
			for(i = 0; i < stops.length; ++i){
				 t = stops[i].match(/\S+/g);
				if(!t || t.length != 2){ continue; }
				fillStyle.colors.push({offset: vml._parseFloat(t[0]), color: new Color(t[1])});
			}
		}else if(fo.on && fo.type == "gradientradial"){
			fillStyle = lang.clone(g.defaultRadialGradient),
				w = parseFloat(r.style.width), h = parseFloat(r.style.height);
			fillStyle.cx = isNaN(w) ? 0 : fo.focusposition.x * w;
			fillStyle.cy = isNaN(h) ? 0 : fo.focusposition.y * h;
			fillStyle.r  = isNaN(w) ? 1 : w / 2;
			fillStyle.colors = [];
			stops = fo.colors.value.split(";");
			for(i = stops.length - 1; i >= 0; --i){
				t = stops[i].match(/\S+/g);
				if(!t || t.length != 2){ continue; }
				fillStyle.colors.push({offset: vml._parseFloat(t[0]), color: new Color(t[1])});
			}
		}else if(fo.on && fo.type == "tile"){
			fillStyle = lang.clone(g.defaultPattern);
			fillStyle.width  = g.pt2px(fo.size.x); // from pt
			fillStyle.height = g.pt2px(fo.size.y); // from pt
			fillStyle.x = fo.origin.x * fillStyle.width;
			fillStyle.y = fo.origin.y * fillStyle.height;
			fillStyle.src = fo.src;
		}else if(fo.on && r.fillcolor){
			// a color object !
			fillStyle = new Color(r.fillcolor+"");
			fillStyle.a = fo.opacity;
		}
		object.fillStyle = fillStyle;
	};

	var attachStroke = function(object) {
		// summary:
		//		deduces a stroke style from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var r = object.rawNode;
		if(!r.stroked){
			object.strokeStyle = null;
			return;
		}
		var strokeStyle = object.strokeStyle = lang.clone(g.defaultStroke),
			rs = r.stroke;
		strokeStyle.color = new Color(r.strokecolor.value);
		strokeStyle.width = g.normalizedLength(r.strokeweight+"");
		strokeStyle.color.a = rs.opacity;
		strokeStyle.cap = this._translate(this._capMapReversed, rs.endcap);
		strokeStyle.join = rs.joinstyle == "miter" ? rs.miterlimit : rs.joinstyle;
		strokeStyle.style = rs.dashstyle;
	};

	var attachTransform = function(object) {
		// summary:
		//		deduces a transformation matrix from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var s = object.rawNode.skew, sm = s.matrix, so = s.offset;
		object.matrix = m.normalize({
			xx: sm.xtox,
			xy: sm.ytox,
			yx: sm.xtoy,
			yy: sm.ytoy,
			dx: g.pt2px(so.x),
			dy: g.pt2px(so.y)
		});
	};

	var attachGroup = function(object){
		// summary:
		//		reconstructs all group shape parameters from a node (VML).
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		
		// attach the background
		object.bgNode = object.rawNode.firstChild;	// TODO: check it first
	};

	var attachRect = function(object){
		// summary:
		//		builds a rectangle shape from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		
		// a workaround for the VML's arcsize bug: cannot read arcsize of an instantiated node
		var r = object.rawNode, arcsize = r.outerHTML.match(/arcsize = \"(\d*\.?\d+[%f]?)\"/)[1],
			style = r.style, width = parseFloat(style.width), height = parseFloat(style.height);
		arcsize = (arcsize.indexOf("%") >= 0) ? parseFloat(arcsize) / 100 : vml._parseFloat(arcsize);
		// make an object
		object.shape = g.makeParameters(g.defaultRect, {
			x: parseInt(style.left),
			y: parseInt(style.top),
			width:  width,
			height: height,
			r: Math.min(width, height) * arcsize
		});
	};

	var attachEllipse = function(object){
		// summary:
		//		builds an ellipse shape from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var style = object.rawNode.style,
			rx = parseInt(style.width ) / 2,
			ry = parseInt(style.height) / 2;
		object.shape = g.makeParameters(g.defaultEllipse, {
			cx: parseInt(style.left) + rx,
			cy: parseInt(style.top ) + ry,
			rx: rx,
			ry: ry
		});
	};

	var attachCircle = function(object){
		// summary:
		//		builds a circle shape from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var style = object.rawNode.style, r = parseInt(style.width) / 2;
		object.shape = g.makeParameters(g.defaultCircle, {
			cx: parseInt(style.left) + r,
			cy: parseInt(style.top)  + r,
			r:  r
		});
	};

	var attachLine = function(object){
		// summary:
		//		builds a line shape from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var shape = object.shape = lang.clone(g.defaultLine),
			p = object.rawNode.path.v.match(g.pathVmlRegExp);
		do{
			if(p.length < 7 || p[0] != "m" || p[3] != "l" || p[6] != "e"){ break; }
			shape.x1 = parseInt(p[1]);
			shape.y1 = parseInt(p[2]);
			shape.x2 = parseInt(p[4]);
			shape.y2 = parseInt(p[5]);
		}while(false);
	};

	var attachPolyline = function(object){
		// summary:
		//		builds a polyline/polygon shape from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var shape = object.shape = lang.clone(g.defaultPolyline),
			p = object.rawNode.path.v.match(g.pathVmlRegExp);
		do{
			if(p.length < 3 || p[0] != "m"){ break; }
			var x = parseInt(p[0]), y = parseInt(p[1]);
			if(isNaN(x) || isNaN(y)){ break; }
			shape.points.push({x: x, y: y});
			if(p.length < 6 || p[3] != "l"){ break; }
			for(var i = 4; i < p.length; i += 2){
				x = parseInt(p[i]);
				y = parseInt(p[i + 1]);
				if(isNaN(x) || isNaN(y)){ break; }
				shape.points.push({x: x, y: y});
			}
		}while(false);
	};

	var attachImage = function(object){
		// summary:
		//		builds an image shape from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		object.shape = lang.clone(g.defaultImage);
		object.shape.src = object.rawNode.firstChild.src;
	};

	var attachImageTransform = function(object) {
		// summary:
		//		deduces a transformation matrix from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var mm = object.rawNode.filters["DXImageTransform.Microsoft.Matrix"];
		object.matrix = m.normalize({
			xx: mm.M11,
			xy: mm.M12,
			yx: mm.M21,
			yy: mm.M22,
			dx: mm.Dx,
			dy: mm.Dy
		});
	};

	var attachText = function(object){
		// summary:
		//		builds a text shape from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var shape = object.shape = lang.clone(g.defaultText),
			r = object.rawNode, p = r.path.v.match(g.pathVmlRegExp);
		do{
			if(!p || p.length != 7){ break; }
			var c = r.childNodes, i = 0;
			for(; i < c.length && c[i].tagName != "textpath"; ++i);
			if(i >= c.length){ break; }
			var s = c[i].style;
			shape.text = c[i].string;
			switch(s["v-text-align"]){
				case "left":
					shape.x = parseInt(p[1]);
					shape.align = "start";
					break;
				case "center":
					shape.x = (parseInt(p[1]) + parseInt(p[4])) / 2;
					shape.align = "middle";
					break;
				case "right":
					shape.x = parseInt(p[4]);
					shape.align = "end";
					break;
			}
			shape.y = parseInt(p[2]);
			shape.decoration = s["text-decoration"];
			shape.rotated = s["v-rotate-letters"].toLowerCase() in vml._bool;
			shape.kerning = s["v-text-kern"].toLowerCase() in vml._bool;
			return;
		}while(false);
		object.shape = null;
	};

	var attachFont = function(object){
		// summary:
		//		deduces a font style from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var fontStyle = object.fontStyle = lang.clone(g.defaultFont),
			c = object.rawNode.childNodes, i = 0;
		for(; i < c.length && c[i].tagName == "textpath"; ++i);
		if(i >= c.length){
			object.fontStyle = null;
			return;
		}
		var s = c[i].style;
		fontStyle.style = s.fontstyle;
		fontStyle.variant = s.fontvariant;
		fontStyle.weight = s.fontweight;
		fontStyle.size = s.fontsize;
		fontStyle.family = s.fontfamily;
	};

	var attachTextTransform = function(object) {
		// summary:
		//		deduces a transformation matrix from a node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		attachTransform(object);
		var matrix = object.matrix, fs = object.fontStyle;
		// see comments in _getRealMatrix()
		if(matrix && fs){
			object.matrix = m.multiply(matrix, {dy: g.normalizedLength(fs.size) * 0.35});
		}
	};

	var attachPath = function(object){
		// summary:
		//		builds a path shape from a Node.
		// object: dojox/gfx/shape.Shape
		//		a VML shape
		var shape = object.shape = lang.clone(g.defaultPath),
			p = object.rawNode.path.v.match(g.pathVmlRegExp),
			t = [], skip = false, map = pathLib._pathVmlToSvgMap;
		for(var i = 0; i < p.length; ++p){
			var s = p[i];
			if(s in map) {
				skip = false;
				t.push(map[s]);
			} else if(!skip){
				var n = parseInt(s);
				if(isNaN(n)){
					skip = true;
				}else{
					t.push(n);
				}
			}
		}
		var l = t.length;
		if(l >= 4 && t[l - 1] == "" && t[l - 2] == 0 && t[l - 3] == 0 && t[l - 4] == "l"){
			t.splice(l - 4, 4);
		}
		if(l){
			shape.path = t.join(" ");
		}
	};

	return vml; //return augmented vml api
});

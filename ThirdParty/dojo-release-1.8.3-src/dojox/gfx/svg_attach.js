define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array","dojo/_base/Color", "./_base","./svg","./matrix"], 
  function(kernel, lang, arr, Color, g, svg, Matrix){

	kernel.experimental("dojox.gfx.svg_attach");
	
	svg.attachNode = function(node){
		// summary:
		//		creates a shape from a Node
		// node: Node
		//		an SVG node
		if(!node){
			return null;
		}
		var s = null;
		switch(node.tagName.toLowerCase()){
			case svg.Rect.nodeType:
				s = new svg.Rect(node);
				attachRect(s);
				break;
			case svg.Ellipse.nodeType:
				s = new svg.Ellipse(node);
				attachShape(s, g.defaultEllipse);
				break;
			case svg.Polyline.nodeType:
				s = new svg.Polyline(node);
				attachShape(s, g.defaultPolyline);
				break;
			case svg.Path.nodeType:
				s = new svg.Path(node);
				attachShape(s, g.defaultPath);
				break;
			case svg.Circle.nodeType:
				s = new svg.Circle(node);
				attachShape(s, g.defaultCircle);
				break;
			case svg.Line.nodeType:
				s = new svg.Line(node);
				attachShape(s, g.defaultLine);
				break;
			case svg.Image.nodeType:
				s = new svg.Image(node);
				attachShape(s, g.defaultImage);
				break;
			case svg.Text.nodeType:
				var t = node.getElementsByTagName("textPath");
				if(t && t.length){
					s = new svg.TextPath(node);
					attachShape(s, g.defaultPath);
					attachTextPath(s);
				}else{
					s = new svg.Text(node);
					attachText(s);
				}
				attachFont(s);
				break;
			default:
				//console.debug("FATAL ERROR! tagName = " + node.tagName);
				return null;
		}
		if(!(s instanceof svg.Image)){
			attachFill(s);
			attachStroke(s);
		}
		attachTransform(s);
		return s;	// dojox/gfx/shape.Shape
	};

	svg.attachSurface = function(node){
		// summary:
		//		creates a surface from a Node
		// node: Node
		//		an SVG node
		var s = new svg.Surface();
		s.rawNode = node;
		var def_elems = node.getElementsByTagName("defs");
		if(def_elems.length == 0){
			return null;	// dojox/gfx.Surface
		}
		s.defNode = def_elems[0];
		return s;	// dojox/gfx.Surface
	};

	function attachFill(object){
		// summary:
		//		deduces a fill style from a node.
		// object: dojox/gfx/shape.Shape
		//		an SVG shape
		var fill = object.rawNode.getAttribute("fill");
		if(fill == "none"){
			object.fillStyle = null;
			return;
		}
		var fillStyle = null, gradient = svg.getRef(fill);
		if(gradient){
			switch(gradient.tagName.toLowerCase()){
				case "lineargradient":
					fillStyle = _getGradient(g.defaultLinearGradient, gradient);
					arr.forEach(["x1", "y1", "x2", "y2"], function(x){
						fillStyle[x] = gradient.getAttribute(x);
					});
					break;
				case "radialgradient":
					fillStyle = _getGradient(g.defaultRadialGradient, gradient);
					arr.forEach(["cx", "cy", "r"], function(x){
						fillStyle[x] = gradient.getAttribute(x);
					});
					fillStyle.cx = gradient.getAttribute("cx");
					fillStyle.cy = gradient.getAttribute("cy");
					fillStyle.r  = gradient.getAttribute("r");
					break;
				case "pattern":
					fillStyle = lang.clone(g.defaultPattern);
					arr.forEach(["x", "y", "width", "height"], function(x){
						fillStyle[x] = gradient.getAttribute(x);
					});
					fillStyle.src = gradient.firstChild.getAttributeNS(svg.xmlns.xlink, "href");
					break;
			}
		}else{
			fillStyle = new Color(fill);
			var opacity = object.rawNode.getAttribute("fill-opacity");
			if(opacity != null){ fillStyle.a = opacity; }
		}
		object.fillStyle = fillStyle;
	}

	function _getGradient(defaultGradient, gradient){
		var fillStyle = lang.clone(defaultGradient);
		fillStyle.colors = [];
		for(var i = 0; i < gradient.childNodes.length; ++i){
			fillStyle.colors.push({
				offset: gradient.childNodes[i].getAttribute("offset"),
				color:  new Color(gradient.childNodes[i].getAttribute("stop-color"))
			});
		}
		return fillStyle;
	}

	function attachStroke(object){
		// summary:
		//		deduces a stroke style from a node.
		// object: dojox/gfx/shape.Shape
		//		an SVG shape
		var rawNode = object.rawNode, stroke = rawNode.getAttribute("stroke");
		if(stroke == null || stroke == "none"){
			object.strokeStyle = null;
			return;
		}
		var strokeStyle = object.strokeStyle = lang.clone(g.defaultStroke);
		var color = new Color(stroke);
		if(color){
			strokeStyle.color = color;
			strokeStyle.color.a = rawNode.getAttribute("stroke-opacity");
			strokeStyle.width = rawNode.getAttribute("stroke-width");
			strokeStyle.cap = rawNode.getAttribute("stroke-linecap");
			strokeStyle.join = rawNode.getAttribute("stroke-linejoin");
			if(strokeStyle.join == "miter"){
				strokeStyle.join = rawNode.getAttribute("stroke-miterlimit");
			}
			strokeStyle.style = rawNode.getAttribute("dojoGfxStrokeStyle");
		}
	}

	function attachTransform(object){
		// summary:
		//		deduces a transformation matrix from a node.
		// object: dojox/gfx/shape.Shape
		//		an SVG shape
		var matrix = object.rawNode.getAttribute("transform");
		if(matrix.match(/^matrix\(.+\)$/)){
			var t = matrix.slice(7, -1).split(",");
			object.matrix = Matrix.normalize({
				xx: parseFloat(t[0]), xy: parseFloat(t[2]),
				yx: parseFloat(t[1]), yy: parseFloat(t[3]),
				dx: parseFloat(t[4]), dy: parseFloat(t[5])
			});
		}else{
			object.matrix = null;
		}
	}

	function attachFont(object){
		// summary:
		//		deduces a font style from a Node.
		// object: dojox/gfx/shape.Shape
		//		an SVG shape
		var fontStyle = object.fontStyle = lang.clone(g.defaultFont),
			r = object.rawNode;
		fontStyle.style = r.getAttribute("font-style");
		fontStyle.variant = r.getAttribute("font-variant");
		fontStyle.weight = r.getAttribute("font-weight");
		fontStyle.size = r.getAttribute("font-size");
		fontStyle.family = r.getAttribute("font-family");
	}

	function attachShape(object, def){
		// summary:
		//		builds a shape from a node.
		// object: dojox/gfx/shape.Shape
		//		an SVG shape
		// def: Object
		//		a default shape template
		var shape = object.shape = lang.clone(def), r = object.rawNode;
		for(var i in shape) {
			shape[i] = r.getAttribute(i);
		}
	}

	function attachRect(object){
		// summary:
		//		builds a rectangle shape from a node.
		// object: dojox/gfx/shape.Shape
		//		an SVG shape
		attachShape(object, g.defaultRect);
		object.shape.r = Math.min(object.rawNode.getAttribute("rx"), object.rawNode.getAttribute("ry"));
	}

	function attachText(object){
		// summary:
		//		builds a text shape from a node.
		// object: dojox/gfx/shape.Shape
		//		an SVG shape
		var shape = object.shape = lang.clone(g.defaultText),
			r = object.rawNode;
		shape.x = r.getAttribute("x");
		shape.y = r.getAttribute("y");
		shape.align = r.getAttribute("text-anchor");
		shape.decoration = r.getAttribute("text-decoration");
		shape.rotated = parseFloat(r.getAttribute("rotate")) != 0;
		shape.kerning = r.getAttribute("kerning") == "auto";
		shape.text = r.firstChild.nodeValue;
	}

	function attachTextPath(object){
		// summary:
		//		builds a textpath shape from a node.
		// object: dojox/gfx/shape.Shape
		//		an SVG shape
		var shape = object.shape = lang.clone(g.defaultTextPath),
			r = object.rawNode;
		shape.align = r.getAttribute("text-anchor");
		shape.decoration = r.getAttribute("text-decoration");
		shape.rotated = parseFloat(r.getAttribute("rotate")) != 0;
		shape.kerning = r.getAttribute("kerning") == "auto";
		shape.text = r.firstChild.nodeValue;
	}

	return svg; // return augmented svg api
});

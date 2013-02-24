define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "dojo/_base/Color", "dojo/_base/sniff",
		"dojo/_base/config", "dojo/dom", "dojo/dom-geometry", "dojo/_base/kernel",
		"./_base", "./shape", "./path", "./arc", "./gradient", "./matrix"],
function(lang, declare, arr, Color, has, config, dom, domGeom, kernel, g, gs, pathLib, arcLib, gradient, m){
	var vml = g.vml = {
		// summary:
		//		This the default graphics rendering bridge for IE6-7.
		//		This renderer is very slow.  For best performance on IE6-8, use Silverlight plugin.
		//		IE9+ defaults to the standard W3C SVG renderer.

		// TODO: Everything exported from this file should be inside these braces.
		// For now, I'll just put the declarations needed for documentation.

		// xmlns: String
		//		a VML's namespace

		// text_alignment: Object
		//		mapping from SVG alignment to VML alignment
	};

	vml.xmlns = "urn:schemas-microsoft-com:vml";

	document.namespaces.add("v", vml.xmlns);
	var vmlElems = ["*", "group", "roundrect", "oval", "shape", "rect", "imagedata", "path", "textpath", "text"],
		i = 0, l = 1, s = document.createStyleSheet();
	if(has("ie") >= 8){
		i = 1;
		l = vmlElems.length;
	}
	for (; i < l; ++i) {
		s.addRule("v\\:" + vmlElems[i], "behavior:url(#default#VML); display:inline-block");
	}

	vml.text_alignment = {start: "left", middle: "center", end: "right"};

	vml._parseFloat = function(str) {
		// summary:
		//		a helper function to parse VML-specific floating-point values
		// str: String
		//		a representation of a floating-point number
		return str.match(/^\d+f$/i) ? parseInt(str) / 65536 : parseFloat(str);	// Number
	};

	vml._bool = {"t": 1, "true": 1};

	vml._reparentEvents = function(dst, src){
		for(var name in src){
			if(name.substr(0, 2).toLowerCase() == "on"){
				dst[name] = src[name];
				src[name] = null;
			}
		}
	};

	vml.Shape = declare("dojox.gfx.vml.Shape", gs.Shape, {
		// summary:
		//		VML-specific implementation of dojox/gfx/shape.Shape methods

		destroy: function(){
			this.rawNode = null;
			gs.Shape.prototype.destroy.apply(this, arguments);
		},

		setFill: function(fill){
			// summary:
			//		sets a fill object (VML)
			// fill: Object
			//		a fill object
			//		(see dojox/gfx.defaultLinearGradient,
			//		dojox/gfx.defaultRadialGradient,
			//		dojox/gfx.defaultPattern,
			//		or dojo/_base/Color)

			if(!fill){
				// don't fill
				this.fillStyle = null;
				this.rawNode.filled = "f";
				return this;
			}
			var i, f, fo, a, s;
			if(typeof fill == "object" && "type" in fill){
				// gradient
				switch(fill.type){
					case "linear":
						var matrix = this._getRealMatrix(), bbox = this.getBoundingBox(),
							tbbox = this._getRealBBox ? this._getRealBBox() : this.getTransformedBoundingBox();
						s = [];
						if(this.fillStyle !== fill){
							this.fillStyle = g.makeParameters(g.defaultLinearGradient, fill);
						}
						f = g.gradient.project(matrix, this.fillStyle,
								{x: bbox.x, y: bbox.y},
								{x: bbox.x + bbox.width, y: bbox.y + bbox.height},
								tbbox[0], tbbox[2]);
						a = f.colors;
						if(a[0].offset.toFixed(5) != "0.00000"){
							s.push("0 " + g.normalizeColor(a[0].color).toHex());
						}
						for(i = 0; i < a.length; ++i){
							s.push(a[i].offset.toFixed(5) + " " + g.normalizeColor(a[i].color).toHex());
						}
						i = a.length - 1;
						if(a[i].offset.toFixed(5) != "1.00000"){
							s.push("1 " + g.normalizeColor(a[i].color).toHex());
						}
						fo = this.rawNode.fill;
						fo.colors.value = s.join(";");
						fo.method = "sigma";
						fo.type = "gradient";
						fo.angle = (270 - m._radToDeg(f.angle)) % 360;
						fo.on = true;
						break;
					case "radial":
						f = g.makeParameters(g.defaultRadialGradient, fill);
						this.fillStyle = f;
						var l = parseFloat(this.rawNode.style.left),
							t = parseFloat(this.rawNode.style.top),
							w = parseFloat(this.rawNode.style.width),
							h = parseFloat(this.rawNode.style.height),
							c = isNaN(w) ? 1 : 2 * f.r / w;
						a = [];
						// add a color at the offset 0 (1 in VML coordinates)
						if(f.colors[0].offset > 0){
							a.push({offset: 1, color: g.normalizeColor(f.colors[0].color)});
						}
						// massage colors
						arr.forEach(f.colors, function(v, i){
							a.push({offset: 1 - v.offset * c, color: g.normalizeColor(v.color)});
						});
						i = a.length - 1;
						while(i >= 0 && a[i].offset < 0){ --i; }
						if(i < a.length - 1){
							// correct excessive colors
							var q = a[i], p = a[i + 1];
							p.color = Color.blendColors(q.color, p.color, q.offset / (q.offset - p.offset));
							p.offset = 0;
							while(a.length - i > 2) a.pop();
						}
						// set colors
						i = a.length - 1, s = [];
						if(a[i].offset > 0){
							s.push("0 " + a[i].color.toHex());
						}
						for(; i >= 0; --i){
							s.push(a[i].offset.toFixed(5) + " " + a[i].color.toHex());
						}
						fo = this.rawNode.fill;
						fo.colors.value = s.join(";");
						fo.method = "sigma";
						fo.type = "gradientradial";
						if(isNaN(w) || isNaN(h) || isNaN(l) || isNaN(t)){
							fo.focusposition = "0.5 0.5";
						}else{
							fo.focusposition = ((f.cx - l) / w).toFixed(5) + " " + ((f.cy - t) / h).toFixed(5);
						}
						fo.focussize = "0 0";
						fo.on = true;
						break;
					case "pattern":
						f = g.makeParameters(g.defaultPattern, fill);
						this.fillStyle = f;
						fo = this.rawNode.fill;
						fo.type = "tile";
						fo.src = f.src;
						if(f.width && f.height){
							// in points
							fo.size.x = g.px2pt(f.width);
							fo.size.y = g.px2pt(f.height);
						}
						fo.alignShape = "f";
						fo.position.x = 0;
						fo.position.y = 0;
						fo.origin.x = f.width  ? f.x / f.width  : 0;
						fo.origin.y = f.height ? f.y / f.height : 0;
						fo.on = true;
						break;
				}
				this.rawNode.fill.opacity = 1;
				return this;
			}
			// color object
			this.fillStyle = g.normalizeColor(fill);
			fo = this.rawNode.fill;
			if(!fo){
				fo = this.rawNode.ownerDocument.createElement("v:fill");
			}
			fo.method = "any";
			fo.type = "solid";
			fo.opacity = this.fillStyle.a;
			var alphaFilter = this.rawNode.filters["DXImageTransform.Microsoft.Alpha"];
			if(alphaFilter){
				alphaFilter.opacity = Math.round(this.fillStyle.a * 100);
			}
			this.rawNode.fillcolor = this.fillStyle.toHex();
			this.rawNode.filled = true;
			return this;	// self
		},

		setStroke: function(stroke){
			// summary:
			//		sets a stroke object (VML)
			// stroke: Object
			//		a stroke object
			//		(see dojox/gfx.defaultStroke)

			if(!stroke){
				// don't stroke
				this.strokeStyle = null;
				this.rawNode.stroked = "f";
				return this;
			}
			// normalize the stroke
			if(typeof stroke == "string" || lang.isArray(stroke) || stroke instanceof Color){
				stroke = {color: stroke};
			}
			var s = this.strokeStyle = g.makeParameters(g.defaultStroke, stroke);
			s.color = g.normalizeColor(s.color);
			// generate attributes
			var rn = this.rawNode;
			rn.stroked = true;
			rn.strokecolor = s.color.toCss();
			rn.strokeweight = s.width + "px";	// TODO: should we assume that the width is always in pixels?
			if(rn.stroke) {
				rn.stroke.opacity = s.color.a;
				rn.stroke.endcap = this._translate(this._capMap, s.cap);
				if(typeof s.join == "number") {
					rn.stroke.joinstyle = "miter";
					rn.stroke.miterlimit = s.join;
				}else{
					rn.stroke.joinstyle = s.join;
					// rn.stroke.miterlimit = s.width;
				}
				rn.stroke.dashstyle = s.style == "none" ? "Solid" : s.style;
			}
			return this;	// self
		},

		_capMap: { butt: 'flat' },
		_capMapReversed: { flat: 'butt' },

		_translate: function(dict, value) {
			return (value in dict) ? dict[value] : value;
		},

		_applyTransform: function() {
			var matrix = this._getRealMatrix();
			if(matrix){
				var skew = this.rawNode.skew;
				if(typeof skew == "undefined"){
					for(var i = 0; i < this.rawNode.childNodes.length; ++i){
						if(this.rawNode.childNodes[i].tagName == "skew"){
							skew = this.rawNode.childNodes[i];
							break;
						}
					}
				}
				if(skew){
					skew.on = "f";
					var mt = matrix.xx.toFixed(8) + " " + matrix.xy.toFixed(8) + " " +
						matrix.yx.toFixed(8) + " " + matrix.yy.toFixed(8) + " 0 0",
						offset = Math.floor(matrix.dx).toFixed() + "px " + Math.floor(matrix.dy).toFixed() + "px",
						s = this.rawNode.style,
						l = parseFloat(s.left),
						t = parseFloat(s.top),
						w = parseFloat(s.width),
						h = parseFloat(s.height);
					if(isNaN(l)) l = 0;
					if(isNaN(t)) t = 0;
					if(isNaN(w) || !w) w = 1;
					if(isNaN(h) || !h) h = 1;
					var origin = (-l / w - 0.5).toFixed(8) + " " + (-t / h - 0.5).toFixed(8);
					skew.matrix =  mt;
					skew.origin = origin;
					skew.offset = offset;
					skew.on = true;
				}
			}
			if(this.fillStyle && this.fillStyle.type == "linear"){
				this.setFill(this.fillStyle);
			}
			if(this.clip){
				this.setClip(this.clip);
			}
			return this;
		},

		_setDimensions: function(width, height){
			// summary:
			//		sets the width and height of the rawNode,
			//		if the surface size has been changed
			// width: String
			//		width in pixels
			// height: String
			//		height in pixels

			// default implementation does nothing
			return this; // self
		},

		setRawNode: function(rawNode){
			// summary:
			//		assigns and clears the underlying node that will represent this
			//		shape. Once set, transforms, gradients, etc, can be applied.
			//		(no fill & stroke by default)
			rawNode.stroked = "f";
			rawNode.filled  = "f";
			this.rawNode = rawNode;
			this.rawNode.__gfxObject__ = this.getUID();
		},

		// move family

		_moveToFront: function(){
			// summary:
			//		moves a shape to front of its parent's list of shapes (VML)
			this.rawNode.parentNode.appendChild(this.rawNode);
			return this;
		},
		_moveToBack: function(){
			// summary:
			//		moves a shape to back of its parent's list of shapes (VML)
			var r = this.rawNode, p = r.parentNode, n = p.firstChild;
			p.insertBefore(r, n);
			if(n.tagName == "rect"){
				// surface has a background rectangle, which position should be preserved
				n.swapNode(r);
			}
			return this;
		},

		_getRealMatrix: function(){
			// summary:
			//		returns the cumulative ("real") transformation matrix
			//		by combining the shape's matrix with its parent's matrix
			return this.parentMatrix ? new m.Matrix2D([this.parentMatrix, this.matrix]) : this.matrix;	// dojox/gfx/matrix.Matrix2D
		},
		
		setClip: function(clip){
			// summary:
			//		sets the clipping area of this shape.
			// description:
			//		This method overrides the dojox/gfx/shape.Shape.setClip() method. Only rectangular geometry is supported.
			// clip: Object
			//		an object that defines the clipping geometry, or null to remove clip.
			this.inherited(arguments);
			var nodeStyle = this.rawNode.style;
			if(!clip){
				// remove clip
				nodeStyle.position = "absolute";
			    nodeStyle.clip = "rect(0px "+nodeStyle.width+" "+nodeStyle.height+" 0px)";
			}else{
				if("width" in clip){
					var matrix = this._getRealMatrix(),
						l = parseFloat(nodeStyle.left),
						t = parseFloat(nodeStyle.top);
					if(isNaN(l)) l = 0;
					if(isNaN(t)) t = 0;
					// transform the clip with the shape transform to compute the correct w/h (e.g. after a scale)
					var clipt = m.multiplyRectangle(matrix, clip);
					var pt = m.multiplyPoint(matrix, {x:l,y:t});
					// clip property is relative to the elt border box
					nodeStyle.clip = "rect(" + Math.round(clipt.y-pt.y) + "px " + Math.round(clipt.x-pt.x + clipt.width ) + "px " + 
											Math.round(clipt.y-pt.y + clipt.height ) + "px " + Math.round(clipt.x -pt.x) + "px)";
				}
			}
			return this;
 		}
	});

	  vml.Group = declare("dojox.gfx.vml.Group", vml.Shape, {
		// summary:
		//		a group shape (VML), which can be used
		//		to logically group shapes (e.g, to propagate matricies)
		constructor: function(){
			gs.Container._init.call(this);
		},
		// apply transformation
		_applyTransform: function(){
			// summary:
			//		applies a transformation matrix to a group
			var matrix = this._getRealMatrix();
			for(var i = 0; i < this.children.length; ++i){
				this.children[i]._updateParentMatrix(matrix);
			}
			if(this.clip){
				this.setClip(this.clip);
			}
			return this;	// self
		},
		_setDimensions: function(width, height){
			// summary:
			//		sets the width and height of the rawNode,
			//		if the surface size has been changed
			// width: String
			//		width in pixels
			// height: String
			//		height in pixels
			var r = this.rawNode, rs = r.style,
				bs = this.bgNode.style;
			rs.width = width;
			rs.height = height;
			r.coordsize = width + " " + height;
			bs.width = width;
			bs.height = height;
			for(var i = 0; i < this.children.length; ++i){
				this.children[i]._setDimensions(width, height);
			}
			return this; // self
		},
		setClip: function(clip){
			// summary:
			//		sets the clipping area of this shape.
			// description:
			//		This method overrides the dojox/gfx/shape.Shape.setClip() method.
			// clip: Object
			//		an object that defines the clipping geometry, or null to remove clip.

			this.clip = clip;
			var nodeStyle = this.rawNode.style;
			if(!clip){
				// remove clip
				nodeStyle.position = "absolute";
			    nodeStyle.clip = "rect(0px "+nodeStyle.width+" "+nodeStyle.height+" 0px)";
			}else if("width" in clip){
				var matrix = this._getRealMatrix();
				// transform the clip with group transform
				var clipt = m.multiplyRectangle(matrix, clip);
				// vml feature :-( ): if the group rawNode bbox x/y are < 0,
				// need to adjust clip accordingly
				var bbox = this.getBoundingBox();
				bbox = bbox ? m.multiplyRectangle(matrix, bbox) : null;
				var offx = bbox && bbox.x < 0 ? bbox.x : 0,
					offy = bbox && bbox.y < 0 ? bbox.y : 0;
				nodeStyle.position = "absolute";
				nodeStyle.clip = "rect(" + 
					Math.round(clipt.y - offy) + "px " + 
					Math.round(clipt.x + clipt.width - offx) + "px " + 
					Math.round(clipt.y + clipt.height - offy)  + "px " + 
					Math.round(clipt.x - offx) + "px)";
			}
			return this;
 		},
		destroy: function(){
			// summary:
			//		Releases all internal resources owned by this shape. Once this method has been called,
			//		the instance is considered disposed and should not be used anymore.
			this.clear(true);
			// avoid this.inherited
			vml.Shape.prototype.destroy.apply(this, arguments);
		}
	});
	vml.Group.nodeType = "group";

	  vml.Rect = declare("dojox.gfx.vml.Rect", [vml.Shape, gs.Rect], {
		// summary:
		//		a rectangle shape (VML)
		setShape: function(newShape){
			// summary:
			//		sets a rectangle shape object (VML)
			// newShape: Object
			//		a rectangle shape object
			var shape = this.shape = g.makeParameters(this.shape, newShape);
			this.bbox = null;
			var r = Math.min(1, (shape.r / Math.min(parseFloat(shape.width), parseFloat(shape.height)))).toFixed(8);
			// a workaround for the VML's arcsize bug: cannot read arcsize of an instantiated node
			var parent = this.rawNode.parentNode, before = null;
			if(parent){
				if(parent.lastChild !== this.rawNode){
					for(var i = 0; i < parent.childNodes.length; ++i){
						if(parent.childNodes[i] === this.rawNode){
							before = parent.childNodes[i + 1];
							break;
						}
					}
				}
				parent.removeChild(this.rawNode);
			}
			if(has("ie") > 7){
				var node = this.rawNode.ownerDocument.createElement("v:roundrect");
				node.arcsize = r;
				node.style.display = "inline-block";
				vml._reparentEvents(node, this.rawNode);
				this.rawNode = node;
				this.rawNode.__gfxObject__ = this.getUID();						
			}else{
				this.rawNode.arcsize = r;
			}
			if(parent){
				if(before){
					parent.insertBefore(this.rawNode, before);
				}else{
					parent.appendChild(this.rawNode);
				}
			}
			var style = this.rawNode.style;
			style.left   = shape.x.toFixed();
			style.top    = shape.y.toFixed();
			style.width  = (typeof shape.width == "string" && shape.width.indexOf("%") >= 0)  ? shape.width  : Math.max(shape.width.toFixed(),0);
			style.height = (typeof shape.height == "string" && shape.height.indexOf("%") >= 0) ? shape.height : Math.max(shape.height.toFixed(),0);
			// set all necessary styles, which are lost by VML (yes, it's a VML's bug)
			return this.setTransform(this.matrix).setFill(this.fillStyle).setStroke(this.strokeStyle);	// self
		}
	});
	vml.Rect.nodeType = "roundrect"; // use a roundrect so the stroke join type is respected

	vml.Ellipse = declare("dojox.gfx.vml.Ellipse", [vml.Shape, gs.Ellipse], {
		// summary:
		//		an ellipse shape (VML)
		setShape: function(newShape){
			// summary:
			//		sets an ellipse shape object (VML)
			// newShape: Object
			//		an ellipse shape object
			var shape = this.shape = g.makeParameters(this.shape, newShape);
			this.bbox = null;
			var style = this.rawNode.style;
			style.left   = (shape.cx - shape.rx).toFixed();
			style.top    = (shape.cy - shape.ry).toFixed();
			style.width  = (shape.rx * 2).toFixed();
			style.height = (shape.ry * 2).toFixed();
			return this.setTransform(this.matrix);	// self
		}
	});
	vml.Ellipse.nodeType = "oval";

	vml.Circle = declare("dojox.gfx.vml.Circle", [vml.Shape, gs.Circle], {
		// summary:
		//		a circle shape (VML)
		setShape: function(newShape){
			// summary:
			//		sets a circle shape object (VML)
			// newShape: Object
			//		a circle shape object
			var shape = this.shape = g.makeParameters(this.shape, newShape);
			this.bbox = null;
			var style = this.rawNode.style;
			style.left   = (shape.cx - shape.r).toFixed();
			style.top    = (shape.cy - shape.r).toFixed();
			style.width  = (shape.r * 2).toFixed();
			style.height = (shape.r * 2).toFixed();
			return this;	// self
		}
	});
	vml.Circle.nodeType = "oval";

	vml.Line = declare("dojox.gfx.vml.Line", [vml.Shape, gs.Line], {
		// summary:
		//		a line shape (VML)
		constructor: function(rawNode){
			if(rawNode) rawNode.setAttribute("dojoGfxType", "line");
		},
		setShape: function(newShape){
			// summary:
			//		sets a line shape object (VML)
			// newShape: Object
			//		a line shape object
			var shape = this.shape = g.makeParameters(this.shape, newShape);
			this.bbox = null;
			this.rawNode.path.v = "m" + shape.x1.toFixed() + " " + shape.y1.toFixed() +
				"l" + shape.x2.toFixed() + " " + shape.y2.toFixed() + "e";
			return this.setTransform(this.matrix);	// self
		}
	});
	vml.Line.nodeType = "shape";

	vml.Polyline = declare("dojox.gfx.vml.Polyline", [vml.Shape, gs.Polyline], {
		// summary:
		//		a polyline/polygon shape (VML)
		constructor: function(rawNode){
			if(rawNode) rawNode.setAttribute("dojoGfxType", "polyline");
		},
		setShape: function(points, closed){
			// summary:
			//		sets a polyline/polygon shape object (VML)
			// points: Object|Array
			//		a polyline/polygon shape object, or an array of points
			// closed: Boolean?
			//		if true, close the polyline explicitly
			if(points && points instanceof Array){
				this.shape = g.makeParameters(this.shape, { points: points });
				if(closed && this.shape.points.length) this.shape.points.push(this.shape.points[0]);
			}else{
				this.shape = g.makeParameters(this.shape, points);
			}
			this.bbox = null;
			this._normalizePoints();
			var attr = [], p = this.shape.points;
			if(p.length > 0){
				attr.push("m");
				attr.push(p[0].x.toFixed(), p[0].y.toFixed());
				if(p.length > 1){
					attr.push("l");
					for(var i = 1; i < p.length; ++i){
						attr.push(p[i].x.toFixed(), p[i].y.toFixed());
					}
				}
			}
			attr.push("e");
			this.rawNode.path.v = attr.join(" ");
			return this.setTransform(this.matrix);	// self
		}
	});
	vml.Polyline.nodeType = "shape";

	vml.Image = declare("dojox.gfx.vml.Image", [vml.Shape, gs.Image], {
		// summary:
		//		an image (VML)
		setShape: function(newShape){
			// summary:
			//		sets an image shape object (VML)
			// newShape: Object
			//		an image shape object
			var shape = this.shape = g.makeParameters(this.shape, newShape);
			this.bbox = null;
			this.rawNode.firstChild.src = shape.src;
			return this.setTransform(this.matrix);	// self
		},
		_applyTransform: function() {
			var matrix = this._getRealMatrix(),
				rawNode = this.rawNode,
				s = rawNode.style,
				shape = this.shape;
			if(matrix){
				matrix = m.multiply(matrix, {dx: shape.x, dy: shape.y});
			}else{
				matrix = m.normalize({dx: shape.x, dy: shape.y});
			}
			if(matrix.xy == 0 && matrix.yx == 0 && matrix.xx > 0 && matrix.yy > 0){
				// special case to avoid filters
				s.filter = "";
				s.width  = Math.floor(matrix.xx * shape.width);
				s.height = Math.floor(matrix.yy * shape.height);
				s.left   = Math.floor(matrix.dx);
				s.top    = Math.floor(matrix.dy);
			}else{
				var ps = rawNode.parentNode.style;
				s.left   = "0px";
				s.top    = "0px";
				s.width  = ps.width;
				s.height = ps.height;
				matrix = m.multiply(matrix,
					{xx: shape.width / parseInt(s.width), yy: shape.height / parseInt(s.height)});
				var f = rawNode.filters["DXImageTransform.Microsoft.Matrix"];
				if(f){
					f.M11 = matrix.xx;
					f.M12 = matrix.xy;
					f.M21 = matrix.yx;
					f.M22 = matrix.yy;
					f.Dx = matrix.dx;
					f.Dy = matrix.dy;
				}else{
					s.filter = "progid:DXImageTransform.Microsoft.Matrix(M11=" + matrix.xx +
						", M12=" + matrix.xy + ", M21=" + matrix.yx + ", M22=" + matrix.yy +
						", Dx=" + matrix.dx + ", Dy=" + matrix.dy + ")";
				}
			}
			return this; // self
		},
		_setDimensions: function(width, height){
			// summary:
			//		sets the width and height of the rawNode,
			//		if the surface size has been changed
			// width: String
			//		width in pixels
			// height: String
			//		height in pixels

			var r = this.rawNode, f = r.filters["DXImageTransform.Microsoft.Matrix"];
			if(f){
				var s = r.style;
				s.width  = width;
				s.height = height;
				return this._applyTransform(); // self
			}
			return this;	// self
		}
	});
	vml.Image.nodeType = "rect";

	vml.Text = declare("dojox.gfx.vml.Text", [vml.Shape, gs.Text], {
		// summary:
		//		an anchored text (VML)
		constructor: function(rawNode){
			if(rawNode){rawNode.setAttribute("dojoGfxType", "text");}
			this.fontStyle = null;
		},
		_alignment: {start: "left", middle: "center", end: "right"},
		setShape: function(newShape){
			// summary:
			//		sets a text shape object (VML)
			// newShape: Object
			//		a text shape object
			this.shape = g.makeParameters(this.shape, newShape);
			this.bbox = null;
			var r = this.rawNode, s = this.shape, x = s.x, y = s.y.toFixed(), path;
			switch(s.align){
				case "middle":
					x -= 5;
					break;
				case "end":
					x -= 10;
					break;
			}
			path = "m" + x.toFixed() + "," + y + "l" + (x + 10).toFixed() + "," + y + "e";
			// find path and text path
			var p = null, t = null, c = r.childNodes;
			for(var i = 0; i < c.length; ++i){
				var tag = c[i].tagName;
				if(tag == "path"){
					p = c[i];
					if(t) break;
				}else if(tag == "textpath"){
					t = c[i];
					if(p) break;
				}
			}
			if(!p){
				p = r.ownerDocument.createElement("v:path");
				r.appendChild(p);
			}
			if(!t){
				t = r.ownerDocument.createElement("v:textpath");
				r.appendChild(t);
			}
			p.v = path;
			p.textPathOk = true;
			t.on = true;
			var a = vml.text_alignment[s.align];
			t.style["v-text-align"] = a ? a : "left";
			t.style["text-decoration"] = s.decoration;
			t.style["v-rotate-letters"] = s.rotated;
			t.style["v-text-kern"] = s.kerning;
			t.string = s.text;
			return this.setTransform(this.matrix);	// self
		},
		_setFont: function(){
			// summary:
			//		sets a font object (VML)
			var f = this.fontStyle, c = this.rawNode.childNodes;
			for(var i = 0; i < c.length; ++i){
				if(c[i].tagName == "textpath"){
					c[i].style.font = g.makeFontString(f);
					break;
				}
			}
			this.setTransform(this.matrix);
		},
		_getRealMatrix: function(){
			// summary:
			//		returns the cumulative ("real") transformation matrix
			//		by combining the shape's matrix with its parent's matrix;
			//		it makes a correction for a font size
			var matrix = this.inherited(arguments);
			// It appears that text is always aligned vertically at a middle of x-height (???).
			// It is impossible to obtain these metrics from VML => I try to approximate it with
			// more-or-less util value of 0.7 * FontSize, which is typical for European fonts.
			if(matrix){
				matrix = m.multiply(matrix,
					{dy: -g.normalizedLength(this.fontStyle ? this.fontStyle.size : "10pt") * 0.35});
			}
			return matrix;	// dojox/gfx/matrix.Matrix2D
		},
		getTextWidth: function(){
			// summary:
			//		get the text width, in px
			var rawNode = this.rawNode, _display = rawNode.style.display;
			rawNode.style.display = "inline";
			var _width = g.pt2px(parseFloat(rawNode.currentStyle.width));
			rawNode.style.display = _display;
			return _width;
		}
	});
	vml.Text.nodeType = "shape";

	vml.Path = declare("dojox.gfx.vml.Path", [vml.Shape, pathLib.Path], {
		// summary:
		//		a path shape (VML)
		constructor: function(rawNode){
			if(rawNode && !rawNode.getAttribute("dojoGfxType")){
				rawNode.setAttribute("dojoGfxType", "path");
			}
			this.vmlPath = "";
			this.lastControl = {};
		},
		_updateWithSegment: function(segment){
			// summary:
			//		updates the bounding box of path with new segment
			// segment: Object
			//		a segment
			var last = lang.clone(this.last);
			this.inherited(arguments);
			if(arguments.length > 1){ return; } // skip transfomed bbox calculations
			// add a VML path segment
			var path = this[this.renderers[segment.action]](segment, last);
			if(typeof this.vmlPath == "string"){
				this.vmlPath += path.join("");
				this.rawNode.path.v = this.vmlPath + " r0,0 e";
			}else{
				Array.prototype.push.apply(this.vmlPath, path); //FIXME: why not push()?
			}
		},
		setShape: function(newShape){
			// summary:
			//		forms a path using a shape (VML)
			// newShape: Object
			//		a VML path string or a path object (see dojox/gfx.defaultPath)
			this.vmlPath = [];
			this.lastControl.type = "";	// no prior control point
			this.inherited(arguments);
			this.vmlPath = this.vmlPath.join("");
			this.rawNode.path.v = this.vmlPath + " r0,0 e";
			return this;
		},
		_pathVmlToSvgMap: {m: "M", l: "L", t: "m", r: "l", c: "C", v: "c", qb: "Q", x: "z", e: ""},
		// VML-specific segment renderers
		renderers: {
			M: "_moveToA", m: "_moveToR",
			L: "_lineToA", l: "_lineToR",
			H: "_hLineToA", h: "_hLineToR",
			V: "_vLineToA", v: "_vLineToR",
			C: "_curveToA", c: "_curveToR",
			S: "_smoothCurveToA", s: "_smoothCurveToR",
			Q: "_qCurveToA", q: "_qCurveToR",
			T: "_qSmoothCurveToA", t: "_qSmoothCurveToR",
			A: "_arcTo", a: "_arcTo",
			Z: "_closePath", z: "_closePath"
		},
		_addArgs: function(path, segment, from, upto){
			var n = segment instanceof Array ? segment : segment.args;
			for(var i = from; i < upto; ++i){
				path.push(" ", n[i].toFixed());
			}
		},
		_adjustRelCrd: function(last, segment, step){
			var n = segment instanceof Array ? segment : segment.args, l = n.length,
				result = new Array(l), i = 0, x = last.x, y = last.y;
			if(typeof x != "number"){
				// there is no last coordinate =>
				// treat the first pair as an absolute coordinate
				result[0] = x = n[0];
				result[1] = y = n[1];
				i = 2;
			}
			if(typeof step == "number" && step != 2){
				var j = step;
				while(j <= l){
					for(; i < j; i += 2){
						result[i] = x + n[i];
						result[i + 1] = y + n[i + 1];
					}
					x = result[j - 2];
					y = result[j - 1];
					j += step;
				}
			}else{
				for(; i < l; i += 2){
					result[i] = (x += n[i]);
					result[i + 1] = (y += n[i + 1]);
				}
			}
			return result;
		},
		_adjustRelPos: function(last, segment){
			var n = segment instanceof Array ? segment : segment.args, l = n.length,
				result = new Array(l);
			for(var i = 0; i < l; ++i){
				result[i] = (last += n[i]);
			}
			return result;
		},
		_moveToA: function(segment){
			var p = [" m"], n = segment instanceof Array ? segment : segment.args, l = n.length;
			this._addArgs(p, n, 0, 2);
			if(l > 2){
				p.push(" l");
				this._addArgs(p, n, 2, l);
			}
			this.lastControl.type = "";	// no control point after this primitive
			return p;
		},
		_moveToR: function(segment, last){
			return this._moveToA(this._adjustRelCrd(last, segment));
		},
		_lineToA: function(segment){
			var p = [" l"], n = segment instanceof Array ? segment : segment.args;
			this._addArgs(p, n, 0, n.length);
			this.lastControl.type = "";	// no control point after this primitive
			return p;
		},
		_lineToR: function(segment, last){
			return this._lineToA(this._adjustRelCrd(last, segment));
		},
		_hLineToA: function(segment, last){
			var p = [" l"], y = " " + last.y.toFixed(),
				n = segment instanceof Array ? segment : segment.args, l = n.length;
			for(var i = 0; i < l; ++i){
				p.push(" ", n[i].toFixed(), y);
			}
			this.lastControl.type = "";	// no control point after this primitive
			return p;
		},
		_hLineToR: function(segment, last){
			return this._hLineToA(this._adjustRelPos(last.x, segment), last);
		},
		_vLineToA: function(segment, last){
			var p = [" l"], x = " " + last.x.toFixed(),
				n = segment instanceof Array ? segment : segment.args, l = n.length;
			for(var i = 0; i < l; ++i){
				p.push(x, " ", n[i].toFixed());
			}
			this.lastControl.type = "";	// no control point after this primitive
			return p;
		},
		_vLineToR: function(segment, last){
			return this._vLineToA(this._adjustRelPos(last.y, segment), last);
		},
		_curveToA: function(segment){
			var p = [], n = segment instanceof Array ? segment : segment.args, l = n.length,
				lc = this.lastControl;
			for(var i = 0; i < l; i += 6){
				p.push(" c");
				this._addArgs(p, n, i, i + 6);
			}
			lc.x = n[l - 4];
			lc.y = n[l - 3];
			lc.type = "C";
			return p;
		},
		_curveToR: function(segment, last){
			return this._curveToA(this._adjustRelCrd(last, segment, 6));
		},
		_smoothCurveToA: function(segment, last){
			var p = [], n = segment instanceof Array ? segment : segment.args, l = n.length,
				lc = this.lastControl, i = 0;
			if(lc.type != "C"){
				p.push(" c");
				this._addArgs(p, [last.x, last.y], 0, 2);
				this._addArgs(p, n, 0, 4);
				lc.x = n[0];
				lc.y = n[1];
				lc.type = "C";
				i = 4;
			}
			for(; i < l; i += 4){
				p.push(" c");
				this._addArgs(p, [
					2 * last.x - lc.x,
					2 * last.y - lc.y
				], 0, 2);
				this._addArgs(p, n, i, i + 4);
				lc.x = n[i];
				lc.y = n[i + 1];
			}
			return p;
		},
		_smoothCurveToR: function(segment, last){
			return this._smoothCurveToA(this._adjustRelCrd(last, segment, 4), last);
		},
		_qCurveToA: function(segment){
			var p = [], n = segment instanceof Array ? segment : segment.args, l = n.length,
				lc = this.lastControl;
			for(var i = 0; i < l; i += 4){
				p.push(" qb");
				this._addArgs(p, n, i, i + 4);
			}
			lc.x = n[l - 4];
			lc.y = n[l - 3];
			lc.type = "Q";
			return p;
		},
		_qCurveToR: function(segment, last){
			return this._qCurveToA(this._adjustRelCrd(last, segment, 4));
		},
		_qSmoothCurveToA: function(segment, last){
			var p = [], n = segment instanceof Array ? segment : segment.args, l = n.length,
				lc = this.lastControl, i = 0;
			if(lc.type != "Q"){
				p.push(" qb");
				this._addArgs(p, [
					lc.x = last.x,
					lc.y = last.y
				], 0, 2);
				lc.type = "Q";
				this._addArgs(p, n, 0, 2);
				i = 2;
			}
			for(; i < l; i += 2){
				p.push(" qb");
				this._addArgs(p, [
					lc.x = 2 * last.x - lc.x,
					lc.y = 2 * last.y - lc.y
				], 0, 2);
				this._addArgs(p, n, i, i + 2);
			}
			return p;
		},
		_qSmoothCurveToR: function(segment, last){
			return this._qSmoothCurveToA(this._adjustRelCrd(last, segment, 2), last);
		},
		_arcTo: function(segment, last){
			var p = [], n = segment.args, l = n.length, relative = segment.action == "a";
			for(var i = 0; i < l; i += 7){
				var x1 = n[i + 5], y1 = n[i + 6];
				if(relative){
					x1 += last.x;
					y1 += last.y;
				}
				var result = arcLib.arcAsBezier(
					last, n[i], n[i + 1], n[i + 2],
					n[i + 3] ? 1 : 0, n[i + 4] ? 1 : 0,
					x1, y1
				);
				for(var j = 0; j < result.length; ++j){
					p.push(" c");
					var t = result[j];
					this._addArgs(p, t, 0, t.length);
					this._updateBBox(t[0], t[1]);
					this._updateBBox(t[2], t[3]);
					this._updateBBox(t[4], t[5]);
				}
				last.x = x1;
				last.y = y1;
			}
			this.lastControl.type = "";	// no control point after this primitive
			return p;
		},
		_closePath: function(){
			this.lastControl.type = "";	// no control point after this primitive
			return ["x"];
		}
	});
	vml.Path.nodeType = "shape";

	vml.TextPath = declare("dojox.gfx.vml.TextPath", [vml.Path, pathLib.TextPath], {
		// summary:
		//		a textpath shape (VML)
		constructor: function(rawNode){
			if(rawNode){rawNode.setAttribute("dojoGfxType", "textpath");}
			this.fontStyle = null;
			if(!("text" in this)){
				this.text = lang.clone(g.defaultTextPath);
			}
			if(!("fontStyle" in this)){
				this.fontStyle = lang.clone(g.defaultFont);
			}
		},
		setText: function(newText){
			// summary:
			//		sets a text to be drawn along the path
			this.text = g.makeParameters(this.text,
				typeof newText == "string" ? {text: newText} : newText);
			this._setText();
			return this;	// self
		},
		setFont: function(newFont){
			// summary:
			//		sets a font for text
			this.fontStyle = typeof newFont == "string" ?
				g.splitFontString(newFont) :
				g.makeParameters(g.defaultFont, newFont);
			this._setFont();
			return this;	// self
		},

		_setText: function(){
			// summary:
			//		sets a text shape object (VML)
			this.bbox = null;
			var r = this.rawNode, s = this.text,
				// find path and text path
				p = null, t = null, c = r.childNodes;
			for(var i = 0; i < c.length; ++i){
				var tag = c[i].tagName;
				if(tag == "path"){
					p = c[i];
					if(t) break;
				}else if(tag == "textpath"){
					t = c[i];
					if(p) break;
				}
			}
			if(!p){
				p = this.rawNode.ownerDocument.createElement("v:path");
				r.appendChild(p);
			}
			if(!t){
				t = this.rawNode.ownerDocument.createElement("v:textpath");
				r.appendChild(t);
			}
			p.textPathOk = true;
			t.on = true;
			var a = vml.text_alignment[s.align];
			t.style["v-text-align"] = a ? a : "left";
			t.style["text-decoration"] = s.decoration;
			t.style["v-rotate-letters"] = s.rotated;
			t.style["v-text-kern"] = s.kerning;
			t.string = s.text;
		},
		_setFont: function(){
			// summary:
			//		sets a font object (VML)
			var f = this.fontStyle, c = this.rawNode.childNodes;
			for(var i = 0; i < c.length; ++i){
				if(c[i].tagName == "textpath"){
					c[i].style.font = g.makeFontString(f);
					break;
				}
			}
		}
	});
	vml.TextPath.nodeType = "shape";

	vml.Surface = declare("dojox.gfx.vml.Surface", gs.Surface, {
		// summary:
		//		a surface object to be used for drawings (VML)
		constructor: function(){
			gs.Container._init.call(this);
		},
		destroy: function(){
			this.clear(true); 
			this.inherited(arguments);
		},
		setDimensions: function(width, height){
			// summary:
			//		sets the width and height of the rawNode
			// width: String
			//		width of surface, e.g., "100px"
			// height: String
			//		height of surface, e.g., "100px"
			this.width  = g.normalizedLength(width);	// in pixels
			this.height = g.normalizedLength(height);	// in pixels
			if(!this.rawNode) return this;
			var cs = this.clipNode.style,
				r = this.rawNode, rs = r.style,
				bs = this.bgNode.style,
				ps = this._parent.style, i;
			ps.width = width;
			ps.height = height;
			cs.width  = width;
			cs.height = height;
			cs.clip = "rect(0px " + width + "px " + height + "px 0px)";
			rs.width = width;
			rs.height = height;
			r.coordsize = width + " " + height;
			bs.width = width;
			bs.height = height;
			for(i = 0; i < this.children.length; ++i){
				this.children[i]._setDimensions(width, height);
			}
			return this;	// self
		},
		getDimensions: function(){
			// summary:
			//		returns an object with properties "width" and "height"
			var t = this.rawNode ? {
				width:  g.normalizedLength(this.rawNode.style.width),
				height: g.normalizedLength(this.rawNode.style.height)} : null;
			if(t.width  <= 0){ t.width  = this.width; }
			if(t.height <= 0){ t.height = this.height; }
			return t;	// Object
		}
	});

	vml.createSurface = function(parentNode, width, height){
		// summary:
		//		creates a surface (VML)
		// parentNode: Node
		//		a parent node
		// width: String|Number
		//		width of surface, e.g., "100px" or 100
		// height: String|NUmber
		//		height of surface, e.g., "100px" or 100
		// returns:
		//     newly created surface

		if(!width && !height){
			var pos = domGeom.position(parentNode);
			width  = width  || pos.w;
			height = height || pos.h;
		}
		if(typeof width == "number"){
			width = width + "px";
		}
		if(typeof height == "number"){
			height = height + "px";
		}

		var s = new vml.Surface(), p = dom.byId(parentNode),
			c = s.clipNode = p.ownerDocument.createElement("div"),
			r = s.rawNode = p.ownerDocument.createElement("v:group"),
			cs = c.style, rs = r.style;

		if(has("ie") > 7){
			rs.display = "inline-block";
		}

		s._parent = p;
		s._nodes.push(c);	// other elements will be deleted as parts of "c"

		p.style.width  = width;
		p.style.height = height;

		cs.position = "absolute";
		cs.width  = width;
		cs.height = height;
		cs.clip = "rect(0px " + width + " " + height + " 0px)";
		rs.position = "absolute";
		rs.width  = width;
		rs.height = height;
		r.coordsize = (width === "100%" ? width : parseFloat(width)) + " " +
			(height === "100%" ? height : parseFloat(height));
		r.coordorigin = "0 0";

		// create a background rectangle, which is required to show all other shapes
		var b = s.bgNode = r.ownerDocument.createElement("v:rect"), bs = b.style;
		bs.left = bs.top = 0;
		bs.width  = rs.width;
		bs.height = rs.height;
		b.filled = b.stroked = "f";

		r.appendChild(b);
		c.appendChild(r);
		p.appendChild(c);

		s.width  = g.normalizedLength(width);	// in pixels
		s.height = g.normalizedLength(height);	// in pixels

		return s;	// dojox/gfx/shape.Surface
	};

	// Extenders
	
	// copied from dojox/gfx/utils
	function forEach(object, f, o){
		o = o || kernel.global;
		f.call(o, object);
		if(object instanceof g.Surface || object instanceof g.Group){
			arr.forEach(object.children, function(shape){
				forEach(shape, f, o);
			});
		}
	}

	var addPatch9624 = function(shape){
		if(this != shape.getParent()){
			// cleanup from old parent
			var oldParent = shape.getParent();
			if(oldParent) { oldParent.remove(shape); }
			// then move the raw node
			this.rawNode.appendChild(shape.rawNode);
			C.add.apply(this, arguments);
			// reapply visual attributes (slow..)
			forEach(this, function(s){
				if (typeof(s.getFont) == 'function'){ // text shapes need to be completely refreshed
					s.setShape(s.getShape());
					s.setFont(s.getFont());
				}
				if (typeof(s.setFill) == 'function'){ // if setFill is available a setStroke should be safe to assume also
					s.setFill(s.getFill());
					s.setStroke(s.getStroke());
				}
			});
		}
		return this;	// self
	};
	
	var add15 = function(shape){
		if(this != shape.getParent()){
			this.rawNode.appendChild(shape.rawNode);
			if(!shape.getParent()){ 
				// reapply visual attributes 
				shape.setFill(shape.getFill()); 
				shape.setStroke(shape.getStroke()); 
			} 
			C.add.apply(this, arguments);
		}
		return this;	// self
	};

	var C = gs.Container, Container = {
		add: config.fixVmlAdd === true ? addPatch9624 : add15,
		remove: function(shape, silently){
			// summary:
			//		remove a shape from a group/surface
			// shape: dojox/gfx/shape.Shape
			//		a VML shape object
			// silently: Boolean?
			//		if true, regenerate a picture
			if(this == shape.getParent()){
				if(this.rawNode == shape.rawNode.parentNode){
					this.rawNode.removeChild(shape.rawNode);
				}
				C.remove.apply(this, arguments);
			}
			return this;	// self
		},
		clear: function(){
			// summary:
			//		removes all shapes from a group/surface
			var r = this.rawNode;
			while(r.firstChild != r.lastChild){
				if(r.firstChild != this.bgNode){
					r.removeChild(r.firstChild);
				}
				if(r.lastChild != this.bgNode){
					r.removeChild(r.lastChild);
				}
			}
			return C.clear.apply(this, arguments);
		},
		getBoundingBox: C.getBoundingBox,
		_moveChildToFront: C._moveChildToFront,
		_moveChildToBack:  C._moveChildToBack
	};

	var Creator = {
		// summary:
		//		VML shape creators
		createGroup: function(){
			// summary:
			//		creates a VML group shape
			var node = this.createObject(vml.Group, null);	// dojox/gfx.Group
			// create a background rectangle, which is required to show all other shapes
			var r = node.rawNode.ownerDocument.createElement("v:rect");
			r.style.left = r.style.top = 0;
			r.style.width  = node.rawNode.style.width;
			r.style.height = node.rawNode.style.height;
			r.filled = r.stroked = "f";
			node.rawNode.appendChild(r);
			node.bgNode = r;
			return node;	// dojox/gfx.Group
		},
		createImage: function(image){
			// summary:
			//		creates a VML image shape
			// image: Object
			//		an image object (see dojox/gfx.defaultImage)
			if(!this.rawNode) return null;
			var shape = new vml.Image(),
				doc = this.rawNode.ownerDocument,
				node = doc.createElement('v:rect');
			node.stroked = "f";
			node.style.width  = this.rawNode.style.width;
			node.style.height = this.rawNode.style.height;
			var img  = doc.createElement('v:imagedata');
			node.appendChild(img);
			shape.setRawNode(node);
			this.rawNode.appendChild(node);
			shape.setShape(image);
			this.add(shape);
			return shape;	// dojox/gfx/shape.Image
		},
		createRect: function(rect){
			// summary:
			//		creates a rectangle shape
			// rect: Object
			//		a path object (see dojox/gfx.defaultRect)
			if(!this.rawNode) return null;
			var shape = new vml.Rect,
				node = this.rawNode.ownerDocument.createElement("v:roundrect");
			if(has("ie") > 7){
				node.style.display = "inline-block";
			}
			shape.setRawNode(node);
			this.rawNode.appendChild(node);
			shape.setShape(rect);
			this.add(shape);
			return shape;	// dojox/gfx.Rect
		},
		createObject: function(shapeType, rawShape) {
			// summary:
			//		creates an instance of the passed shapeType class
			// shapeType: Function
			//		a class constructor to create an instance of
			// rawShape: Object
			//		properties to be passed in to the classes "setShape" method
			// overrideSize: Boolean
			//		set the size explicitly, if true
			if(!this.rawNode) return null;
			var shape = new shapeType(),
				node = this.rawNode.ownerDocument.createElement('v:' + shapeType.nodeType);
			shape.setRawNode(node);
			this.rawNode.appendChild(node);
			switch(shapeType){
				case vml.Group:
				case vml.Line:
				case vml.Polyline:
				case vml.Image:
				case vml.Text:
				case vml.Path:
				case vml.TextPath:
					this._overrideSize(node);
			}
			shape.setShape(rawShape);
			this.add(shape);
			return shape;	// dojox/gfx/shape.Shape
		},
		_overrideSize: function(node){
			var s = this.rawNode.style, w = s.width, h = s.height;
			node.style.width  = w;
			node.style.height = h;
			node.coordsize = parseInt(w) + " " + parseInt(h);
		}
	};

	lang.extend(vml.Group, Container);
	lang.extend(vml.Group, gs.Creator);
	lang.extend(vml.Group, Creator);

	lang.extend(vml.Surface, Container);
	lang.extend(vml.Surface, gs.Creator);
	lang.extend(vml.Surface, Creator);

	// Mouse/Touch event
	vml.fixTarget = function(event, gfxElement){
		// summary:
		//		Adds the gfxElement to event.gfxTarget if none exists. This new
		//		property will carry the GFX element associated with this event.
		// event: Object 
		//		The current input event (MouseEvent or TouchEvent)
		// gfxElement: Object
		//		The GFX target element
		if (!event.gfxTarget) {
			event.gfxTarget = gs.byId(event.target.__gfxObject__);
		}
		return true;
	};
	
	return vml;
});

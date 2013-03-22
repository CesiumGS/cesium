define(["./_base", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "dojo/_base/window", "dojo/dom-geometry", 
		"dojo/dom", "./_base", "./shape", "./path", "./arc", "./matrix", "./decompose"], 
function(g, lang, arr, declare, win, domGeom, dom, gfxBase, gs, pathLib, ga, m, decompose ){
	var canvas = g.canvas = {
		// summary:
		//		This the graphics rendering bridge for W3C Canvas compliant browsers.
		//		Since Canvas is an immediate mode graphics api, with no object graph or
		//		eventing capabilities, use of this module alone will only add in drawing support.
		//		The additional module, canvasWithEvents extends this module with additional support
		//		for handling events on Canvas.  By default, the support for events is now included
		//		however, if only drawing capabilities are needed, canvas event module can be disabled
		//		using the dojoConfig option, canvasEvents:true|false.
		//		The id of the Canvas renderer is 'canvas'.  This id can be used when switch Dojo's
		//		graphics context between renderer implementations.  See dojox/gfx/_base.switchRenderer
		//		API.
	};
	var pattrnbuffer = null,
		mp = m.multiplyPoint, 
		pi = Math.PI, 
		twoPI = 2 * pi, 
		halfPI = pi /2,
		extend = lang.extend;

	canvas.Shape = declare("dojox.gfx.canvas.Shape", gs.Shape, {
		_render: function(/* Object */ ctx){
			// summary:
			//		render the shape
			ctx.save();
			this._renderTransform(ctx);
			this._renderClip(ctx);
			this._renderShape(ctx);
			this._renderFill(ctx, true);
			this._renderStroke(ctx, true);
			ctx.restore();
		},
		_renderClip: function(ctx){
			if (this.canvasClip){
				this.canvasClip.render(ctx);
				ctx.clip();
			}
		},
		_renderTransform: function(/* Object */ ctx){
			if("canvasTransform" in this){
				var t = this.canvasTransform;
				ctx.translate(t.dx, t.dy);
				ctx.rotate(t.angle2);
				ctx.scale(t.sx, t.sy);
				ctx.rotate(t.angle1);
				// The future implementation when vendors catch up with the spec:
				// var t = this.matrix;
				// ctx.transform(t.xx, t.yx, t.xy, t.yy, t.dx, t.dy);
			}
		},
		_renderShape: function(/* Object */ ctx){
			// nothing
		},
		_renderFill: function(/* Object */ ctx, /* Boolean */ apply){
			if("canvasFill" in this){
				var fs = this.fillStyle;
				if("canvasFillImage" in this){
					var w = fs.width, h = fs.height,
						iw = this.canvasFillImage.width, ih = this.canvasFillImage.height,
						// let's match the svg default behavior wrt. aspect ratio: xMidYMid meet
						sx = w == iw ? 1 : w / iw,
						sy = h == ih ? 1 : h / ih,
						s = Math.min(sx,sy), //meet->math.min , slice->math.max
						dx = (w - s * iw)/2,
						dy = (h - s * ih)/2;
					// the buffer used to scaled the image
					pattrnbuffer.width = w; pattrnbuffer.height = h;
					var copyctx = pattrnbuffer.getContext("2d");
					copyctx.clearRect(0, 0, w, h);
					copyctx.drawImage(this.canvasFillImage, 0, 0, iw, ih, dx, dy, s*iw, s*ih);
					this.canvasFill = ctx.createPattern(pattrnbuffer, "repeat");
					delete this.canvasFillImage;
				}
				ctx.fillStyle = this.canvasFill;
				if(apply){
					// offset the pattern
					if (fs.type==="pattern" && (fs.x !== 0 || fs.y !== 0)) {
						ctx.translate(fs.x,fs.y);
					}
					ctx.fill();
				}
			}else{
				ctx.fillStyle = "rgba(0,0,0,0.0)";
			}
		},
		_renderStroke: function(/* Object */ ctx, /* Boolean */ apply){
			var s = this.strokeStyle;
			if(s){
				ctx.strokeStyle = s.color.toString();
				ctx.lineWidth = s.width;
				ctx.lineCap = s.cap;
				if(typeof s.join == "number"){
					ctx.lineJoin = "miter";
					ctx.miterLimit = s.join;
				}else{
					ctx.lineJoin = s.join;
				}
				if(apply){ ctx.stroke(); }
			}else if(!apply){
				ctx.strokeStyle = "rgba(0,0,0,0.0)";
			}
		},

		// events are not implemented
		getEventSource: function(){ return null; },
		connect:		function(){},
		disconnect:		function(){},
		
		canvasClip:null,
		setClip: function(/*Object*/clip){
			this.inherited(arguments);
			var clipType = clip ? "width" in clip ? "rect" : 
							"cx" in clip ? "ellipse" : 
							"points" in clip ? "polyline" : "d" in clip ? "path" : null : null;
			if(clip && !clipType){
				return this;
			}
			this.canvasClip = clip ? makeClip(clipType, clip) : null;
			this.surface.makeDirty();
			return this;
		}
	});

	var makeClip = function(clipType, geometry){
		switch(clipType){
			case "ellipse":
				return {
					canvasEllipse: makeEllipse(geometry),
					render: function(ctx){return canvas.Ellipse.prototype._renderShape.call(this, ctx);}
				};
			case "rect":
				return {
					shape: lang.delegate(geometry,{r:0}),
					render: function(ctx){return canvas.Rect.prototype._renderShape.call(this, ctx);}
				};
			case "path":
				return {
					canvasPath: makeClipPath(geometry),
					render: function(ctx){this.canvasPath._renderShape(ctx);}
				};
			case "polyline":
				return {
					canvasPolyline: geometry.points,
					render: function(ctx){return canvas.Polyline.prototype._renderShape.call(this, ctx);}
				};
		}
		return null;
	};
	
	var makeClipPath = function(geo){	
		var p = new dojox.gfx.canvas.Path();		
		p.canvasPath = [];
		p._setPath(geo.d);
		return p;
	};

	var modifyMethod = function(shape, method, extra){
		var old = shape.prototype[method];
		shape.prototype[method] = extra ?
			function(){
				this.surface.makeDirty();
				old.apply(this, arguments);
				extra.call(this);
				return this;
			} :
			function(){
				this.surface.makeDirty();
				return old.apply(this, arguments);
			};
	};

	modifyMethod(canvas.Shape, "setTransform",
		function(){
			// prepare Canvas-specific structures
			if(this.matrix){
				this.canvasTransform = g.decompose(this.matrix);
			}else{
				delete this.canvasTransform;
			}
		});

	modifyMethod(canvas.Shape, "setFill",
		function(){
			// prepare Canvas-specific structures
			var fs = this.fillStyle, f;
			if(fs){
				if(typeof(fs) == "object" && "type" in fs){
					var ctx = this.surface.rawNode.getContext("2d");
					switch(fs.type){
						case "linear":
						case "radial":
							f = fs.type == "linear" ?
								ctx.createLinearGradient(fs.x1, fs.y1, fs.x2, fs.y2) :
								ctx.createRadialGradient(fs.cx, fs.cy, 0, fs.cx, fs.cy, fs.r);
							arr.forEach(fs.colors, function(step){
								f.addColorStop(step.offset, g.normalizeColor(step.color).toString());
							});
							break;
						case "pattern":
							if (!pattrnbuffer) {
								pattrnbuffer = document.createElement("canvas");
							}
							// no need to scale the image since the canvas.createPattern uses
							// the original image data and not the scaled ones (see spec.)
							// the scaling needs to be done at rendering time in a context buffer
							var img =new Image();
							this.surface.downloadImage(img, fs.src);
							this.canvasFillImage = img;
					}
				}else{
					// Set fill color using CSS RGBA func style
					f = fs.toString();
				}
				this.canvasFill = f;
			}else{
				delete this.canvasFill;
			}
		});

	modifyMethod(canvas.Shape, "setStroke");
	modifyMethod(canvas.Shape, "setShape");

	canvas.Group = declare("dojox.gfx.canvas.Group", canvas.Shape, {
		// summary:
		//		a group shape (Canvas), which can be used
		//		to logically group shapes (e.g, to propagate matricies)
		constructor: function(){
			gs.Container._init.call(this);
		},
		_render: function(/* Object */ ctx){
			// summary:
			//		render the group
			ctx.save();
			this._renderTransform(ctx);
			this._renderClip(ctx);
			for(var i = 0; i < this.children.length; ++i){
				this.children[i]._render(ctx);
			}
			ctx.restore();
		},
		destroy: function(){
			// summary:
			//		Releases all internal resources owned by this shape. Once this method has been called,
			//		the instance is considered disposed and should not be used anymore.
			this.clear(true);
			// avoid this.inherited
			canvas.Shape.prototype.destroy.apply(this, arguments);
		}		
	});

	canvas.Rect = declare("dojox.gfx.canvas.Rect", [canvas.Shape, gs.Rect], {
		// summary:
		//		a rectangle shape (Canvas)
		_renderShape: function(/* Object */ ctx){
			var s = this.shape, r = Math.min(s.r, s.height / 2, s.width / 2),
				xl = s.x, xr = xl + s.width, yt = s.y, yb = yt + s.height,
				xl2 = xl + r, xr2 = xr - r, yt2 = yt + r, yb2 = yb - r;
			ctx.beginPath();
			ctx.moveTo(xl2, yt);
			if(r){
				ctx.arc(xr2, yt2, r, -halfPI, 0, false);
				ctx.arc(xr2, yb2, r, 0, halfPI, false);
				ctx.arc(xl2, yb2, r, halfPI, pi, false);
				ctx.arc(xl2, yt2, r, pi, pi + halfPI, false);
			}else{
				ctx.lineTo(xr2, yt);
				ctx.lineTo(xr, yb2);
				ctx.lineTo(xl2, yb);
				ctx.lineTo(xl, yt2);
			}
	 		ctx.closePath();
		}
	});

	var bezierCircle = [];
	(function(){
		var u = ga.curvePI4;
		bezierCircle.push(u.s, u.c1, u.c2, u.e);
		for(var a = 45; a < 360; a += 45){
			var r = m.rotateg(a);
			bezierCircle.push(mp(r, u.c1), mp(r, u.c2), mp(r, u.e));
		}
	})();
	
	var makeEllipse = function(s){
		// prepare Canvas-specific structures
		var t, c1, c2, r = [],
			M = m.normalize([m.translate(s.cx, s.cy), m.scale(s.rx, s.ry)]);
		t = mp(M, bezierCircle[0]);
		r.push([t.x, t.y]);
		for(var i = 1; i < bezierCircle.length; i += 3){
			c1 = mp(M, bezierCircle[i]);
			c2 = mp(M, bezierCircle[i + 1]);
			t  = mp(M, bezierCircle[i + 2]);
			r.push([c1.x, c1.y, c2.x, c2.y, t.x, t.y]);
		}
		return r;
	};

	canvas.Ellipse = declare("dojox.gfx.canvas.Ellipse", [canvas.Shape, gs.Ellipse], {
		// summary:
		//		an ellipse shape (Canvas)
		setShape: function(){
			this.inherited(arguments);
			this.canvasEllipse = makeEllipse(this.shape);
			return this;
		},
		_renderShape: function(/* Object */ ctx){
			var r = this.canvasEllipse;
			ctx.beginPath();
			ctx.moveTo.apply(ctx, r[0]);
			for(var i = 1; i < r.length; ++i){
				ctx.bezierCurveTo.apply(ctx, r[i]);
			}
			ctx.closePath();
		}
	});

	canvas.Circle = declare("dojox.gfx.canvas.Circle", [canvas.Shape, gs.Circle], {
		// summary:
		//		a circle shape (Canvas)
		_renderShape: function(/* Object */ ctx){
			var s = this.shape;
			ctx.beginPath();
			ctx.arc(s.cx, s.cy, s.r, 0, twoPI, 1);
		}
	});

	canvas.Line = declare("dojox.gfx.canvas.Line", [canvas.Shape, gs.Line], {
		// summary:
		//		a line shape (Canvas)
		_renderShape: function(/* Object */ ctx){
			var s = this.shape;
			ctx.beginPath();
			ctx.moveTo(s.x1, s.y1);
			ctx.lineTo(s.x2, s.y2);
		}
	});

	canvas.Polyline = declare("dojox.gfx.canvas.Polyline", [canvas.Shape, gs.Polyline], {
		// summary:
		//		a polyline/polygon shape (Canvas)
		setShape: function(){
			this.inherited(arguments);
			var p = this.shape.points, f = p[0], r, c, i;
			this.bbox = null;
			// normalize this.shape.points as array of points: [{x,y}, {x,y}, ...]
			this._normalizePoints();			
			// after _normalizePoints, if shape.points was [x1,y1,x2,y2,..], shape.points references a new array 
			// and p references the original points array
			// prepare Canvas-specific structures, if needed
			if(p.length){  
				if(typeof f == "number"){ // already in the canvas format [x1,y1,x2,y2,...]
					r = p; 
				}else{ // convert into canvas-specific format
					r = [];
					for(i=0; i < p.length; ++i){
						c = p[i];
						r.push(c.x, c.y);
					}
				}
			}else{
				r = [];
			}
			this.canvasPolyline = r;
			return this;
		},
		_renderShape: function(/* Object */ ctx){
			var p = this.canvasPolyline;
			if(p.length){
				ctx.beginPath();
				ctx.moveTo(p[0], p[1]);
				for(var i = 2; i < p.length; i += 2){
					ctx.lineTo(p[i], p[i + 1]);
				}
			}
		}
	});

	canvas.Image = declare("dojox.gfx.canvas.Image", [canvas.Shape, gs.Image], {
		// summary:
		//		an image shape (Canvas)
		setShape: function(){
			this.inherited(arguments);
			// prepare Canvas-specific structures
			var img = new Image();
			this.surface.downloadImage(img, this.shape.src);
			this.canvasImage = img;
			return this;
		},
		_renderShape: function(/* Object */ ctx){
			var s = this.shape;
			ctx.drawImage(this.canvasImage, s.x, s.y, s.width, s.height);
		}
	});

	canvas.Text = declare("dojox.gfx.canvas.Text", [canvas.Shape, gs.Text], {
		_setFont:function(){
			if(this.fontStyle){
				this.canvasFont = g.makeFontString(this.fontStyle);
			}else{
				delete this.canvasFont;
			}
		},
		
		getTextWidth: function(){
			// summary:
			//		get the text width in pixels
			var s = this.shape, w = 0, ctx;
			if(s.text && s.text.length > 0){
				ctx = this.surface.rawNode.getContext("2d");
				ctx.save();
				this._renderTransform(ctx);
				this._renderFill(ctx, false);
				this._renderStroke(ctx, false);
				if (this.canvasFont)
					ctx.font = this.canvasFont;
				w = ctx.measureText(s.text).width;
				ctx.restore();
			}
			return w;
		},
		
		// override to apply first fill and stroke (
		// the base implementation is for path-based shape that needs to first define the path then to fill/stroke it.
		// Here, we need the fillstyle or strokestyle to be set before calling fillText/strokeText.
		_render: function(/* Object */ctx){
			// summary:
			//		render the shape
			// ctx: Object
			//		the drawing context.
			ctx.save();
			this._renderTransform(ctx);
			this._renderFill(ctx, false);
			this._renderStroke(ctx, false);
			this._renderShape(ctx);
			ctx.restore();
		},
		
		_renderShape: function(ctx){
			// summary:
			//		a text shape (Canvas)
			// ctx: Object
			//		the drawing context.
			var ta, s = this.shape;
			if(!s.text || s.text.length == 0){
				return;
			}
			// text align
			ta = s.align === 'middle' ? 'center' : s.align;
			ctx.textAlign = ta;
			if(this.canvasFont){
				ctx.font = this.canvasFont;
			}
			if(this.canvasFill){
				ctx.fillText(s.text, s.x, s.y);
			}
			if(this.strokeStyle){
				ctx.beginPath(); // fix bug in FF3.6. Fixed in FF4b8
				ctx.strokeText(s.text, s.x, s.y);
				ctx.closePath();
			}
		}
	});
	modifyMethod(canvas.Text, "setFont");
	
	// the next test is from https://github.com/phiggins42/has.js
	if(win.global.CanvasRenderingContext2D){
		// need to doublecheck canvas is supported since module can be loaded if building layers (ticket 14288)
		var ctx2d = win.doc.createElement("canvas").getContext("2d");
		if(ctx2d && typeof ctx2d.fillText != "function"){
			canvas.Text.extend({
				getTextWidth: function(){
					return 0;
				},
				_renderShape: function(){
				}
			});
		}
	}

	var pathRenderers = {
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
		};

	canvas.Path = declare("dojox.gfx.canvas.Path", [canvas.Shape, pathLib.Path], {
		// summary:
		//		a path shape (Canvas)
		constructor: function(){
			this.lastControl = {};
		},
		setShape: function(){
			this.canvasPath = [];
			return this.inherited(arguments);
		},
		_updateWithSegment: function(segment){
			var last = lang.clone(this.last);
			this[pathRenderers[segment.action]](this.canvasPath, segment.action, segment.args);
			this.last = last;
			this.inherited(arguments);
		},
		_renderShape: function(/* Object */ ctx){
			var r = this.canvasPath;
			ctx.beginPath();
			for(var i = 0; i < r.length; i += 2){
				ctx[r[i]].apply(ctx, r[i + 1]);
			}
		},
		_moveToA: function(result, action, args){
			result.push("moveTo", [args[0], args[1]]);
			for(var i = 2; i < args.length; i += 2){
				result.push("lineTo", [args[i], args[i + 1]]);
			}
			this.last.x = args[args.length - 2];
			this.last.y = args[args.length - 1];
			this.lastControl = {};
		},
		_moveToR: function(result, action, args){
			if("x" in this.last){
				result.push("moveTo", [this.last.x += args[0], this.last.y += args[1]]);
			}else{
				result.push("moveTo", [this.last.x = args[0], this.last.y = args[1]]);
			}
			for(var i = 2; i < args.length; i += 2){
				result.push("lineTo", [this.last.x += args[i], this.last.y += args[i + 1]]);
			}
			this.lastControl = {};
		},
		_lineToA: function(result, action, args){
			for(var i = 0; i < args.length; i += 2){
				result.push("lineTo", [args[i], args[i + 1]]);
			}
			this.last.x = args[args.length - 2];
			this.last.y = args[args.length - 1];
			this.lastControl = {};
		},
		_lineToR: function(result, action, args){
			for(var i = 0; i < args.length; i += 2){
				result.push("lineTo", [this.last.x += args[i], this.last.y += args[i + 1]]);
			}
			this.lastControl = {};
		},
		_hLineToA: function(result, action, args){
			for(var i = 0; i < args.length; ++i){
				result.push("lineTo", [args[i], this.last.y]);
			}
			this.last.x = args[args.length - 1];
			this.lastControl = {};
		},
		_hLineToR: function(result, action, args){
			for(var i = 0; i < args.length; ++i){
				result.push("lineTo", [this.last.x += args[i], this.last.y]);
			}
			this.lastControl = {};
		},
		_vLineToA: function(result, action, args){
			for(var i = 0; i < args.length; ++i){
				result.push("lineTo", [this.last.x, args[i]]);
			}
			this.last.y = args[args.length - 1];
			this.lastControl = {};
		},
		_vLineToR: function(result, action, args){
			for(var i = 0; i < args.length; ++i){
				result.push("lineTo", [this.last.x, this.last.y += args[i]]);
			}
			this.lastControl = {};
		},
		_curveToA: function(result, action, args){
			for(var i = 0; i < args.length; i += 6){
				result.push("bezierCurveTo", args.slice(i, i + 6));
			}
			this.last.x = args[args.length - 2];
			this.last.y = args[args.length - 1];
			this.lastControl.x = args[args.length - 4];
			this.lastControl.y = args[args.length - 3];
			this.lastControl.type = "C";
		},
		_curveToR: function(result, action, args){
			for(var i = 0; i < args.length; i += 6){
				result.push("bezierCurveTo", [
					this.last.x + args[i],
					this.last.y + args[i + 1],
					this.lastControl.x = this.last.x + args[i + 2],
					this.lastControl.y = this.last.y + args[i + 3],
					this.last.x + args[i + 4],
					this.last.y + args[i + 5]
				]);
				this.last.x += args[i + 4];
				this.last.y += args[i + 5];
			}
			this.lastControl.type = "C";
		},
		_smoothCurveToA: function(result, action, args){
			for(var i = 0; i < args.length; i += 4){
				var valid = this.lastControl.type == "C";
				result.push("bezierCurveTo", [
					valid ? 2 * this.last.x - this.lastControl.x : this.last.x,
					valid ? 2 * this.last.y - this.lastControl.y : this.last.y,
					args[i],
					args[i + 1],
					args[i + 2],
					args[i + 3]
				]);
				this.lastControl.x = args[i];
				this.lastControl.y = args[i + 1];
				this.lastControl.type = "C";
			}
			this.last.x = args[args.length - 2];
			this.last.y = args[args.length - 1];
		},
		_smoothCurveToR: function(result, action, args){
			for(var i = 0; i < args.length; i += 4){
				var valid = this.lastControl.type == "C";
				result.push("bezierCurveTo", [
					valid ? 2 * this.last.x - this.lastControl.x : this.last.x,
					valid ? 2 * this.last.y - this.lastControl.y : this.last.y,
					this.last.x + args[i],
					this.last.y + args[i + 1],
					this.last.x + args[i + 2],
					this.last.y + args[i + 3]
				]);
				this.lastControl.x = this.last.x + args[i];
				this.lastControl.y = this.last.y + args[i + 1];
				this.lastControl.type = "C";
				this.last.x += args[i + 2];
				this.last.y += args[i + 3];
			}
		},
		_qCurveToA: function(result, action, args){
			for(var i = 0; i < args.length; i += 4){
				result.push("quadraticCurveTo", args.slice(i, i + 4));
			}
			this.last.x = args[args.length - 2];
			this.last.y = args[args.length - 1];
			this.lastControl.x = args[args.length - 4];
			this.lastControl.y = args[args.length - 3];
			this.lastControl.type = "Q";
		},
		_qCurveToR: function(result, action, args){
			for(var i = 0; i < args.length; i += 4){
				result.push("quadraticCurveTo", [
					this.lastControl.x = this.last.x + args[i],
					this.lastControl.y = this.last.y + args[i + 1],
					this.last.x + args[i + 2],
					this.last.y + args[i + 3]
				]);
				this.last.x += args[i + 2];
				this.last.y += args[i + 3];
			}
			this.lastControl.type = "Q";
		},
		_qSmoothCurveToA: function(result, action, args){
			for(var i = 0; i < args.length; i += 2){
				var valid = this.lastControl.type == "Q";
				result.push("quadraticCurveTo", [
					this.lastControl.x = valid ? 2 * this.last.x - this.lastControl.x : this.last.x,
					this.lastControl.y = valid ? 2 * this.last.y - this.lastControl.y : this.last.y,
					args[i],
					args[i + 1]
				]);
				this.lastControl.type = "Q";
			}
			this.last.x = args[args.length - 2];
			this.last.y = args[args.length - 1];
		},
		_qSmoothCurveToR: function(result, action, args){
			for(var i = 0; i < args.length; i += 2){
				var valid = this.lastControl.type == "Q";
				result.push("quadraticCurveTo", [
					this.lastControl.x = valid ? 2 * this.last.x - this.lastControl.x : this.last.x,
					this.lastControl.y = valid ? 2 * this.last.y - this.lastControl.y : this.last.y,
					this.last.x + args[i],
					this.last.y + args[i + 1]
				]);
				this.lastControl.type = "Q";
				this.last.x += args[i];
				this.last.y += args[i + 1];
			}
		},
		_arcTo: function(result, action, args){
			var relative = action == "a";
			for(var i = 0; i < args.length; i += 7){
				var x1 = args[i + 5], y1 = args[i + 6];
				if(relative){
					x1 += this.last.x;
					y1 += this.last.y;
				}
				var arcs = ga.arcAsBezier(
					this.last, args[i], args[i + 1], args[i + 2],
					args[i + 3] ? 1 : 0, args[i + 4] ? 1 : 0,
					x1, y1
				);
				arr.forEach(arcs, function(p){
					result.push("bezierCurveTo", p);
				});
				this.last.x = x1;
				this.last.y = y1;
			}
			this.lastControl = {};
		},
		_closePath: function(result, action, args){
			result.push("closePath", []);
			this.lastControl = {};
		}
	});
	arr.forEach(["moveTo", "lineTo", "hLineTo", "vLineTo", "curveTo",
		"smoothCurveTo", "qCurveTo", "qSmoothCurveTo", "arcTo", "closePath"],
		function(method){ modifyMethod(canvas.Path, method); }
	);

	canvas.TextPath = declare("dojox.gfx.canvas.TextPath", [canvas.Shape, pathLib.TextPath], {
		// summary:
		//		a text shape (Canvas)
		_renderShape: function(/* Object */ ctx){
			var s = this.shape;
			// nothing for the moment
		},
		_setText: function(){
			// not implemented
		},
		_setFont: function(){
			// not implemented
		}
	});

	canvas.Surface = declare("dojox.gfx.canvas.Surface", gs.Surface, {
		// summary:
		//		a surface object to be used for drawings (Canvas)
		constructor: function(){
			gs.Container._init.call(this);
			this.pendingImageCount = 0;
			this.makeDirty();
		},
		destroy: function(){
			gs.Container.clear.call(this, true); // avoid makeDirty() from canvas.Container.clear impl.
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
			var dirty = false;
			if (this.rawNode.width != this.width){
				this.rawNode.width = this.width;
				dirty = true;
			}
			if (this.rawNode.height != this.height){
				this.rawNode.height = this.height;
				dirty = true;
			}
			if (dirty)
				this.makeDirty();
			return this;	// self
		},
		getDimensions: function(){
			// summary:
			//		returns an object with properties "width" and "height"
			return this.rawNode ? {width:  this.rawNode.width, height: this.rawNode.height} : null;	// Object
		},
		_render: function(force){
			// summary:
			//		render the all shapes
			if(!force && this.pendingImageCount){ return; }
			var ctx = this.rawNode.getContext("2d");
			ctx.clearRect(0, 0, this.rawNode.width, this.rawNode.height);
			this.render(ctx);
			if("pendingRender" in this){
				clearTimeout(this.pendingRender);
				delete this.pendingRender;
			}
		},
		render: function(ctx){
			// summary:
			//		Renders the gfx scene.
			// description:
			//		this method is called to render the gfx scene to the specified context.
			//		This method should not be invoked directly but should be used instead
			//		as an extension point on which user can connect to with aspect.before/aspect.after
			//		to implement pre- or post- image processing jobs on the drawing surface.
			// ctx: CanvasRenderingContext2D
			//		The surface Canvas rendering context.
			ctx.save();
			for(var i = 0; i < this.children.length; ++i){
				this.children[i]._render(ctx);
			}
			ctx.restore();
		},		
		makeDirty: function(){
			// summary:
			//		internal method, which is called when we may need to redraw
			if(!this.pendingImagesCount && !("pendingRender" in this)){
				this.pendingRender = setTimeout(lang.hitch(this, this._render), 0);
			}
		},
		downloadImage: function(img, url){
			// summary:
			//		internal method, which starts an image download and renders, when it is ready
			// img: Image
			//		the image object
			// url: String
			//		the url of the image
			var handler = lang.hitch(this, this.onImageLoad);
			if(!this.pendingImageCount++ && "pendingRender" in this){
				clearTimeout(this.pendingRender);
				delete this.pendingRender;
			}
			img.onload  = handler;
			img.onerror = handler;
			img.onabort = handler;
			img.src = url;
		},
		onImageLoad: function(){
			if(!--this.pendingImageCount){
				this.onImagesLoaded();
				this._render();
			}
		},
		onImagesLoaded: function(){
			// summary:
			//		An extension point called when all pending images downloads have been completed.
			// description:
			//		This method is invoked when all pending images downloads have been completed, just before
			//		the gfx scene is redrawn. User can connect to this method to get notified when a
			//		gfx scene containing images is fully resolved.
		},

		// events are not implemented
		getEventSource: function(){ return null; },
		connect:		function(){},
		disconnect:		function(){}
	});

	canvas.createSurface = function(parentNode, width, height){
		// summary:
		//		creates a surface (Canvas)
		// parentNode: Node
		//		a parent node
		// width: String
		//		width of surface, e.g., "100px"
		// height: String
		//		height of surface, e.g., "100px"

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

		var s = new canvas.Surface(),
			p = dom.byId(parentNode),
			c = p.ownerDocument.createElement("canvas");

		c.width  = g.normalizedLength(width);	// in pixels
		c.height = g.normalizedLength(height);	// in pixels

		p.appendChild(c);
		s.rawNode = c;
		s._parent = p;
		s.surface = s;
		return s;	// dojox/gfx.Surface
	};

	// Extenders

	var C = gs.Container, Container = {
		add: function(shape){
			this.surface.makeDirty();
			return C.add.apply(this, arguments);
		},
		remove: function(shape, silently){
			this.surface.makeDirty();
			return C.remove.apply(this, arguments);
		},
		clear: function(){
			this.surface.makeDirty();
			return C.clear.apply(this, arguments);
		},
		getBoundingBox: C.getBoundingBox,
		_moveChildToFront: function(shape){
			this.surface.makeDirty();
			return C._moveChildToFront.apply(this, arguments);
		},
		_moveChildToBack: function(shape){
			this.surface.makeDirty();
			return C._moveChildToBack.apply(this, arguments);
		}
	};

	var Creator = {
		// summary:
		//		Canvas shape creators
		createObject: function(shapeType, rawShape) {
			// summary:
			//		creates an instance of the passed shapeType class
			// shapeType: Function
			//		a class constructor to create an instance of
			// rawShape: Object
			//		properties to be passed in to the classes "setShape" method
			// overrideSize: Boolean
			//		set the size explicitly, if true
			var shape = new shapeType();
			shape.surface = this.surface;
			shape.setShape(rawShape);
			this.add(shape);
			return shape;	// dojox/gfx/shape.Shape
		}
	};

	extend(canvas.Group, Container);
	extend(canvas.Group, gs.Creator);
	extend(canvas.Group, Creator);

	extend(canvas.Surface, Container);
	extend(canvas.Surface, gs.Creator);
	extend(canvas.Surface, Creator);
	
	// no event support -> nothing to fix. 
	canvas.fixTarget = function(event, gfxElement){
		// tags:
		//		private
		return true;
	};
	 
	return canvas;
});

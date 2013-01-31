define(["dojo/_base/kernel", "dojo/dom-style", "dojo/_base/lang", "dojo/_base/html", "dojo/_base/sniff",
		"dojo/_base/window", "dojo/dom", "dojo/dom-construct", "dojo/dom-style", "dojo/dom-attr"], 
	function(kernel, domStyle, lang, Html, has, win, DOM, DOMConstruct, DOMStyle, DOMAttr){
	kernel.experimental("dojox.html.ext-dojo.style");
	var st = lang.getObject("dojox.html.ext-dojo.style", true);
	var HtmlX = lang.getObject("dojox.html");
	// summary:
	//		Extensions to dojo.style adding the css3 "transform" and "transform-origin" properties on IE5.5+
	// description:
	//		A Package to extend the dojo.style function
	//		Supported transformation functions:
	//	 	matrix, translate, translateX, translateY, scale, scaleX, scaleY, rotate, skewX, skewY, skew
	lang.mixin(HtmlX["ext-dojo"].style, {
		supportsTransform: true,
		_toPx: function(measure){
			var ds = Html.style, _conversion = this._conversion;
			if(typeof measure === "number"){
				return measure + "px";
			}else if(measure.toLowerCase().indexOf("px") != -1){
				return measure;
			}
			// "native" conversion in px
			!_conversion.parentNode && DOMConstruct.place(_conversion, win.body());
			ds(_conversion, "margin", measure);
			return ds(_conversion, "margin");
		},
		init: function(){
			var docStyle = win.doc.documentElement.style, extStyle = HtmlX["ext-dojo"].style,
				sget = DOMStyle.get, sset = DOMStyle.set;
			DOMStyle.get = function(/*DOMNode|String*/ node, /*String|Object*/ name){
				var tr = (name == "transform"),
					to = (name == "transformOrigin");
				if(tr){
					return extStyle.getTransform(node);
				}else if(to){
					return extStyle.getTransformOrigin(node);
				}else{
					return arguments.length == 2 ? sget(node, name) : sget(node);
				}
			};
			DOMStyle.set = function(/*DOMNode|String*/ node, /*String|Object*/ name, /*String?*/ value){
				var tr = (name == "transform"),
					to = (name == "transformOrigin"),
					n = DOM.byId(node)
				;
				if(tr){
					return extStyle.setTransform(n, value, true);
				}else if(to){
					return extStyle.setTransformOrigin(n, value);
				}else{
					return arguments.length == 3 ? sset(n, name, value) : sset(n, name);
				}
			};
			// prefixes and property names
			for(var i = 0, tPrefix = ["WebkitT", "MozT", "OT", "msT", "t"]; i < tPrefix.length; i++){
				if(typeof docStyle[tPrefix[i] + "ransform"] !== "undefined"){
					this.tPropertyName = tPrefix[i] + "ransform";
				}
				if(typeof docStyle[tPrefix[i] + "ransformOrigin"] !== "undefined"){
					this.toPropertyName = tPrefix[i] + "ransformOrigin";
				}
			}
			if(this.tPropertyName){
				this.setTransform = function(/*DomNode*/node, /*String*/ transform){
					return DOMStyle.set(node, this.tPropertyName, transform);
				};
				this.getTransform = function(/*DomNode*/node){
					return DOMStyle.get(node, this.tPropertyName);
				};
			}else if(has("ie")){
				this.setTransform = this._setTransformFilter;
				this.getTransform = this._getTransformFilter;
			}
			if(this.toPropertyName){
				this.setTransformOrigin = function(/*DomNode*/node, /*String*/ transformOrigin){
					return sset(node, this.toPropertyName, transformOrigin);
				};
				this.getTransformOrigin = function(/*DomNode*/node){
					return sget(node, this.toPropertyName);
				};
			}else if(has("ie")){
				this.setTransformOrigin = this._setTransformOriginFilter;
				this.getTransformOrigin = this._getTransformOriginFilter;
			}else{
				this.supportsTransform = false;
			}
			this._conversion = DOMConstruct.create("div", {
				style: {
					position: "absolute",
					top: "-100px",
					left: "-100px",
					fontSize: 0,
					width: "0",
					backgroundPosition: "50% 50%"
				}
			});
		},
		_notSupported: function(){
			console.warn("Sorry, this browser doesn't support transform and transform-origin");
		},
		_setTransformOriginFilter: function(/*DomNode*/ node, /*String*/ transformOrigin){
			var to = lang.trim(transformOrigin)
				.replace(" top", " 0")
				.replace("left ", "0 ")
				.replace(" center", "50%")
				.replace("center ", "50% ")
				.replace(" bottom", " 100%")
				.replace("right ", "100% ")
				.replace(/\s+/, " "),
				toAry = to.split(" "),
				n = DOM.byId(node),
				t = this.getTransform(n),
				validOrigin = true
			;
			for(var i = 0; i < toAry.length; i++){
				validOrigin = validOrigin && /^0|(\d+(%|px|pt|in|pc|mm|cm))$/.test(toAry[i]);
				if(toAry[i].indexOf("%") == -1){
					toAry[i] = this._toPx(toAry[i]);
				}
			}
			if(!validOrigin || !toAry.length || toAry.length > 2 ){
				return transformOrigin;
			}
			Html.attr(n, "dojo-transform-origin", toAry.join(" "));
			t && this.setTransform(node, t);
			return transformOrigin;
		},
		_getTransformOriginFilter: function(/*DomNode*/ node){
			return Html.attr(node, "dojo-transform-origin") || "50% 50%";
		},
		_setTransformFilter: function(/*DomNode*/ node, /*String*/ transform){
			// Using the Matrix Filter to implement the transform property on IE
			var t = transform.replace(/\s/g, ""),
				n = DOM.byId(node),
				transforms = t.split(")"),
				toRad = 1, toRad1 = 1,
				mstr = "DXImageTransform.Microsoft.Matrix",
				hasAttr = DOMAttr.has,
				attr = Html.attr,
				// Math functions
				PI = Math.PI, cos = Math.cos, sin = Math.sin, tan = Math.tan, max = Math.max, min = Math.min, abs = Math.abs,
				degToRad = PI/180, gradToRad = PI/200,

				// current transform
				ct = "", currentTransform = "",
				matchingTransforms = [],
				x0 = 0, y0 = 0, dx = 0, dy = 0, xc = 0, yc = 0, a = 0,

				// default transform, identity matrix
				m11 = 1, m12 = 0, m21 = 0, m22 = 1,

				// no translation
				tx = 0, ty = 0,
				props = [m11, m12, m21, m22, tx, ty],
				hasMatrix = false,
				ds = Html.style,
				newPosition = ds(n, "position") == "absolute" ? "absolute" : "relative",
				w = ds(n, "width") + ds(n, "paddingLeft") + ds(n, "paddingRight"),
				h = ds(n, "height") + ds(n, "paddingTop") + ds(n, "paddingBottom"),
				toPx = this._toPx
			;

			!hasAttr(n, "dojo-transform-origin") && this.setTransformOrigin(n, "50% 50%");

			for(var i = 0, l = transforms.length; i < l; i++){
				matchingTransforms = transforms[i].match(/matrix|rotate|scaleX|scaleY|scale|skewX|skewY|skew|translateX|translateY|translate/);
				currentTransform = matchingTransforms ? matchingTransforms[0] : "";
				switch(currentTransform){
					case "matrix":
						// generic transformation
						//
						// matrix:
						// m11        m12
						//
						// m21        m22
						//
						ct = transforms[i].replace(/matrix\(|\)/g, "");
						var matrix = ct.split(",");
						m11 = props[0]*matrix[0] + props[1]*matrix[2];
						m12 = props[0]*matrix[1] + props[1]*matrix[3];
						m21 = props[2]*matrix[0] + props[3]*matrix[2];
						m22 = props[2]*matrix[1] + props[3]*matrix[3];
						tx = props[4] + matrix[4];
						ty = props[5] + matrix[5];
					break;
					case "rotate":
						// rotate
						//
						// rotation angle:
						// a (rad, deg or grad)
						//
						// matrix:
						// cos(a)     -sin(a)
						//
						// sin(a)     cos(a)
						//
						ct = transforms[i].replace(/rotate\(|\)/g, "");
						toRad = ct.indexOf("deg") != -1 ? degToRad : ct.indexOf("grad") != -1 ? gradToRad : 1;
						a = parseFloat(ct)*toRad;
						var s = sin(a),
							c = cos(a)
						;
						m11 = props[0]*c + props[1]*s;
						m12 = -props[0]*s + props[1]*c;
						m21 = props[2]*c + props[3]*s;
						m22 = -props[2]*s + props[3]*c;
					break;
					case "skewX":
						// skewX
						//
						// skew angle:
						// a (rad, deg or grad)
						//
						// matrix:
						// 1          tan(a)
						//
						// 0          1
						//
						ct = transforms[i].replace(/skewX\(|\)/g, "");
						toRad = ct.indexOf("deg") != -1 ? degToRad : ct.indexOf("grad") != -1 ? gradToRad : 1;
						var ta = tan(parseFloat(ct)*toRad);
						m11 = props[0];
						m12 = props[0]*ta + props[1];
						m21 = props[2];
						m22 = props[2]*ta + props[3];
					break;
					case "skewY":
						// skewY
						//
						// skew angle:
						// a (rad, deg or grad)
						//
						// matrix:
						// 1          0
						//
						// tan(a)     1
						//
						ct = transforms[i].replace(/skewY\(|\)/g, "");
						toRad = ct.indexOf("deg") != -1 ? degToRad : ct.indexOf("grad") != -1 ? gradToRad : 1;
						ta = tan(parseFloat(ct)*toRad);
						m11 = props[0] + props[1]*ta;
						m12 = props[1];
						m21 = props[2] + props[3]*ta;
						m22 = props[3];
					break;
					case "skew":
						// skew
						//
						// skew angles:
						// a0 (rad, deg or grad)
						// a1 (rad, deg or grad)
						//
						// matrix:
						// 1          tan(a0)
						//
						// tan(a1)    1
						//
						ct = transforms[i].replace(/skew\(|\)/g, "");
						var skewAry = ct.split(",");
						skewAry[1] = skewAry[1] || "0";
						toRad = skewAry[0].indexOf("deg") != -1 ? degToRad : skewAry[0].indexOf("grad") != -1 ? gradToRad : 1;
						toRad1 = skewAry[1].indexOf("deg") != -1 ? degToRad : skewAry[1].indexOf("grad") != -1 ? gradToRad : 1;
						var a0 = tan(parseFloat(skewAry[0])*toRad),
							a1 = tan(parseFloat(skewAry[1])*toRad1)
						;
						m11 = props[0] + props[1]*a1;
						m12 = props[0]*a0 + props[1];
						m21 = props[2]+ props[3]*a1;
						m22 = props[2]*a0 + props[3];
					break;
					case "scaleX":
						// scaleX
						//
						// scale factor:
						// sx
						//
						// matrix:
						// sx         0
						//
						// 0          1
						//
						ct = parseFloat(transforms[i].replace(/scaleX\(|\)/g, "")) || 1;
						m11 = props[0]*ct;
						m12 = props[1];
						m21 = props[2]*ct;
						m22 = props[3];
					break;
					case "scaleY":
						// scaleY
						//
						// scale factor:
						// sy
						//
						// matrix:
						// 1          0
						//
						// 0          sy
						//
						ct = parseFloat(transforms[i].replace(/scaleY\(|\)/g, "")) || 1;
						m11 = props[0];
						m12 = props[1]*ct;
						m21 = props[2];
						m22 = props[3]*ct;
					break;
					case "scale":
						// scale
						//
						// scale factor:
						// sx, sy
						//
						// matrix:
						// sx         0
						//
						// 0          sy
						//
						ct = transforms[i].replace(/scale\(|\)/g, "");
						var scaleAry = ct.split(",");
						scaleAry[1] = scaleAry[1] || scaleAry[0];
						m11 = props[0]*scaleAry[0];
						m12 = props[1]*scaleAry[1];
						m21 = props[2]*scaleAry[0];
						m22 = props[3]*scaleAry[1];
					break;
					case "translateX":
						ct = parseInt(transforms[i].replace(/translateX\(|\)/g, "")) || 1;
						m11 = props[0];
						m12 = props[1];
						m21 = props[2];
						m22 = props[3];
						tx = toPx(ct);
						tx && attr(n, "dojo-transform-matrix-tx", tx);
					break;
					case "translateY":
						ct = parseInt(transforms[i].replace(/translateY\(|\)/g, "")) || 1;
						m11 = props[0];
						m12 = props[1];
						m21 = props[2];
						m22 = props[3];
						ty = toPx(ct);
						ty && attr(n, "dojo-transform-matrix-ty", ty);
					break;
					case "translate":
						ct = transforms[i].replace(/translate\(|\)/g, "");
						m11 = props[0];
						m12 = props[1];
						m21 = props[2];
						m22 = props[3];
						var translateAry = ct.split(",");
						translateAry[0] = parseInt(toPx(translateAry[0])) || 0;
						translateAry[1] = parseInt(toPx(translateAry[1])) || 0;
						tx = translateAry[0];
						ty = translateAry[1];
						tx && attr(n, "dojo-transform-matrix-tx", tx);
						ty && attr(n, "dojo-transform-matrix-ty", ty);
					break;
				}
				props = [m11, m12, m21, m22, tx, ty];
			}
			// test
			var Bx = min(w*m11 + h*m12, min(min(w*m11, h*m12), 0)),
				By = min(w*m21 + h*m22, min(min(w*m21, h*m22), 0))
			;
			dx = -Bx;
			dy = -By;
			if(has("ie") < 8){
				// on IE < 8 the node must have hasLayout = true
				n.style.zoom = "1";
				if(newPosition != "absolute"){
					var parentWidth = ds(node.parentNode, "width"),
						tw = abs(w*m11),
						th = abs(h*m12),
						wMax = max(tw + th, max(max(th, tw), 0))
					;
					dx -= (wMax - w) / 2 - (parentWidth > wMax ? 0 : (wMax - parentWidth) / 2);
				}
			}else if(has("ie") == 8){
				// IE8 bug, a filter is applied to positioned descendants
				// only if the parent has z-index
				ds(n, "zIndex") == "auto" && (n.style.zIndex = "0");
			}

			try{
				hasMatrix = !!n.filters.item(mstr);
			}catch(e){
				hasMatrix = false;
			}
			if(hasMatrix){
				n.filters.item(mstr).M11 = m11;
				n.filters.item(mstr).M12 = m12;
				n.filters.item(mstr).M21 = m21;
				n.filters.item(mstr).M22 = m22;
				// use 'nearest' for a faster transform
				n.filters.item(mstr).filterType = 'bilinear';
				n.filters.item(mstr).Dx = 0;
				n.filters.item(mstr).Dy = 0;
				n.filters.item(mstr).sizingMethod = 'auto expand';
			}else{
				n.style.filter +=
					" progid:" + mstr + "(M11=" + m11 +
					",M12=" + m12 +
					",M21=" + m21 +
					",M22=" + m22 +
					",FilterType='bilinear',Dx=0,Dy=0,sizingMethod='auto expand')"
				;
			}
			tx = parseInt(attr(n, "dojo-transform-matrix-tx") || "0");
			ty = parseInt(attr(n, "dojo-transform-matrix-ty") || "0");

			// transform origin
			var toAry = attr(n, "dojo-transform-origin").split(" ");

			for(i = 0; i < 2; i++){
				toAry[i] = toAry[i] || "50%";
			}
			xc = (toAry[0].toString().indexOf("%") != -1) ? w * parseInt(toAry[0]) * .01 : toAry[0];
			yc = (toAry[1].toString().indexOf("%") != -1) ? h * parseInt(toAry[1]) * .01 : toAry[1];
			if(hasAttr(n, "dojo-startX")){
				x0 = parseInt(attr(n, "dojo-startX"));
			}else{
				x0 = parseInt(ds(n, "left"));
				attr(n, "dojo-startX", newPosition == "absolute" ? x0 : "0");
			}
			if(hasAttr(n, "dojo-startY")){
				y0 = parseInt(attr(n, "dojo-startY"));
			}else{
				y0 = parseInt(ds(n, "top"));
				attr(n, "dojo-startY", newPosition == "absolute" ? y0 : "0");
			}
			ds(n, {
				position: newPosition,
				left: x0 - parseInt(dx) + parseInt(xc) - ((parseInt(xc) - tx)*m11 + (parseInt(yc) - ty)*m12) + "px",
				top:  y0 - parseInt(dy) + parseInt(yc) - ((parseInt(xc) - tx)*m21 + (parseInt(yc) - ty)*m22) + "px"
			});
			return transform;
		},
		_getTransformFilter: function(/*DomNode*/ node){
			try{
				var n = DOM.byId(node),
					item = n.filters.item(0)
				;
				return "matrix(" + item.M11 + ", " + item.M12 + ", " + item.M21 + ", " +
					item.M22 + ", " + (Html.attr(node, "dojo-transform-tx") || "0") + ", " + (Html.attr(node, "dojo-transform-ty") || "0") + ")";
			}catch(e){
				return "matrix(1, 0, 0, 1, 0, 0)";
			}
		},
		setTransform: function(){
			this._notSupported();
		},
		setTransformOrigin: function(){
			this._notSupported();
		}
	});

	HtmlX["ext-dojo"].style.init();
	return Html.style;
});

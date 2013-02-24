define(["dojo/_base/declare","dojo/_base/fx","dojo/_base/connect","dojo/_base/lang", "dojox/gfx", "./_Indicator"], 
  function(declare, fx, connect, lang, gfx, Indicator) {

return declare("dojox.gauges.BarLineIndicator",[Indicator],{
	
	// summary:
	//		An indicator for the BarGauge that draws a segment a line corresponding to the indicator value.	
	
	width: 1,
	_getShapes: function(/*dojox.gfx.Group*/ group){
		// summary:
		//		Private function for generating the shapes for this indicator. An indicator that behaves the 
		//		same might override this one and simply replace the shapes (such as BarIndicator).
		if(!this._gauge){
			return null;
		}
		var v = this.value;
		if(v < this._gauge.min){v = this._gauge.min;}
		if(v > this._gauge.max){v = this._gauge.max;}
		var pos = this._gauge._getPosition(v);
		var shapes = [];
		if(this.width > 1){
			shapes[0] = group.createRect({
				x:0, 
				y:this._gauge.dataY + this.offset,
				width:this.width, 
				height:this.length
			});
			shapes[0].setStroke({color: this.color});
			shapes[0].setFill(this.color);
			shapes[0].setTransform(gfx.matrix.translate(pos,0));
		}else{
			shapes[0] = group.createLine({
				x1:0, 
				y1:this._gauge.dataY + this.offset,
				x2:0, 
				y2:this._gauge.dataY + this.offset + this.length
			});
			shapes[0].setStroke({color: this.color});
			shapes[0].setTransform(gfx.matrix.translate(pos,0));
		}
		return shapes;
	},
	draw: function(/*dojox.gfx.Group*/group, /*Boolean?*/ dontAnimate){
		// summary:
		//		Override of dojox.gauges._Indicator.draw
		// dontAnimate: Boolean
		//		Indicates if the drawing should not be animated (vs. the default of doing an animation)
		var i;
		if (this.shape){
			this._move(dontAnimate);
		}else{
			if (this.shape){
				this.shape.parent.remove(this.shape);
				this.shape = null;
			}
			if (this.text){
				this.text.parent.remove(this.text);
				this.text = null;
			}
			
			this.color = this.color || '#000000';
			this.length = this.length || this._gauge.dataHeight;
			this.width = this.width || 3;
			this.offset = this.offset || 0;
			this.highlight = this.highlight || '#4D4D4D';
			this.highlight2 = this.highlight2 || '#A3A3A3';
			
			var shapes = this._getShapes(group, this._gauge, this);
			
			if (shapes.length > 1){
				this.shape = group.createGroup();
				for (var s = 0; s < shapes.length; s++){
					this.shape.add(shapes[s]);
				}
			} else this.shape = shapes[0];
			
			if (this.label){
				var v = this.value;
				if (v < this._gauge.min){
					v = this._gauge.min;
				}
				if (v > this._gauge.max){
					v = this._gauge.max;
				}
				var pos = this._gauge._getPosition(v);
				
				if (this.direction == 'inside'){
					var font = this.font ? this.font : gfx.defaultFont;
					var fz = font.size;
					var th = gfx.normalizedLength(fz);
					
					this.text = this._gauge.drawText(group, '' + this.label, pos, this._gauge.dataY + this.offset + this.length + 5 + th, 'middle', this.color, this.font);
				} else this.text = this._gauge.drawText(group, '' + this.label, pos, this._gauge.dataY + this.offset - 5, 'middle', this.color, this.font);
			}
			
			this.shape.connect("onmouseover", this, this.handleMouseOver);
			this.shape.connect("onmouseout", this, this.handleMouseOut);
			this.shape.connect("onmousedown", this, this.handleMouseDown);
			this.shape.connect("touchstart", this, this.handleTouchStart);
			this.currentValue = this.value;
		}
	},
	
	_move: function(/*Boolean?*/ dontAnimate){
		// summary:
		//		Moves this indicator (since it's already been drawn once)
		// dontAnimate: Boolean
		//		Indicates if the drawing should not be animated (vs. the default of doing an animation)
		var v = this.value ;
		if(v < this._gauge.min){v = this._gauge.min;}
		if(v > this._gauge.max){v = this._gauge.max;}
		var c = this._gauge._getPosition(this.currentValue);
		this.currentValue = v;
		v = this._gauge._getPosition(v);
 
		if(dontAnimate || (c==v)){
			this.shape.setTransform(gfx.matrix.translate(v,0));
		}else{
			var anim = new fx.Animation({curve: [c, v], duration: this.duration, easing: this.easing});
			connect.connect(anim, "onAnimate", lang.hitch(this, function(jump){
				if (this.shape)
				 this.shape.setTransform(gfx.matrix.translate(jump,0));
			}));
			anim.play();
		}
	}
});
});
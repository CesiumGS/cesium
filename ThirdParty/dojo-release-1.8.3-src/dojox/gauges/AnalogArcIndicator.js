define(["dojo/_base/declare","dojo/_base/lang","dojo/_base/connect","dojo/_base/fx","./AnalogIndicatorBase"],
function(declare, lang, connect, fx, AnalogIndicatorBase) {

return declare("dojox.gauges.AnalogArcIndicator",[AnalogIndicatorBase],{
	
	// summary:
	//		An indicator for the AnalogGauge that draws a segment of arc.
	//		The segment of arc starts at the start angle of the gauge and ends at the
	//		angle that corresponds to the value of the indicator.
	
	_createArc: function(val){
		
		// Creating the Arc Path string manually.  This is instead of creating new dojox.gfx.Path object
		// each time since we really just need the Path string (to use with setShape) and we don't want to
		// have to redo the connects, etc.
		if(this.shape){
			var startAngle = this._gauge._mod360(this._gauge.startAngle);
			var a = this._gauge._getRadians(this._gauge._getAngle(val));
			var sa = this._gauge._getRadians(startAngle);

			if (this._gauge.orientation == 'cclockwise'){
				var tmp = a;
				a = sa;
				sa = tmp;
			}

			var arange;
			var big = 0;
			if (sa<=a)
				arange = a-sa;
			else
				arange = 2*Math.PI+a-sa;
			if(arange>Math.PI){big=1;}
			
			var cosa = Math.cos(a);
			var sina = Math.sin(a);
			var cossa = Math.cos(sa);
			var sinsa = Math.sin(sa);
			var off = this.offset + this.width;
			var p = ['M'];
			p.push(this._gauge.cx+this.offset*sinsa);
			p.push(this._gauge.cy-this.offset*cossa);
			p.push('A', this.offset, this.offset, 0, big, 1);
			p.push(this._gauge.cx+this.offset*sina);
			p.push(this._gauge.cy-this.offset*cosa);
			p.push('L');
			p.push(this._gauge.cx+off*sina);
			p.push(this._gauge.cy-off*cosa);
			p.push('A', off, off, 0, big, 0);
			p.push(this._gauge.cx+off*sinsa);
			p.push(this._gauge.cy-off*cossa);
			p.push('z');
			this.shape.setShape(p.join(' '));
			this.currentValue = val;
		}
	},
	draw: function(group, /*Boolean?*/ dontAnimate){
		// summary:
		//		Override of dojox.gauges._Indicator.draw
		var v = this.value;
		if(v < this._gauge.min){v = this._gauge.min;}
		if(v > this._gauge.max){v = this._gauge.max;}
		if(this.shape){
			if(dontAnimate){
				this._createArc(v);
			}else{
				var anim = new fx.Animation({curve: [this.currentValue, v], duration: this.duration, easing: this.easing});
				connect.connect(anim, "onAnimate", lang.hitch(this, this._createArc));
				anim.play();
			}
		}else{
			var color = this.color ? this.color : 'black';
			var strokeColor = this.strokeColor ? this.strokeColor : color;
			var stroke = {color: strokeColor, width: 1};
			if(this.color.type && !this.strokeColor){
				stroke.color = this.color.colors[0].color;
			}
			this.shape = group.createPath().setStroke(stroke).setFill(color);
			this._createArc(v);
			this.shape.connect("onmouseover", this, this.handleMouseOver);
			this.shape.connect("onmouseout", this,  this.handleMouseOut);
			this.shape.connect("onmousedown", this, this.handleMouseDown);
			this.shape.connect("touchstart", this, this.handleTouchStart);
		}
	}
});

});

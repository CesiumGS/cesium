define(["dojox/gfx3d", "dojox/gfx3d/matrix", "dojo/_base/declare", "dojo/_base/Color", "dojo/_base/kernel", "./Base"],
	function(gfx3d, matrix3d, declare, Color, kernel, Base) {

	// reduce function borrowed from dojox.fun
	var reduce = function(/*Array*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
		// summary:
		//		repeatedly applies a binary function to an array from left
		//		to right; returns the final value.
		a = typeof a == "string" ? a.split("") : a; o = o || kernel.global;
		var z = a[0];
		for(var i = 1; i < a.length; z = f.call(o, z, a[i++]));
		return z;	// Object
	};

	return declare("dojox.charting.plot3d.Cylinders", Base, {
		constructor: function(width, height, kwArgs){
			this.depth = "auto";
			this.gap   = 0;
			this.data  = [];
			this.material = {type: "plastic", finish: "shiny", color: "lime"};
			this.outline  = null;
			if(kwArgs){
				if("depth" in kwArgs){ this.depth = kwArgs.depth; }
				if("gap"   in kwArgs){ this.gap   = kwArgs.gap; }
				if("material" in kwArgs){
					var m = kwArgs.material;
					if(typeof m == "string" || m instanceof Color){
						this.material.color = m;
					}else{
						this.material = m;
					}
				}
				if("outline" in kwArgs){ this.outline = kwArgs.outline; }
			}
		},
		getDepth: function(){
			if(this.depth == "auto"){
				var w = this.width;
				if(this.data && this.data.length){
					w = w / this.data.length;
				}
				return w - 2 * this.gap;
			}
			return this.depth;
		},
		generate: function(chart, creator){
			if(!this.data){ return this; }
			var step = this.width / this.data.length, org = 0,
				scale = this.height / reduce(this.data, Math.max);
			if(!creator){ creator = chart.view; }
			for(var i = 0; i < this.data.length; ++i, org += step){
				creator
					.createCylinder({
						center: {x: org + step / 2, y: 0, z: 0},
						radius: step / 2 - this.gap,
						height: this.data[i] * scale
					})
					.setTransform(matrix3d.rotateXg(-90))
					.setFill(this.material).setStroke(this.outline);
			}
		}
	});
});


define(["dojox/gfx3d", "dojo/_base/window", "dojo/_base/declare", "dojo/_base/Color", "./Base"], 
	function(gfx3d, win, declare, Color, Base) {

	// reduce function borrowed from dojox.fun
	var reduce = function(/*Array*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
		// summary: repeatedly applies a binary function to an array from left
		//	to right; returns the final value.
		a = typeof a == "string" ? a.split("") : a; o = o || win.global;
		var z = a[0];
		for(var i = 1; i < a.length; z = f.call(o, z, a[i++]));
		return z;	// Object
	};
	/*=====
	var Base = dojox.charting.plot3d.Base;
	=====*/
	return declare("dojox.charting.plot3d.Bars", Base, {
		constructor: function(width, height, kwArgs){
			this.depth = "auto";
			this.gap   = 0;
			this.data  = [];
			this.material = {type: "plastic", finish: "dull", color: "lime"};
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
				depth = this.depth == "auto" ? step - 2 * this.gap : this.depth,
				scale = this.height / reduce(this.data, Math.max);
			if(!creator){ creator = chart.view; }
			for(var i = 0; i < this.data.length; ++i, org += step){
				creator
					.createCube({
						bottom: {x: org + this.gap, y: 0, z: 0},
						top:    {x: org + step - this.gap, y: this.data[i] * scale, z: depth}
					})
					.setFill(this.material);
			}
		}
	});
});

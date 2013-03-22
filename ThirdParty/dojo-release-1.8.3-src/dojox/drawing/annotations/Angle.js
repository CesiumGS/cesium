define(["dojo", "../util/oo", "../util/positioning"], 
function(dojo, oo, positioning){

//dojox.drawing.annotations.Angle = 
return oo.declare(
	function(/*Object*/ options){
		// options: Object
		//		One key value: the stencil that called this.

		this.stencil = options.stencil;
		this.util = options.stencil.util;
		this.mouse = options.stencil.mouse;

		this.stencil.connectMult([
			["onDrag", this, "showAngle"],
			["onUp", this, "hideAngle"],
			["onTransformBegin", this, "showAngle"],
			["onTransform", this, "showAngle"],
			["onTransformEnd", this, "hideAngle"]
		]);
	},
	{
		// summary:
		//		When initiated, an HTML box will hover near the Stencil,
		//		displaying it's angle while drawn or modified. Currently
		//		only works with Vector, Line, Arrow, and Axes.
		// description:
		//		Annotation is positioned with dojox.drawing.util.positioning.angle
		//		That method should be overwritten for custom placement.
		//		Called internally.

		type:"dojox.drawing.tools.custom",
		angle:0,

		showAngle: function(){
			// summary:
			//		Called to display angle

			if(!this.stencil.selected && this.stencil.created){ return; }
			if(this.stencil.getRadius() < this.stencil.minimumSize){
				this.hideAngle();
				return;
			}
			var node = this.getAngleNode();
			var d = this.stencil.pointsToData();
			var pt = positioning.angle({x:d.x1,y:d.y1},{x:d.x2,y:d.y2});
			var sc = this.mouse.scrollOffset();
			var mx = this.stencil.getTransform();
			var dx = mx.dx / this.mouse.zoom;
			var dy = mx.dy / this.mouse.zoom;
			pt.x /= this.mouse.zoom;
			pt.y /= this.mouse.zoom;

			// adding _offX & _offY since this is HTML
			// and we are from the page corner, not
			// the canvas corner
			var x = this.stencil._offX + pt.x - sc.left + dx;
			var y = this.stencil._offY + pt.y - sc.top + dy;
			dojo.style(node, {
				left:  	x + "px",
				top: 	y + "px",
				align:pt.align
			});

			var angle=this.stencil.getAngle();
			if(this.stencil.style.zAxis && this.stencil.shortType=="vector"){
			  node.innerHTML = this.stencil.data.cosphi > 0 ? "out of" : "into";
			}else if(this.stencil.shortType=="line"){
			  node.innerHTML = this.stencil.style.zAxis?"out of":Math.ceil(angle%180);
			}else{
			  node.innerHTML = Math.ceil(angle);
			}
		},

		getAngleNode: function(){
			// summary:
			//		Gets or creates HTMLNode used for display
			if(!this._angleNode){
				this._angleNode = dojo.create("span", null, dojo.body());
				dojo.addClass(this._angleNode, "textAnnotation");
				dojo.style(this._angleNode, "opacity", 1);
			}
			return this._angleNode; //HTMLNode
		},

		hideAngle: function(){
			// summary:
			//		Turns display off.

			if(this._angleNode && dojo.style(this._angleNode, "opacity")>0.9){

				dojo.fadeOut({node:this._angleNode,
					duration:500,
					onEnd: function(node){
						dojo.destroy(node);
					}
				}).play();
				this._angleNode = null;
			}

		}
	}
);
});

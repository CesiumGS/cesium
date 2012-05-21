dojo.provide("dojox.drawing.tools.Arrow");

dojox.drawing.tools.Arrow = dojox.drawing.util.oo.declare(
	// summary:
	//		Extends stencil.Line and adds an arrow head
	//		to the end and or start.
	//
	dojox.drawing.tools.Line,
	function(options){
		// summary: constructor
		if(this.arrowStart){
			this.begArrow = new dojox.drawing.annotations.Arrow({stencil:this, idx1:0, idx2:1});
		}
		if(this.arrowEnd){
			this.endArrow = new dojox.drawing.annotations.Arrow({stencil:this, idx1:1, idx2:0});
		}
		if(this.points.length){
			// This is protecting against cases when there are no points
			// not sure how that would ever happen
			// Render & label here instead of in base because of Arrow annotation
			this.render();
			options.label && this.setLabel(options.label);
		}
	},
	{
		draws:true,
		type:"dojox.drawing.tools.Arrow",
		baseRender:false,
		
		// arrowStart: Boolean
		//		Whether or not to place an arrow on start.
		arrowStart:false,
		//
		// arrowEnd: Boolean
		//		Whether or not to place an arrow on end.
		arrowEnd:true,
		
		labelPosition: function(){
			// summary:
			//		The custom position used for the label
			//
			var d = this.data;
			var pt = dojox.drawing.util.positioning.label({x:d.x1,y:d.y1},{x:d.x2,y:d.y2});
			return {
				x:pt.x,
				y:pt.y
			}
		},
		
		onUp: function(/*EventObject*/obj){
			// summary: See stencil._Base.onUp
			//
			if(this.created || !this.shape){ return; }
			
			// if too small, need to reset
			var p = this.points;
			var len = this.util.distance(p[0].x,p[0].y,p[1].x,p[1].y);
			if(len<this.minimumSize){
				this.remove(this.shape, this.hit);
				return;
			}
			
			var pt = this.util.snapAngle(obj, this.angleSnap/180);
			this.setPoints([
				{x:p[0].x, y:p[0].y},
				{x:pt.x, y:pt.y}
			]);
			
			this.renderedOnce = true;
			this.onRender(this);
		}
	}
);

dojox.drawing.tools.Arrow.setup = {
	// summary: See stencil._Base ToolsSetup
	//
	name:"dojox.drawing.tools.Arrow",
	tooltip:"Arrow Tool",
	iconClass:"iconArrow"
};

dojox.drawing.register(dojox.drawing.tools.Arrow.setup, "tool");
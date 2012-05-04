dojo.provide("dojox.drawing.tools.Pencil");

dojox.drawing.tools.Pencil = dojox.drawing.util.oo.declare(
	// summary:
	//		Class for a drawable, continous Path
	//
	dojox.drawing.stencil.Path,
	function(){
		// summary: constructor
		this._started = false;
	},
	{
		draws:true,
		// minDist: Number
		//		The distance the mouse must travel before rendering
		//		a path segment. Lower number is a higher definition
		//		path but more points.
		minDist: 15, // how to make this more dynamic? Settable?
		
		onDown: function(obj){
			this._started = true;
			var p = {
				x:obj.x,
				y:obj.y
			};
			this.points = [p];
			this.lastPoint = p;
			this.revertRenderHit = this.renderHit;
			this.renderHit = false;
			this.closePath = false;
		},
		
		onDrag: function(obj){
			if(
			   !this._started
			   || this.minDist > this.util.distance(obj.x, obj.y, this.lastPoint.x, this.lastPoint.y)
			){ return; }
			
			var p = {
				x:obj.x,
				y:obj.y
			};
			this.points.push(p);
			this.render();
			this.checkClosePoint(this.points[0], obj);
			this.lastPoint = p;
		},
		
		onUp: function(obj){
			if(!this._started){ return; }
			if(!this.points || this.points.length<2){
				this._started = false;
				this.points = [];
				return;
			}
			var box = this.getBounds();
			if(box.w<this.minimumSize && box.h<this.minimumSize){
				this.remove(this.hit, this.shape, this.closeGuide);
				this._started = false;
				this.setPoints([]);
				return;
			}
			if(this.checkClosePoint(this.points[0], obj, true)){
				this.closePath = true;
			}
			this.renderHit = this.revertRenderHit;
			this.renderedOnce = true;
			this.render();
			this.onRender(this);
			
		}
	}
);

dojox.drawing.tools.Pencil.setup = {
	// summary: See Base ToolsSetup
	//
	name:"dojox.drawing.tools.Pencil",
	tooltip:"Pencil Tool",
	iconClass:"iconLine"
};

dojox.drawing.register(dojox.drawing.tools.Pencil.setup, "tool");
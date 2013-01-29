define(["dojo/_base/lang", "../util/oo", "../manager/_registry", "../stencil/Line"],
function(lang, oo, registry, StencilLine){

//dojox.drawing.tools.Line 
var Line = oo.declare(
	StencilLine,
	function(){
		// summary:
		//		constructor
	},
	{
		// summary:
		//		Class for a drawable Line

		draws:true,
		showAngle:true,
		onTransformEnd: function(/*manager.Anchor*/anchor){
			this._toggleSelected();
			if(this.getRadius()<this.minimumSize){
				var p = this.points;
				this.setPoints([
					{x:p[0].x, y:p[0].y},
					{x:p[0].x, y:p[0].y}
				]);
			}else{
				var d = this.data;
				var obj = {start:{x:d.x1,y:d.y1},x:d.x2,y:d.y2};
				var pt = this.util.snapAngle(obj, this.angleSnap/180);
				this.setPoints([
					{x:d.x1, y:d.y1},
					{x:pt.x, y:pt.y}
				]);
				
				this._isBeingModified = false;
				this.onModify(this);
			}
		},
		
		onDrag: function(/*EventObject*/obj){
			if(this.created){ return; }
			var x1 = obj.start.x,
				y1 = obj.start.y,
				x2 = obj.x,
				y2 = obj.y;
			
			if(this.keys.shift){
				var pt = this.util.snapAngle(obj, 45/180);
				x2 = pt.x;
				y2 = pt.y;
			}
			
			if(this.keys.alt){
				// FIXME:
				//	should double the length of the line
				// FIXME:
				//	if alt dragging past ZERO it seems to work
				//	but select/deselect shows bugs
				var dx = x2>x1 ? ((x2-x1)/2) : ((x1-x2)/-2);
				var dy = y2>y1 ? ((y2-y1)/2) : ((y1-y2)/-2);
				x1 -= dx;
				x2 -= dx;
				y1 -= dy;
				y2 -= dy;
			}
			
			this.setPoints([
				{x:x1, y:y1},
				{x:x2, y:y2}
			]);
			this.render();
		},
		
		onUp: function(/*EventObject*/obj){
			if(this.created || !this._downOnCanvas){ return; }
			this._downOnCanvas = false;
			//Default shape on single click
			if(!this.shape){
				var s = obj.start, e = this.minimumSize*4;
				this.setPoints([
					{x:s.x, y:s.y+e},
					{x:s.x, y:s.y}
				]);
				this.render();
				
			}else{
				// if too small, need to reset
				
				if(this.getRadius()<this.minimumSize){
					this.remove(this.shape, this.hit);
					return;
				}
			}
			
			var pt = this.util.snapAngle(obj, this.angleSnap/180);
			var p = this.points;
			this.setPoints([
				{x:p[0].x, y:p[0].y},
				{x:pt.x, y:pt.y}
			]);
			
			this.renderedOnce = true;
			this.onRender(this);
		}
	}
);

lang.setObject("dojox.drawing.tools.Line", Line);
Line.setup = {
	name:"dojox.drawing.tools.Line",
	tooltip:"Line Tool",
	iconClass:"iconLine"
};

registry.register(Line.setup, "tool");

return Line;
});

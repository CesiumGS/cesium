dojo.provide("dojox.drawing.tools.Ellipse");

dojox.drawing.tools.Ellipse = dojox.drawing.util.oo.declare(
	// summary:
	//		A drawable Ellipse.
	//
	dojox.drawing.stencil.Ellipse,
	function(){
		// summary: constructor
	},
	{
		draws:true,
		onDrag: function(/*EventObject*/obj){
			// summary: See stencil._Base.onDrag
			//
			var s = obj.start, e = obj;
			var	x = s.x < e.x ? s.x : e.x,
				y = s.y < e.y ? s.y : e.y,
				w = s.x < e.x ? e.x-s.x : s.x-e.x,
				h = s.y < e.y ? e.y-s.y : s.y-e.y;
			
			if(this.keys.shift){ w = h = Math.max(w,h); }
			if(!this.keys.alt){ // ellipse is normally on center
				x+=w/2; y+=h/2; w/=2; h/=2;
			} else{
				if(y - h < 0){ h = y; }
				if(x - w < 0){ w = x; }
			}
			
			this.points = [
				{x:x-w, y:y-h}, 	// TL
				{x:x+w, y:y-h},		// TR
				{x:x+w, y:y+h},		// BR
				{x:x-w, y:y+h}		// BL
			];
			this.render();
		},
		
		onUp: function(/*EventObject*/obj){
			// summary: See stencil._Base.onUp
			//
			if(this.created || !this._downOnCanvas){ return; }
			this._downOnCanvas = false;
			//Default shape on single click
			if(!this.shape){
				var s = obj.start, e = this.minimumSize*2;
				this.data = {
					cx: s.x+e,
					cy: s.y+e,
					rx: e,
					ry: e
				};
				this.dataToPoints();
				this.render();
			}else{
			// if too small, need to reset
				var o = this.pointsToData();
				console.log("Create a default shape here, pt to data: ",o);
				if(o.rx*2<this.minimumSize && o.ry*2 < this.minimumSize){
					this.remove(this.shape, this.hit);
					return;
				}
			}
			
			this.onRender(this);
			
		}
	}
);

dojox.drawing.tools.Ellipse.setup = {
	// summary: See stencil._Base ToolsSetup
	//
	name:"dojox.drawing.tools.Ellipse",
	tooltip:"Ellipse Tool",
	iconClass:"iconEllipse"
};

dojox.drawing.register(dojox.drawing.tools.Ellipse.setup, "tool");
dojo.provide("dojox.drawing.tools.Rect");

dojox.drawing.tools.Rect = dojox.drawing.util.oo.declare(
	// summary:
	// 		Class for a drawable rectangle
	//
	dojox.drawing.stencil.Rect,
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
			
			if(this.keys.alt){
				x-=w; y-=h; w*=2; h*=2;
				x = Math.max(x, 0);
				y = Math.max(y, 0);
			}
			this.setPoints ([
				{x:x, y:y}, 	// TL
				{x:x+w, y:y},	// TR
				{x:x+w, y:y+h},	// BR
				{x:x, y:y+h}	// BL
			]);
			this.render();
		},
		
		onUp: function(/*EventObject*/obj){
			// summary: See stencil._Base.onUp
			//
			if(this.created || !this._downOnCanvas){ return; }
			this._downOnCanvas = false;
			
			//Default shape on single click
			if(!this.shape){
				var s = obj.start;
				var e = this.minimumSize*4;
				this.setPoints([
					{x:s.x, y:s.y},
					{x:s.x+e, y:s.y},
					{x:s.x+e, y:s.y+e},
					{x:s.x, y:s.y+e}
				]);
				this.render();
			}else{
			
				// if too small, need to reset
				var o = this.data;
				if(o.width<this.minimumSize && o.height < this.minimumSize){
					this.remove(this.shape, this.hit);
					return;
				}
			}
			this.onRender(this);
			
		}
	}
);

dojox.drawing.tools.Rect.setup = {
	// summary: See stencil._Base ToolsSetup
	//
	name:"dojox.drawing.tools.Rect",
	tooltip:'<span class="drawingTipTitle">Rectangle Tool</span><br/>'
		+ '<span class="drawingTipDesc">SHIFT - constrain to square</span>',
	iconClass:"iconRect"
};
dojox.drawing.register(dojox.drawing.tools.Rect.setup, "tool");
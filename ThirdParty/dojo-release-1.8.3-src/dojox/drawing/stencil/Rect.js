define(["dojo/_base/lang", "../util/oo", "./_Base", "../manager/_registry"], 
function(lang, oo, Base, registry){

var Rect = oo.declare(
	Base,
	function(options){
		// summary:
		//		constructor
		if(this.points.length){
			//this.render();
		}
	},
	{
		// summary:
		//		Creates a dojox.gfx rectangle based on data or points provided.

		type:"dojox.drawing.stencil.Rect",
		anchorType: "group",
		baseRender:true,
		
		dataToPoints: function(/*Object*/d){
			// summary:
			//		Converts data to points.
			d = d || this.data;
			this.points = [
				{x:d.x, y:d.y}, 						// TL
				{x:d.x + d.width, y:d.y},				// TR
				{x:d.x + d.width, y:d.y + d.height},	// BR
				{x:d.x, y:d.y + d.height}				// BL
			];
			return this.points;
		},
		
		pointsToData: function(/*Array*/p){
			// summary:
			//		Converts points to data
			p = p || this.points;
			var s = p[0];
			var e = p[2];
			this.data = {
				x: s.x,
				y: s.y,
				width: e.x-s.x,
				height: e.y-s.y,
				r:this.data.r || 0
			};
			return this.data;
			
		},
		
		_create: function(/*String*/shp, /*StencilData*/d, /*Object*/sty){
			// summary:
			//		Creates a dojox.gfx.shape based on passed arguments.
			//		Can be called many times by implementation to create
			//		multiple shapes in one stencil.

			//console.log("render rect", d)
			//console.log("rect sty:", sty)
			this.remove(this[shp]);
			this[shp] = this.container.createRect(d)
				.setStroke(sty)
				.setFill(sty.fill);
			
			this._setNodeAtts(this[shp]);
		},
		
		render: function(){
			// summary:
			//		Renders the 'hit' object (the shape used for an expanded
			//		hit area and for highlighting) and the'shape' (the actual
			//		display object).

			this.onBeforeRender(this);
			this.renderHit && this._create("hit", this.data, this.style.currentHit);
			this._create("shape", this.data, this.style.current);
		}
	}
);

lang.setObject("dojox.drawing.stencil.Rect", Rect);
registry.register({
	name:"dojox.drawing.stencil.Rect"
}, "stencil");

return Rect;
});

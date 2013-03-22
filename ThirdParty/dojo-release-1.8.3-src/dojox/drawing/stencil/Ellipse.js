define(["dojo/_base/lang", "../util/oo", "./_Base", "../manager/_registry"], 
function(lang, oo, Base, registry){

/*=====
var __StencilData = {
	// summary:
	//		the data used to create the dojox.gfx Shape
	// cx: Number
	//		Center point x
	// cy: Number
	//		Center point y
	// rx: Number
	//		Horizontal radius
	// ry: Number
	//		Vertical radius
};
=====*/

var Ellipse = oo.declare(
	Base,
	function(options){
		// summary:
		//		constructor
	},
	{
		// summary:
		//		Creates a dojox.gfx Ellipse based on data or points provided.

		type:"dojox.drawing.stencil.Ellipse",
		anchorType: "group",
		baseRender:true,
		dataToPoints: function(/*Object*/o){
			// summary:
			//		Converts data to points.
			o = o || this.data;
			var x = o.cx - o.rx,
				y = o.cy - o.ry,
				w = o.rx*2,
				h = o.ry*2
			this.points = [
				{x:x, y:y}, 	// TL
				{x:x+w, y:y},	// TR
				{x:x+w, y:y+h},	// BR
				{x:x, y:y+h}	// BL
			];
			return this.points; //Array
		},
		
		pointsToData: function(/*Array*/p){
			// summary:
			//		Converts points to data
			p = p || this.points;
			var s = p[0];
			var e = p[2];
			this.data = {
				cx: s.x + (e.x - s.x)/2,
				cy: s.y + (e.y - s.y)/2,
				rx: (e.x - s.x)*.5,
				ry: (e.y - s.y)*.5
			};
			return this.data; //Object
		
		},
		
		_create: function(/*String*/shp, /*__StencilData*/d, /*Object*/sty){
			// summary:
			//		Creates a dojox.gfx.shape based on passed arguments.
			//		Can be called many times by implementation to create
			//		multiple shapes in one stencil.

			this.remove(this[shp]);
			this[shp] = this.container.createEllipse(d)
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

lang.setObject("dojox.drawing.stencil.Ellipse", Ellipse);
registry.register({
	name:"dojox.drawing.stencil.Ellipse"
}, "stencil");

return Ellipse;
});

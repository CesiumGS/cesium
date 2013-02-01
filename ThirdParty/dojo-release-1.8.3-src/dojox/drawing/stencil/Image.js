define(["dojo", "../util/oo", "./_Base", "../manager/_registry"], 
function(dojo, oo, Base, registry){

var Image = oo.declare(
	Base,
	function(options){
		// summary:
		//		constructor
	},
	{
		// summary:
		//		Creates an dojox.gfx Image based on the data
		//		provided.

		type:"dojox.drawing.stencil.Image",
		anchorType: "group",
		baseRender:true,
		
		/*=====
		StencilData: {
			// summary:
			//		The data used to create the dojox.gfx Shape
			// x: Number
			//		Left point x
			// y: Number
			//		Top point y
			// width: Number?
			//		Optional width of Image. If not provided, it is obtained
			// height: Number?
			//		Optional height of Image. If not provided, it is obtained
			// src: String
			//		The location of the source image
		},

		StencilPoints: [
			// summary:
			//		An Array of dojox.__StencilPoint objects that describe the Stencil
			//		[Top left point, Top right point, Bottom right point, Bottom left point]
		],
		=====*/
		
		dataToPoints: function(/*Object*/o){
			// summary:
			//		Converts data to points.
			o = o || this.data;
			this.points = [
				{x:o.x, y:o.y}, 						// TL
				{x:o.x + o.width, y:o.y},				// TR
				{x:o.x + o.width, y:o.y + o.height},	// BR
				{x:o.x, y:o.y + o.height}				// BL
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
				src: this.src || this.data.src
			};
			return this.data;
			
		},
		
		_createHilite: function(){
			// summary:
			//		Create the hit and highlight area
			//		for the Image.
			this.remove(this.hit);
			this.hit = this.container.createRect(this.data)
				.setStroke(this.style.current)
				.setFill(this.style.current.fill);
			this._setNodeAtts(this.hit);
		},
		_create: function(/*String*/shp, /*StencilData*/d, /*Object*/sty){
			// summary:
			//		Creates a dojox.gfx.shape based on passed arguments.
			//		Can be called many times by implementation to create
			//		multiple shapes in one stencil.

			this.remove(this[shp]);
			var s = this.container.getParent();
			this[shp] = s.createImage(d)
			this.container.add(this[shp]);
			this._setNodeAtts(this[shp]);
		},
		
		render: function(dbg){
			// summary:
			//		Renders the 'hit' object (the shape used for an expanded
			//		hit area and for highlighting) and the'shape' (the actual
			//		display object). Image is slightly different than other
			//		implementations. Instead of calling render twice, it calls
			//		_createHilite for the 'hit'

			if(this.data.width == "auto" || isNaN(this.data.width)){
				this.getImageSize(true);
				console.warn("Image size not provided. Acquiring...")
				return;
			}
			this.onBeforeRender(this);
			this.renderHit && this._createHilite();
			this._create("shape", this.data, this.style.current);
		},
		getImageSize: function(render){
			// summary:
			//		Internal. If no image size is passed in with the data
			//		create a dom node, insert and image, gets its dimensions
			//		record them - then destroy everything.

			if(this._gettingSize){ return; } // IE gets it twice (will need to mod if src changes)
			this._gettingSize = true;
			var img = dojo.create("img", {src:this.data.src}, dojo.body());
			var err = dojo.connect(img, "error", this, function(){
				dojo.disconnect(c);
				dojo.disconnect(err);
				console.error("Error loading image:", this.data.src)
				console.warn("Error image:", this.data)
				
			});
			var c = dojo.connect(img, "load", this, function(){
				var dim = dojo.marginBox(img);
				this.setData({
					x:this.data.x,
					y:this.data.y,
					src:this.data.src,
					width:dim.w,
					height:dim.h
				});
				dojo.disconnect(c);
				dojo.destroy(img);
				render && this.render(true);
			});
		}
	}
);

dojo.setObject("dojox.drawing.stencil.Image", Image);
registry.register({
	name:"dojox.drawing.stencil.Image"
}, "stencil");

return Image;
});

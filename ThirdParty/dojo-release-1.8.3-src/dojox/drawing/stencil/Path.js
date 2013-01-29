define(["dojo", "dojo/_base/array", "../util/oo", "./_Base", "../manager/_registry"], 
function(lang, array, oo, Base, registry){
//console.log('base is', lang.isFunction(Base));
var Path = oo.declare(
	Base,
	function(options){
	},
	{
		// summary:
		//		Creates a dojox.gfx Path based on points provided.

		type:"dojox.drawing.stencil.Path",
		closePath: true,
		baseRender:true,
		closeRadius:10,
		closeColor:{r:255,g:255,b:0,a:.5},
		
/*=====
StencilData: {
	// NOT SUPPORTED FOR PATH
},

StencilPoints: [
	// summary:
	//		An Array of StencilPoint objects that describe the Stencil
],
=====*/
		
		_create: function(/*String*/shp, /*Object*/sty){
			// summary:
			//		Creates a dojox.gfx.shape based on passed arguments.
			//		Can be called many times by implementation to create
			//		multiple shapes in one stencil.

			this.remove(this[shp]);
			if(!this.points.length){ return; }
	
			if(dojox.gfx.renderer=="svg"){
				// NOTE:
				// In order to avoid the Safari d="" errors,
				// we'll need to build a string and set that.
				var strAr = [];
				array.forEach(this.points, function(o, i){
					if(!o.skip){
						if(i==0){
							strAr.push("M " + o.x +" "+ o.y);
						}else{
							var cmd = (o.t || "") + " ";
							if(o.x===undefined){// Z + undefined works here, but checking anyway
								strAr.push(cmd);
							}else{
								strAr.push(cmd + o.x +" "+ o.y);
							}
						}
					}
				}, this);
				if(this.closePath){
					strAr.push("Z");
				}
				
				this.stringPath = strAr.join(" ");
				
				this[shp] = this.container.createPath(strAr.join(" ")).setStroke(sty);
				this.closePath && this[shp].setFill(sty.fill);
				
			}else{
				// Leaving this code for VML. It seems slightly faster but times vary.
				this[shp] = this.container.createPath({}).setStroke(sty);
				
				this.closePath && this[shp].setFill(sty.fill);
				
				array.forEach(this.points, function(o, i){
					if(!o.skip){
						if(i==0 || o.t=="M"){
							this[shp].moveTo(o.x, o.y);
						}else if(o.t=="Z"){
							this.closePath && this[shp].closePath();
						}else{
							this[shp].lineTo(o.x, o.y);
						}
					}
				}, this);
				
				this.closePath && this[shp].closePath();
			}
			
			this._setNodeAtts(this[shp]);
		},
		
		render: function(){
			// summary:
			//		Renders the 'hit' object (the shape used for an expanded
			//		hit area and for highlighting) and the'shape' (the actual
			//		display object).

			this.onBeforeRender(this);
			this.renderHit && this._create("hit", this.style.currentHit);
			this._create("shape", this.style.current);
			//console.log("path render")
			
			
		//console.log("---------------------rend hit", this.renderHit, this.id)
		},
		getBounds: function(/* ? Boolean*/absolute){
			// summary:
			//		Overwriting _Base.getBounds. Not sure how absolute should
			//		work for a path.
			var minx = 10000, miny = 10000, maxx = 0, maxy = 0;
			array.forEach(this.points, function(p){
				if(p.x!==undefined && !isNaN(p.x)){
					minx = Math.min(minx, p.x);
					miny = Math.min(miny, p.y);
					maxx = Math.max(maxx, p.x);
					maxy = Math.max(maxy, p.y);
				}
			});
			
			return {
				x1:minx,
				y1:miny,
				x2:maxx,
				y2:maxy,
				x:minx,
				y:miny,
				w:maxx-minx,
				h:maxy-miny
			};
		},
		
		checkClosePoint: function(/*Object*/firstPt, /*Object*/currPt, /*Boolean*/remove){
			// summary:
			//		Checks if points are close enough to indicate that
			//		path should be close. Provides a visual cue.
			// description:
			//		Not actually used in stencil.path - this is used for
			//		drawable tools that extend it. Note that those tools
			//		need to remove the shape created: this.closeGuide, or
			//		add arg: remove

			var dist = this.util.distance(firstPt.x, firstPt.y, currPt.x, currPt.y);
			if(this.points.length>1){
				if(dist<this.closeRadius && !this.closeGuide && !remove){
					var c = {
						cx:firstPt.x,
						cy:firstPt.y,
						rx:this.closeRadius,
						ry:this.closeRadius
					}
					this.closeGuide = this.container.createEllipse(c)
						.setFill(this.closeColor);
						
				}else if(remove || dist > this.closeRadius && this.closeGuide){
					this.remove(this.closeGuide);
					this.closeGuide = null;
				}
			}
			// return if we are within close distance
			return dist < this.closeRadius; // Boolean
		}
	}
);

lang.setObject("dojox.drawing.stencil.Path", Path);
registry.register({
	name:"dojox.drawing.stencil.Path"
}, "stencil");

return Path;
});

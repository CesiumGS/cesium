define(["../util/oo", "../stencil/Path"], 
function(oo, Path){

//dojox.drawing.annotations.Arrow =
return oo.declare(

	Path,
	function(/* dojox.__stencilArgs */options){
		this.stencil.connectMult([
			[this.stencil, "select", this, "select"],
			[this.stencil, "deselect", this, "deselect"],
			[this.stencil, "render", this, "render"],
			[this.stencil, "onDelete", this, "destroy"]
		]);
		
		this.connect("onBeforeRender", this, function(){
			var o = this.stencil.points[this.idx1];
			var c = this.stencil.points[this.idx2];
			if(this.stencil.getRadius() >= this.minimumSize){
				this.points = this.arrowHead(c.x, c.y, o.x, o.y, this.style);
			}else{
				this.points = [];
			}
		});
		
	},
	{
		// summary:
		//		An annotation called internally to put an arrowhead
		//		on ether end of a Line. Initiated in Arrow (and Vector)
		//		with the optional params: arrowStart and arrowEnd. Both
		//		default true for Axes.

		idx1:0,
		idx2:1,
		
		subShape:true,
		minimumSize:30,
		//annotation:true, NOT!
		
		arrowHead: function(x1, y1, x2, y2, style){
			// summary:
			//		Creates data used to draw arrow head.

			var obj = {
				start:{
					x:x1,
					y:y1
				},
				x:x2,
				y:y2
			}
			var angle = this.util.angle(obj);
			
			var lineLength = this.util.length(obj);
			var al = style.arrows.length;
			var aw = style.arrows.width/2;
			if(lineLength<al){
				al = lineLength/2;
			}
			var p1 = this.util.pointOnCircle(x2, y2, -al, angle-aw);
			var p2 = this.util.pointOnCircle(x2, y2, -al, angle+aw);
			
			return [
				{x:x2, y:y2},
				p1,
				p2
			];
		}
		
	}
);
});

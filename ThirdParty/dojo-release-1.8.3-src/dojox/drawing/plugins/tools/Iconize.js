define(["dojo", "../../util/oo", "../_Plugin", "../../manager/_registry"],
function(dojo, oo, Plugin, registry){

//dojox.drawing.plugins.tools.Iconize = 
var Iconize = oo.declare(
	Plugin,
	function(options){
	
	},
	{
		// summary:
		//		Somewhat of internal use...
		//		Outputs a path to be used as an icon. Will end up being a
		//		sub-icon under Export options

		onClick: function(){
			var item;
			for(var nm in this.stencils.stencils){
				console.log(" stanceil item:", this.stencils.stencils[nm].id, this.stencils.stencils[nm])
				if(this.stencils.stencils[nm].shortType=="path"){
					item = this.stencils.stencils[nm];
					break;
				}
			}
			if(item){
				console.log("click Iconize plugin", item.points);
				this.makeIcon(item.points);
			}
		},
		makeIcon: function(/*Array*/p){
			var rnd = function(n){
				return Number(n.toFixed(1));
			}
			
			var x = 10000;
			var y = 10000;
			p.forEach(function(pt){
				if(pt.x!==undefined && !isNaN(pt.x)){
					x = Math.min(x, pt.x);
					y = Math.min(y, pt.y);
				}
			});
			
			var xmax = 0;
			var ymax = 0;
			p.forEach(function(pt){
				if(pt.x!==undefined && !isNaN(pt.x)){
					pt.x = rnd(pt.x - x);
					//console.log("Y:", pt.y, y, pt.y - y)
					pt.y = rnd(pt.y - y);
					xmax = Math.max(xmax, pt.x);
					ymax = Math.max(ymax, pt.y);
				}
			});
			
			console.log("xmax:", xmax, "ymax:", ymax)
			
			var s = 60
			var m = 20
			
			p.forEach(function(pt){
				pt.x = rnd(pt.x / xmax) * s + m;
				pt.y = rnd(pt.y / ymax) * s + m;
			});
			
			var txt = "[\n";
			dojo.forEach(p, function(pt, i){
				txt += "{\t"
				if(pt.t){
					txt += "t:'"+pt.t+"'"
				}
				if(pt.x!==undefined && !isNaN(pt.x)){
					if(pt.t){
						txt += ", ";
					}
					txt += "x:"+pt.x+",\t\ty:"+pt.y;
				}
				txt += "\t}";
				if(i!=p.length-1){
					txt += ","
				}
				txt += "\n"
			});
			txt+="]"
			
			console.log(txt)
			var n = dojo.byId("data");
			if(n){
				n.value = txt;
			}
		}
	}
);

Iconize.setup = {
	name:"dojox.drawing.plugins.tools.Iconize",
	tooltip:"Iconize Tool",
	iconClass:"iconPan"
};
dojo.setObject('dojox.drawing.plugins.tools.Iconize', Iconize);
registry.register(Iconize.setup, "plugin");

return Iconize;
});

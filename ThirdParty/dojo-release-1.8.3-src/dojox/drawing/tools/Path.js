define(["dojo/_base/lang", "../util/oo", "../manager/_registry", "../stencil/Path"],
function(lang, oo, registry, StencilPath){

//dojox.drawing.tools.Path
var Path = oo.declare(
	StencilPath,
	function(){
		// summary:
		//		constructor
		
		this.pathMode = "";
		this.currentPathMode = "";
		this._started = false;
		this.oddEvenClicks = 0;
		
	},
	{
		// summary:
		//		Class for a drawable Path

		draws:true,
		onDown: function(obj){
			if(!this._started){
				this.onStartPath(obj);
			}
			
		},
		
		makeSubPath: function(_closePath){
			if(_closePath){
				if(this.currentPathMode=="Q"){
					this.points.push({
						x:this.points[0].x,
						y:this.points[0].y
					});
				}
				this.points.push({t:"Z"});
				this.render();
			}
			this.currentPathMode = "";
			this.pathMode = "M";
		},
		
		onStartPath: function(obj){
			this._started = true;
			this.revertRenderHit = this.renderHit;
			this.renderHit = false;
			this.closePath = false;
			
			
			this.mouse.setEventMode("PathEdit");
			
			this.closePoint = {x:obj.x, y:obj.y};
			
			this._kc1 = this.connect(this.keys, "onEsc", this, function(){
				this.onCompletePath(false);
			});
			
			this._kc2 = this.connect(this.keys, "onKeyUp", this, function(evt){
				
				switch(evt.letter){
					case "c":
						this.onCompletePath(true); break;
					case "l": this.pathMode = "L"; break;
					case "m": this.makeSubPath(false); break;
					case "q": this.pathMode = "Q"; break;
					case "s": this.pathMode = "S"; break;
					case "z": this.makeSubPath(true); break;
				}
				 
				//console.log("KEY:", evt.letter);
			});
		},
		
		onCompletePath:function(_closePath){
			this.remove(this.closeGuide, this.guide);
			var box = this.getBounds();
			if(box.w<this.minimumSize && box.h<this.minimumSize){
				this.remove(this.hit, this.shape, this.closeGuide);
				this._started = false;
				this.mouse.setEventMode("");
				this.setPoints([]);
				return;
			}
			
			
			if(_closePath){
				if(this.currentPathMode=="Q"){
					this.points.push({
						x:this.points[0].x,
						y:this.points[0].y
					});
				}
				this.closePath = true;
			}
			
			
			this.renderHit = this.revertRenderHit;
			this.renderedOnce = true;
			this.onRender(this);
			this.disconnect([this._kc1, this._kc2]);
			this.mouse.setEventMode("");
			this.render();
			//console.log(this.stringPath);
		},
		
		onUp: function(/*EventObject*/obj){
			//console.log("   Path UP", obj.mid, "within:", obj.withinCanvas)
					
				
			if(!this._started || !obj.withinCanvas){ return; }
			
		
			if(this.points.length>2 && this.closeRadius>this.util.distance(obj.x, obj.y, this.closePoint.x, this.closePoint.y)){
				this.onCompletePath(true);
				
			}else {
				var p = {
					x:obj.x,
					y:obj.y
				};
				this.oddEvenClicks++;
				if(this.currentPathMode != this.pathMode){
					if(this.pathMode=="Q"){
						p.t = "Q";
						this.oddEvenClicks = 0;
					}else if(this.pathMode=="L"){
						p.t = "L";
					}else if(this.pathMode=="M"){
						p.t = "M";
						this.closePoint = {x:obj.x, y:obj.y};
					}
					this.currentPathMode = this.pathMode;
				}
				
				
				this.points.push(p);
				if(this.points.length>1){
					this.remove(this.guide);
					this.render();
				}
				
			}
			
			//console.log(this.stringPath);
		},
		createGuide: function(obj){
			if(!this.points.length){ return; }
			var realPoints = [].concat(this.points);
			
			var pt = {
				x:obj.x,
				y:obj.y
			};
			if(this.currentPathMode=="Q" && this.oddEvenClicks % 2){
				// On a Q curve, every other click needs to be a
				// straight line - the inbetween Q coords don't render
				pt.t = "L"; // this is not permanent
			}
			
			this.points.push(pt);
			
			this.render();
			this.points = realPoints;
			
			
			var dist = this.util.distance(obj.x, obj.y, this.closePoint.x, this.closePoint.y);
			if(this.points.length>1){
				if(dist<this.closeRadius && !this.closeGuide){
					var c = {
						cx:this.closePoint.x,
						cy:this.closePoint.y,
						rx:this.closeRadius,
						ry:this.closeRadius
					}
					this.closeGuide = this.container.createEllipse(c)
						.setFill(this.closeColor);
						
				}else if(dist>this.closeRadius && this.closeGuide){
					this.remove(this.closeGuide);
					this.closeGuide = null;
				}
			}
			
		},
		
		onMove: function(obj){
			if(!this._started){ return; }
			this.createGuide(obj);
		},
		onDrag: function(obj){
			if(!this._started){ return; }
			this.createGuide(obj);
		}
	}
);

lang.setObject("dojox.drawing.tools.Path", Path);
Path.setup = {
	name:"dojox.drawing.tools.Path",
	tooltip:"Path Tool",
	iconClass:"iconLine"
};

registry.register(Path.setup, "tool");

return Path;
});

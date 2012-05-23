dojo.provide("dojox.drawing.plugins.drawing.Silverlight");

dojox.drawing.plugins.drawing.Silverlight = dojox.drawing.util.oo.declare(
	// summary:
	// 	"Plugin" to allow the Silverlight plugin to work
	//	with DojoX Drawing.
	//
	//	WARNING: This is not completely implemented. For the most
	//	part, DojoX Drawing does not support Silverlight. This class
	//	was created in an attempt for support, but there were too many
	//	obstacles and not enough time. The basic functionality is here
	//	and there's a good head start if anyone elase wishes to pick up
	//	where I left off.
	//
	function(options){
		// summary:
		//	The constructor is the only method in this class.
		//	What is happening here is other methods in other
		//	classes are being overridden to adapt to Silverlight.
		//
 		
		if(dojox.gfx.renderer != "silverlight"){ return; }
		this.mouse = options.mouse;
		this.stencils = options.stencils;
		this.anchors = options.anchors;
		this.canvas = options.canvas;
		this.util = options.util;
	
		
		dojo.connect(this.stencils, "register", this, function(item){
			var c1, c2, c3, c4, c5, self = this;
			var conMouse = function(){
				//console.info("------connect shape", item.id)
				
				// Connect to PARENT (SL Canvas) , not SHAPE
				c1 = item.container.connect("onmousedown", function(evt){
					//console.info("----------------------------------SHAPE DOWN", item.container)
					evt.superTarget = item;
					self.mouse.down(evt);
				});
			}
			conMouse();
			
			c2 = dojo.connect(item, "setTransform", this, function(){
				//dojo.disconnect(c1);
			});
			
			c3 = dojo.connect(item, "onBeforeRender", function(){
				//dojo.disconnect(c1);
			});
			
			
			c4 = dojo.connect(item, "onRender", this, function(){
				//conMouse();
			});
			
			c5 = dojo.connect(item, "destroy", this, function(){
				dojo.forEach([c1,c2,c3,c4,c5], dojo.disconnect, dojo);
			});
		});
		
		dojo.connect(this.anchors, "onAddAnchor", this, function(anchor){
			var c1 = anchor.shape.connect("onmousedown", this.mouse, function(evt){
				evt.superTarget = anchor;
				this.down(evt)
			});
			var c2 = dojo.connect(anchor, "disconnectMouse", this, function(){
				dojo.disconnect(c1);
				dojo.disconnect(c2);
			});
			
		});
		
		
		this.mouse._down = function(evt){
			var dim = this._getXY(evt);
			var x = dim.x - this.origin.x;
			var y = dim.y - this.origin.y;
			
			x*= this.zoom;
			y*= this.zoom;
			
			this.origin.startx = x;
			this.origin.starty = y;
			this._lastx = x;
			this._lasty = y;
			
			this.drawingType = this.util.attr(evt, "drawingType") || "";
			var id = this._getId(evt);
			var obj = {x:x,y:y, id:id};
			console.log(" > > > id:", id, "drawingType:", this.drawingType, "evt:", evt)
		
			this.onDown(obj);
			
			this._clickTime = new Date().getTime();
			if(this._lastClickTime){
				if(this._clickTime-this._lastClickTime<this.doublClickSpeed){
					var dnm = this.eventName("doubleClick");
					console.warn("DOUBLE CLICK", dnm, obj);
					this._broadcastEvent(dnm, obj);
				}else{
					//console.log("    slow:", this._clickTime-this._lastClickTime)
				}
			}
			this._lastClickTime = this._clickTime;
			
			// throws errors in IE silverlight. Oddness.
			//dojo.stopEvent(evt);
		}
		
		this.mouse.down = function(evt){
			clearTimeout(this.__downInv);
			if(this.util.attr(evt, "drawingType")=="surface"){
				this.__downInv = setTimeout(dojo.hitch(this, function(){
					this._down(evt);
				}),500);
				return;
			}
			this._down(evt);
			
			
		}
		
		this.mouse._getXY =  function(evt){
			
			if(evt.pageX){
				return {x:evt.pageX, y:evt.pageY, cancelBubble:true};
			}
			console.log("EVT", evt)
			//console.log("EVT", evt.pageX)
			for(var nm in evt){
				//console.log("..."+nm+"="+evt[nm]);
			}
			console.log("EVTX", evt.x)
			if(evt.x !== undefined){
				return {
					x:evt.x + this.origin.x,
					y:evt.y + this.origin.y
				};
			}else{
				return {x:evt.pageX, y:evt.pageY};
			}
		}
		
		this.mouse._getId = function(evt){
			return this.util.attr(evt, "id");
		}
		
		this.util.attr = function(/* Object */ elem, /* property */ prop, /* ? value */ value, squelchErrors){
			if(!elem){ return false; }
			try{
				
				var t;
				if(elem.superTarget){
					t = elem.superTarget;
				}else if(elem.superClass){
					t = elem.superClass;
				}else if(elem.target){
					t = elem.target;
				}else{
					t = elem;
				}
				
				if(value!==undefined){
					elem[prop] = value;
					return value;
				}
				
				if(t.tagName){
					if(prop=="drawingType" && t.tagName.toLowerCase()=="object"){
						return "surface";
					}
					var r =  dojo.attr(t, prop);
				}
				var r = t[prop];
				return r
			
				
			}catch(e){
				if(!squelchErrors){
					// For debugging only. These errors actually cause more errors in IE's console
					//console.error("BAD ATTR: prop:", prop, "el:", elem)
					//console.error(e)
					//console.trace();
				}
				return false;
			}
		}
	},
	{
		
	}
);
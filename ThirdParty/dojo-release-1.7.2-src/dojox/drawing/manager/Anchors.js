dojo.provide("dojox.drawing.manager.Anchors");

dojox.drawing.manager.Anchors = dojox.drawing.util.oo.declare(
	// summary:
	//		Creates and manages the anchor points that are attached to
	//		(usually) the corners of a Stencil.
	// description:
	//		Used internally, but there are some things that should be known:
	//		Anchors attach to a Stencil's 'points' (See stencil.points)
	//		To not display an anchor on a certain point, add noAnchor:true
	//		to the point.
	
	function(/* dojox.__stencilArgs */options){
		// arguments: See stencil._Base
		this.mouse = options.mouse;
		this.undo = options.undo;
		this.util = options.util;
		this.drawing = options.drawing;
		this.items = {};
	},
	{
		onAddAnchor: function(/*Anchor*/anchor){
			// summary:
			//		Event fires when anchor is created
		},
		
		
		onReset: function(/*Stencil*/stencil){
			// summary:
			//		Event fires when an anchor's reset method is called
			//
			// a desperate hack in order to get the anchor point to reset.
			// FIXME: Is this still used? I think its item.deselect();item.select();
			var st = this.util.byId("drawing").stencils;
			st.onDeselect(stencil);
			st.onSelect(stencil);
		},
		
		onRenderStencil: function(){
			// summary:
			//		Event fires when an anchor calls a Stencil's render method
			//
			for(var nm in this.items){
				dojo.forEach(this.items[nm].anchors, function(a){
					a.shape.moveToFront();
				});
			}
		},
		
		onTransformPoint: function(/*Anchor*/anchor){
			// summary:
			//		Event fired on anchor drag
			//
			//		If anchors are a "group", it's corresponding anchor
			//		is set. All anchors then moved to front.
			var anchors = this.items[anchor.stencil.id].anchors;
			var item = this.items[anchor.stencil.id].item;
			var pts = [];
			dojo.forEach(anchors, function(a, i){
				
				
				if(anchor.id == a.id || anchor.stencil.anchorType!="group"){
					// nothing
				}else{
					if(anchor.org.y == a.org.y){
						a.setPoint({
							dx: 0,
							dy: anchor.shape.getTransform().dy - a.shape.getTransform().dy
						});
					}else if(anchor.org.x == a.org.x){
						a.setPoint({
							dx: anchor.shape.getTransform().dx - a.shape.getTransform().dx,
							dy: 0
						});
					}
					a.shape.moveToFront();
				}
				
				var mx = a.shape.getTransform();
				pts.push({x:mx.dx + a.org.x, y:mx.dy+ a.org.y});
				
				if(a.point.t){
					pts[pts.length-1].t = a.point.t;
				}
				
			}, this);
			item.setPoints(pts);
			item.onTransform(anchor);
			this.onRenderStencil();
		},
		
		onAnchorUp: function(/*Anchor*/anchor){
			// summary:
			//		Event fired on anchor mouseup
		},
		
		onAnchorDown: function(/*Anchor*/anchor){
			// summary:
			//		Event fired on anchor mousedown
		},
		
		onAnchorDrag: function(/*Anchor*/anchor){
			// summary:
			//		Event fired when anchor is moved
		},
		
		onChangeStyle: function(/*Object*/stencil){
			// summary:
			// 		if the Stencil changes color while were's selected
			// 		this moves the anchors to the back. Fix it.
			
			for(var nm in this.items){
				dojo.forEach(this.items[nm].anchors, function(a){
					a.shape.moveToFront();
				});
			}
		},
		
		add: function(/*Stencil*/item){
			// summary:
			//		Creates anchor points on a Stencil, based on the
			//		Stencil's points.
			//
			this.items[item.id] = {
				item:item,
				anchors:[]
			};
			if(item.anchorType=="none"){ return; }
			var pts = item.points;
			dojo.forEach(pts, function(p, i){
				if(p.noAnchor){ return; }
				if(i==0 || i == item.points.length-1){
					console.log("ITEM TYPE:", item.type, item.shortType);
				}
				var a = new dojox.drawing.manager.Anchor({stencil:item, point:p, pointIdx:i, mouse:this.mouse, util:this.util});
				this.items[item.id]._cons = [
					dojo.connect(a, "onRenderStencil", this, "onRenderStencil"),
					dojo.connect(a, "reset", this, "onReset"),
					dojo.connect(a, "onAnchorUp", this, "onAnchorUp"),
					dojo.connect(a, "onAnchorDown", this, "onAnchorDown"),
					dojo.connect(a, "onAnchorDrag", this, "onAnchorDrag"),
					dojo.connect(a, "onTransformPoint", this, "onTransformPoint"),
					// FIXME: this will fire for each anchor. yech.
					dojo.connect(item, "onChangeStyle", this, "onChangeStyle")
				];
				
				this.items[item.id].anchors.push(a);
				this.onAddAnchor(a);
			}, this);
			
			if(item.shortType=="path"){
				// check if we have a double-point of a closed-curve-path
				var f = pts[0], l = pts[pts.length-1], a = this.items[item.id].anchors;
				if(f.x ==l.x && f.y==l.y){
					console.warn("LINK ANVHROS", a[0], a[a.length-1]);
					a[0].linkedAnchor = a[a.length-1];
					a[a.length-1].linkedAnchor = a[0];
				}
			}
			
			if(item.anchorType=="group"){
				dojo.forEach(this.items[item.id].anchors, function(anchor){
					dojo.forEach(this.items[item.id].anchors, function(a){
						if(anchor.id != a.id){
							if(anchor.org.y == a.org.y){
								anchor.x_anchor = a;
							}else if(anchor.org.x == a.org.x){
								anchor.y_anchor = a;
							}
						}
					},this);
				},this);
				
			}
		},
		
		remove: function(/*Stencil*/item){
			// summary:
			//		Destroys the anchor points for a Stencil.
			//
			if(!this.items[item.id]){
				return;
			}
			dojo.forEach(this.items[item.id].anchors, function(a){
				a.destroy();
			});
			dojo.forEach(this.items[item.id]._cons, dojo.disconnect, dojo);
			this.items[item.id].anchors = null;
			delete this.items[item.id];
		}
	}
);

dojox.drawing.manager.Anchor = dojox.drawing.util.oo.declare(
	// summary:
	//		An anchor point that is attached to (usually) one of the
	//		corners of a Stencil.
	//		Used internally.
	function(/* Object */options){
		// summary:
		//		constructor.
		//		arguments:
		//			dojox.__stencilArgs plus some additional
		//			data, like which point this is (pointIdx)
		//
		this.defaults = dojox.drawing.defaults.copy();
		this.mouse = options.mouse;
		this.point = options.point;
		this.pointIdx = options.pointIdx;
		this.util = options.util;
		this.id = options.id || this.util.uid("anchor");
		this.org = dojo.mixin({}, this.point);
		this.stencil = options.stencil;
		if(this.stencil.anchorPositionCheck){
			this.anchorPositionCheck = dojo.hitch(this.stencil, this.stencil.anchorPositionCheck);
		}
		if(this.stencil.anchorConstrain){
			this.anchorConstrain = dojo.hitch(this.stencil, this.stencil.anchorConstrain);
		}
		this._zCon = dojo.connect(this.mouse, "setZoom", this, "render");
		this.render();
		this.connectMouse();
	},
	{
		y_anchor:null,
		x_anchor:null,
		render: function(){
			// summary:
			//		Creates the anchor point. Unlike most render methods
			//		in Drawing, this is only called once.
			//
			this.shape && this.shape.removeShape();
			var d = this.defaults.anchors,
				z = this.mouse.zoom,
				b = d.width * z,
				s = d.size * z,
				p = s/2,
				line = {
					width:b,
					style:d.style,
					color:d.color,
					cap:d.cap
				};
			
	
			var _r = {
				x: this.point.x-p,
				y: this.point.y-p,
				width: s,
				height: s
			};
			this.shape = this.stencil.container.createRect(_r)
				.setStroke(line)
				.setFill(d.fill);
			
			this.shape.setTransform({dx:0, dy:0});
			this.util.attr(this, "drawingType", "anchor");
			this.util.attr(this, "id", this.id);
		},
		onRenderStencil: function(/*Anchor*/anchor){
			// summary:
			//		Event fires when an anchor calls a Stencil's render method
		},
		onTransformPoint: function(/*Anchor*/anchor){
			// summary:
			//		Event fires when an anchor changes the points of a Stencil
		},
		onAnchorDown: function(/*Mouse.EventObject*/obj){
			// summary:
			//		Event fires for mousedown on anchor
			this.selected = obj.id == this.id;
		},
		onAnchorUp: function(/*Mouse.EventObject*/obj){
			// summary:
			//		Event fires for mouseup on anchor
			this.selected = false;
			this.stencil.onTransformEnd(this);
		},
		
		onAnchorDrag: function(/*Mouse.EventObject*/obj){
			// summary:
			//		Event fires for on dragging of an anchor
			if(this.selected){
				// mx is the original transform from when the anchor
				// was created. It does not change
				var mx = this.shape.getTransform();
				
				var pmx = this.shape.getParent().getParent().getTransform();
				
				var marginZero = this.defaults.anchors.marginZero;
				
				var orgx = pmx.dx + this.org.x,
					orgy = pmx.dy + this.org.y,
					x = obj.x - orgx,
					y = obj.y - orgy,
					s = this.defaults.anchors.minSize;
				
				var conL, conR, conT, conB;
				
				var chk = this.anchorPositionCheck(x, y, this);
				if(chk.x<0){
					console.warn("X<0 Shift");
					while(this.anchorPositionCheck(x, y, this).x<0){
						this.shape.getParent().getParent().applyTransform({dx:2, dy:0});
					}
				}
				if(chk.y<0){
					console.warn("Y<0 Shift");
					while(this.anchorPositionCheck(x, y, this).y<0){
						this.shape.getParent().getParent().applyTransform({dx:0, dy:2});
					}
				}
				
				if(this.y_anchor){
					// prevent y overlap of opposite anchor
					if(this.org.y > this.y_anchor.org.y){
						// bottom anchor
						
						conT = this.y_anchor.point.y + s - this.org.y;
						conB = Infinity;
						
						if(y < conT){
							// overlapping other anchor
							y = conT;
						}
						
						
					}else{
						// top anchor
						
						conT = -orgy + marginZero;
						conB = this.y_anchor.point.y - s - this.org.y;
						
						if(y < conT){
							// less than zero
							y = conT;
						}else if(y > conB){
							// overlapping other anchor
							y = conB;
						}
					}
				}else{
					// Lines - check for zero
					conT = -orgy + marginZero;
					if(y < conT){
						// less than zero
						y = conT;
					}
				}
				
				
				
				
				if(this.x_anchor){
					// prevent x overlap of opposite anchor
					
					if(this.org.x>this.x_anchor.org.x){
						// right anchor
						
						conL = this.x_anchor.point.x + s - this.org.x;
						conR = Infinity;
						
						if(x < conL){
							// overlapping other anchor
							x = conL;
						}
						
					}else{
						// left anchor
						
						conL = -orgx + marginZero;
						conR = this.x_anchor.point.x - s - this.org.x;
						
						if(x < conL){
							x = conL;
						}else if(x > conR){
							// overlapping other anchor
							x = conR;
						}
					}
				}else{
					// Lines check for zero
					conL = -orgx + marginZero;
					if(x < conL){
						x = conL;
					}
				}
				//Constrains anchor point, returns null if not overwritten by stencil
				var constrained = this.anchorConstrain(x, y);
				if(constrained != null){
					x=constrained.x;
					y=constrained.y;
				}
				
				this.shape.setTransform({
					dx:x,
					dy:y
				});
				if(this.linkedAnchor){
					// first and last points of a closed-curve-path
					this.linkedAnchor.shape.setTransform({
						dx:x,
						dy:y
					});
				}
				this.onTransformPoint(this);
			}
		},
		
		anchorConstrain: function(/* Number */x,/* Number */ y){
			// summary:
			//		To be over written by tool!
			//		Add an anchorConstrain method to the tool
			//		and it will automatically overwrite this stub.
			//		Should return a constrained x & y value.
			return null;
		},
		
		anchorPositionCheck: function(/* Number */x,/* Number */ y, /* Anchor */anchor){
			// summary:
			//		To be over written by tool!
			//		Add a anchorPositionCheck method to the tool
			//		and it will automatically overwrite this stub.
			//		Should return x and y coords. Success is both
			//		being greater than zero, fail is if one or both
			//		are less than zero.
			return {x:1, y:1};
		},
		
		setPoint: function(mx){
			// summary:
			//		Internal. Sets the Stencil's point
			this.shape.applyTransform(mx);
		},
		
		connectMouse: function(){
			// summary:
			//		Internal. Connects anchor to manager.mouse
			this._mouseHandle = this.mouse.register(this);
		},
		
		disconnectMouse: function(){
			// summary:
			//		Internal. Disconnects anchor to manager.mouse
			this.mouse.unregister(this._mouseHandle);
		},
		
		reset: function(stencil){
			// summary:
			//		Called (usually) from a Stencil when that Stencil
			//		needed to make modifications to the position of the
			//		point. Basically used when teh anchor causes a
			//		less than zero condition.
		},
		
		destroy: function(){
			// summary:
			//		Destroys anchor.
			dojo.disconnect(this._zCon);
			this.disconnectMouse();
			this.shape.removeShape();
		}
	}
);

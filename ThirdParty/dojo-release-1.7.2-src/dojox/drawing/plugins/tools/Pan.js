dojo.provide("dojox.drawing.plugins.tools.Pan");
dojo.require("dojox.drawing.plugins._Plugin");

dojox.drawing.plugins.tools.Pan = dojox.drawing.util.oo.declare(
	// summary:
	//		A plugin that allows for a scrolling canvas. An action
	//		tool is added to the toolbar that allows for panning. Holding
	//		the space bar is a shortcut to that action. The canvas will
	//		only pan and scroll if there are objects out of the viewable
	//		area.
	// example:
	//		|	<div dojoType="dojox.drawing.Toolbar" drawingId="drawingNode" class="drawingToolbar vertical">
	//		|		<div tool="dojox.drawing.tools.Line" selected="true">Line</div>
	//		|		<div plugin="dojox.drawing.plugins.tools.Pan" options="{}">Pan</div>
	//		|	</div>
	//
	dojox.drawing.plugins._Plugin,
	function(options){
		this.domNode = options.node;
		var _scrollTimeout;
		this.toolbar = options.scope;
		this.connect(this.toolbar, "onToolClick", this, function(){
			this.onSetPan(false)
		});
		this.connect(this.keys, "onKeyUp", this, "onKeyUp");
		this.connect(this.keys, "onKeyDown", this, "onKeyDown");
		this.connect(this.keys, "onArrow", this, "onArrow");
		this.connect(this.anchors, "onAnchorUp", this, "checkBounds");
		this.connect(this.stencils, "register", this, "checkBounds");
		this.connect(this.canvas, "resize", this, "checkBounds");
		this.connect(this.canvas, "setZoom", this, "checkBounds");
		this.connect(this.canvas, "onScroll", this, function(){
			if(this._blockScroll){
				this._blockScroll = false;
				return;
			}
			_scrollTimeout && clearTimeout(_scrollTimeout);
			_scrollTimeout = setTimeout(dojo.hitch(this, "checkBounds"), 200);
		});
		this._mouseHandle = this.mouse.register(this);
		// This HAS to be called after setting initial objects or things get screwy.
		//this.checkBounds();
		
	},{
		selected:false,
		keyScroll:false,
		type:"dojox.drawing.plugins.tools.Pan",
		
		onPanUp: function(obj){
			if(obj.id == this.button.id){
				this.onSetPan(false);
			}
		},
		
		onKeyUp: function(evt){
			switch(evt.keyCode){
				case 32:
					this.onSetPan(false);
					break;
				case 39: case 37: case 38: case 40:
					clearInterval(this._timer);
					break;
			}
		},
		
		onKeyDown: function(evt){
			if(evt.keyCode == 32){
				this.onSetPan(true);
			}
		},
		
		interval: 20,
		
		onArrow: function(evt){
			if(this._timer){ clearInterval(this._timer); }
			this._timer = setInterval(dojo.hitch(this,function(evt){
				this.canvas.domNode.parentNode.scrollLeft += evt.x*10;
				this.canvas.domNode.parentNode.scrollTop += evt.y*10;
			},evt), this.interval);
		},
		
		onSetPan: function(/*Boolean | Event*/ bool){
			if(bool === true || bool === false){
				this.selected = !bool;
			}
			console.log('ON SET PAN:', this.selected)
			if(this.selected){
				this.selected = false;
				this.button.deselect();
			}else{
				this.selected = true;
				this.button.select();
			}
			this.mouse.setEventMode(this.selected ? "pan" : "");
		},
		
		onPanDrag: function(obj){
			var x = obj.x - obj.last.x;
			var y = obj.y - obj.last.y;
			this.canvas.domNode.parentNode.scrollTop -= obj.move.y;
			this.canvas.domNode.parentNode.scrollLeft -= obj.move.x;
			this.canvas.onScroll();
		},
		
		onUp: function(obj){
			if(obj.withinCanvas){
				this.keyScroll = true;
			}else{
				this.keyScroll = false;
			}
		},
		
		onStencilUp: function(obj){
			// this gets called even on click-off because of the
			// issues with TextBlock deselection
			this.checkBounds();
		},
		onStencilDrag: function(obj){
			// this gets called even on click-off because of the
			// issues with TextBlock deselection
			//this.checkBounds();
		},
		
		checkBounds: function(){
			
			//watch("CHECK BOUNDS DISABLED", true); return;
			
			
			// summary:
			//		Scans all items on the canvas and checks if they are out of
			// 		bounds. If so, a scroll bar (in Canvas) is shown. If the position
			// 		is left or top, the canvas is scrolled all items are relocated
			// 		the distance of the scroll. Ideally, it should look as if the
			// 		items do not move.
			
			// logging stuff here so it can be turned on and off. This method is
			// very high maintenance.
			var log = function(){
				//console.log.apply(console, arguments);
			}
			var warn = function(){
				//console.warn.apply(console, arguments);
			}
			//console.clear();
			//console.time("check bounds");
			
			// initialize a shot-tin of vars
			var t=Infinity, r=-Infinity, b=-10000, l=10000,
				sx=0, sy=0, dy=0, dx=0,
				mx = this.stencils.group ? this.stencils.group.getTransform() : {dx:0, dy:0},
				sc = this.mouse.scrollOffset(),
				// scY, scX: the scrollbar creates the need for extra dimension
				scY = sc.left ? 10 : 0,
				scX = sc.top ? 10 : 0,
				// ch, cw: the current size of the canvas
				ch = this.canvas.height,
				cw = this.canvas.width,
				z = this.canvas.zoom,
				// pch, pcw: the normal size of the canvas (not scrolled)
				// these could change if the container resizes.
				pch = this.canvas.parentHeight,
				pcw = this.canvas.parentWidth;
			
			
			this.stencils.withSelected(function(m){
				var o = m.getBounds();
				warn("SEL BOUNDS:", o);
				t = Math.min(o.y1 + mx.dy, t);
				r = Math.max(o.x2 + mx.dx, r);
				b = Math.max(o.y2 + mx.dy, b);
				l = Math.min(o.x1 + mx.dx, l);
			});
			
			this.stencils.withUnselected(function(m){
				var o = m.getBounds();
				warn("UN BOUNDS:", o);
				t = Math.min(o.y1, t);
				r = Math.max(o.x2, r);
				b = Math.max(o.y2, b);
				l = Math.min(o.x1, l);
				log("----------- B:", b, o.y2)
			});
			
			b *= z;
			var xscroll = 0, yscroll = 0;
			log("Bottom test", "b:", b, "z:", z, "ch:", ch, "pch:", pch, "top:", sc.top, "sy:", sy, "mx.dy:", mx.dy);
			if(b > pch || sc.top ){
				log("*bottom scroll*");
				// item off bottom
				ch = Math.max(b, pch + sc.top);
				sy = sc.top;
				xscroll += this.canvas.getScrollWidth();
			}else if(!sy && ch>pch){
				log("*bottom remove*");
				// item moved from bottom
				ch = pch;
			}
			
			r *= z;
			if(r > pcw || sc.left){
				//log("*right scroll*");
				// item off right
				cw = Math.max(r, pcw + sc.left);
				sx = sc.left;
				yscroll += this.canvas.getScrollWidth();
			}else if(!sx && cw>pcw){
				//log("*right remove*");
				// item moved from right
				cw = pcw;
			}
			
			// add extra space for scrollbars
			// double it to give some breathing room
			cw += xscroll*2;
			ch += yscroll*2;
			
			this._blockScroll = true;
			
			// selected items are not transformed. The selection itself is
			// and the items are on de-select
			this.stencils.group && this.stencils.group.applyTransform({dx:dx, dy:dy});
			
			// non-selected items are transformed
			this.stencils.withUnselected(function(m){
				m.transformPoints({dx:dx, dy:dy});
			});
			
			this.canvas.setDimensions(cw, ch, sx, sy);
			
			//console.timeEnd("check bounds");
		}
	}
);

dojox.drawing.plugins.tools.Pan.setup = {
	name:"dojox.drawing.plugins.tools.Pan",
	tooltip:"Pan Tool",
	iconClass:"iconPan",
	button:false
};

dojox.drawing.register(dojox.drawing.plugins.tools.Pan.setup, "plugin");
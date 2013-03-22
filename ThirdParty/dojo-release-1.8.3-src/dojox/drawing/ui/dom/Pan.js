define(["dojo", "../../util/oo", "../../plugins/_Plugin", "../../manager/_registry"], 
function(dojo, oo, Plugin, registry){
dojo.deprecated("dojox.drawing.ui.dom.Pan", "It may not even make it to the 1.4 release.", 1.4);

var Pan = oo.declare(
	// NOTE:
	//		dojox.drawing.ui.dom.Pan is DEPRECATED.
	//		This was a temporary DOM solution. Use the non-dom
	//		tools for Toolbar and Plugins.

	// summary:
	//		A plugin that allows for a scrolling canvas. An action
	//		tool is added to the toolbar that allows for panning. Holding
	//		the space bar is a shortcut to that action. The canvas will
	//		only pan and scroll if there are objects out of the viewable
	//		area.
	// example:
	//		|	<div dojoType="dojox.drawing.Toolbar" drawingId="drawingNode" class="drawingToolbar vertical">
	//		|		<div tool="dojox.drawing.tools.Line" selected="true">Line</div>
	//		|		<div plugin="dojox.drawing.ui.dom.Pan" options="{}">Pan</div>
	//		|	</div>

	Plugin,
	function(options){
		
		this.domNode = options.node;
		var _scrollTimeout;
		dojo.connect(this.domNode, "click", this, "onSetPan");
		dojo.connect(this.keys, "onKeyUp", this, "onKeyUp");
		dojo.connect(this.keys, "onKeyDown", this, "onKeyDown");
		dojo.connect(this.anchors, "onAnchorUp", this, "checkBounds");
		dojo.connect(this.stencils, "register", this, "checkBounds");
		dojo.connect(this.canvas, "resize", this, "checkBounds");
		dojo.connect(this.canvas, "setZoom", this, "checkBounds");
		dojo.connect(this.canvas, "onScroll", this, function(){
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
		type:"dojox.drawing.ui.dom.Pan",
		
		onKeyUp: function(evt){
			if(evt.keyCode == 32){
				this.onSetPan(false);
			}
		},
		
		onKeyDown: function(evt){
			if(evt.keyCode == 32){
				this.onSetPan(true);
			}
		},
		
		onSetPan: function(/*Boolean|Event*/ bool){
			if(bool === true || bool === false){
				this.selected = !bool;
			}
			if(this.selected){
				this.selected = false;
				dojo.removeClass(this.domNode, "selected");
			}else{
				this.selected = true;
				dojo.addClass(this.domNode, "selected");
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
			// summary:
			//		Scans all items on the canvas and checks if they are out of
			//		bounds. If so, a scroll bar (in Canvas) is shown. If the position
			//		is left or top, the canvas is scrolled all items are relocated
			//		the distance of the scroll. Ideally, it should look as if the
			//		items do not move.

			//watch("CHECK BOUNDS DISABLED", true); return;


			// logging stuff here so it can be turned on and off. This method is
			// very high maintenance.
			var log = function(){
				///console.log.apply(console, arguments);
			};
			var warn = function(){
				//console.warn.apply(console, arguments);
			};
			//console.clear();
			//console.time("check bounds");
			var t=Infinity, r=-Infinity, b=-Infinity, l=Infinity,
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
			});
			
			b *= z;
			var xscroll = 0, yscroll = 0;
			log("Bottom test", "b:", b, "z:", z, "ch:", ch, "pch:", pch, "top:", sc.top, "sy:", sy);
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

dojo.setObject("dojox.drawing.ui.dom.Pan", Pan);
Pan.setup = {
	name:"dojox.drawing.ui.dom.Pan",
	tooltip:"Pan Tool",
	iconClass:"iconPan"
};

registry.register(Pan.setup, "plugin");

return Pan;
});

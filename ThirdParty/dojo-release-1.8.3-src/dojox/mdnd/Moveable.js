define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/event",
	"dojo/_base/sniff",
	"dojo/dom",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/_base/window"
],function(dojo, declare, array, connect, event, sniff, dom, geom, domStyle){
	return declare(
		"dojox.mdnd.Moveable",
		null,
	{
		// summary:
		//		Allow end-users to track a DOM node into the web page
	
		// handle: DOMNode
		//		The node on which the user clicks to drag the main node.
		handle: null,
		
		// skip: Boolean
		//		A flag to control a drag action if a form element has been focused.
		//		If true, the drag action is not executed.
		skip: true,
	
		// dragDistance: Integer
		//		The user clicks on the handle, but the drag action will really begin
		//		if he tracks the main node to more than 3 pixels.
		dragDistance: 3,
		
		constructor: function(/*Object*/params, /*DOMNode*/node){
			// summary:
			//		Configure parameters and listen to mousedown events from handle
			//		node.
			// params:
			//		Hash of parameters
			// node:
			//		The draggable node
	
			//console.log("dojox.mdnd.Moveable ::: constructor");
			this.node = dom.byId(node);
			
			this.d = this.node.ownerDocument;
			
			if(!params){ params = {}; }
			this.handle = params.handle ? dom.byId(params.handle) : null;
			if(!this.handle){ this.handle = this.node; }
			this.skip = params.skip;
			this.events = [
				connect.connect(this.handle, "onmousedown", this, "onMouseDown")
			];
			if(dojox.mdnd.autoScroll){
				this.autoScroll = dojox.mdnd.autoScroll;
			}
			
		},
		
		isFormElement: function(/*DOMEvent*/ e){
			// summary:
			//		identify the type of target node associated with a DOM event.
			// e:
			//		a DOM event
			// returns:
			//		if true, the target is one of those specific nodes.
	
			//console.log("dojox.mdnd.Moveable ::: isFormElement");
			var t = e.target;
			if(t.nodeType == 3 /*TEXT_NODE*/){
				t = t.parentNode;
			}
			return " a button textarea input select option ".indexOf(" " + t.tagName.toLowerCase() + " ") >= 0;	// Boolean
		},
		
		onMouseDown: function(/*DOMEvent*/e){
			// summary:
			//		Occurs when the user clicks on the handle node.
			//		Skip the drag action if a specific node is targeted.
			//		Listens to mouseup and mousemove events on to the HTML document.
			// e:
			//		a DOM event
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.Moveable ::: onMouseDown");
			if(this._isDragging){ return;}
			var isLeftButton = (e.which || e.button) == 1;
			if(!isLeftButton){
				return;
			}
			if(this.skip && this.isFormElement(e)){ return; }
			if(this.autoScroll){
				this.autoScroll.setAutoScrollNode(this.node);
				this.autoScroll.setAutoScrollMaxPage();
			}
			this.events.push(connect.connect(this.d, "onmouseup", this, "onMouseUp"));
			this.events.push(connect.connect(this.d, "onmousemove", this, "onFirstMove"));
			this._selectStart = connect.connect(dojo.body(), "onselectstart", event.stop);
			this._firstX = e.clientX;
			this._firstY = e.clientY;
			event.stop(e);
		},
		
		onFirstMove: function(/*DOMEvent*/e){
			// summary:
			//		Occurs when the user moves the mouse after clicking on the
			//		handle.
			//		Determinate when the drag action will have to begin (see
			//		dragDistance).
			// e:
			//		A DOM event
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.Moveable ::: onFirstMove");
			event.stop(e);
			var d = (this._firstX - e.clientX) * (this._firstX - e.clientX)
					+ (this._firstY - e.clientY) * (this._firstY - e.clientY);
			if(d > this.dragDistance * this.dragDistance){
				this._isDragging = true;
				connect.disconnect(this.events.pop());
				domStyle.set(this.node, "width", geom.getContentBox(this.node).w + "px");
				this.initOffsetDrag(e);
				this.events.push(connect.connect(this.d, "onmousemove", this, "onMove"));
			}
		},
		
		initOffsetDrag: function(/*DOMEvent*/e){
			// summary:
			//		Initialize the gap between main node coordinates and the clicked point.
			//		Call the onDragStart method.
			// e:
			//		A DOM event
	
			//console.log("dojox.mdnd.Moveable ::: initOffsetDrag");
			this.offsetDrag = { 'l': e.pageX, 't': e.pageY };
			var s = this.node.style;
			var position = geom.position(this.node, true);
			/*if(s.position == "relative" || s.position == ""){
				s.position = "absolute"; // enforcing the absolute mode
			}*/
			this.offsetDrag.l = position.x - this.offsetDrag.l;
			this.offsetDrag.t = position.y - this.offsetDrag.t;
			var coords = {
				'x': position.x,
				'y': position.y
			};
			this.size = {
				'w': position.w,
				'h': position.h
			};
			// method to catch
			this.onDragStart(this.node, coords, this.size);
		},
		
		onMove: function(/*DOMEvent*/e){
			// summary:
			//		Occurs when the user moves the mouse.
			//		Calls the onDrag method.
			// e:
			//		a DOM event
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.Moveable ::: onMove");
			event.stop(e);
			// hack to avoid too many calls to onMove in IE8 causing sometimes slowness
			if(sniff("ie") == 8 && new Date() - this.date < 20){
				return;
			}
			if(this.autoScroll){
				this.autoScroll.checkAutoScroll(e);
			}
			var coords = {
				'x': this.offsetDrag.l + e.pageX,
				'y': this.offsetDrag.t + e.pageY
			};
			var s = this.node.style;
			s.left = coords.x + "px";
			s.top = coords.y + "px";
			
			// method to catch
			this.onDrag(this.node, coords, this.size, {'x':e.pageX, 'y':e.pageY});
			if(sniff("ie") == 8){
				this.date = new Date();
			}
		},
		
		onMouseUp: function(/*DOMEvent*/e){
			// summary:
			//		Occurs when the user releases the mouse
			//		Calls the onDragEnd method.
			// e:
			//		a DOM event
	
			if (this._isDragging){
				event.stop(e);
				this._isDragging = false;
				if(this.autoScroll){
					this.autoScroll.stopAutoScroll();
				}
				delete this.onMove;
				this.onDragEnd(this.node);
				this.node.focus();
			}
			connect.disconnect(this.events.pop());
			connect.disconnect(this.events.pop());
		},
		
		onDragStart: function(/*DOMNode*/node, /*Object*/coords, /*Object*/size){
			// summary:
			//		Stub function.
			//		Notes : border box model
			// node:
			//		a DOM node
			// coords:
			//		absolute position of the main node
			// size:
			//		an object encapsulating width an height values
			// tags:
			//		callback
	
		},
		
		onDragEnd: function(/*DOMNode*/node){
			// summary:
			//		Stub function
			//		Notes : Coordinates don't contain margins
			// node:
			//		a DOM node
			// tags:
			//		callback
	
		},
		
		onDrag: function(/*DOMNode*/node, /*Object*/coords, /*Object*/size, /*Object*/mousePosition){
			// summary:
			//		Stub function.
			//		Notes : border box model for size value, margin box model for coordinates
			// node:
			//		a DOM node
			// coords:
			//		position of the main node (equals to css left/top properties)
			// size:
			//		an object encapsulating width and height values
			// mousePosition:
			//		coordiantes of mouse
			// tags:
			//		callback
	
		},
	
		destroy: function(){
			// summary:
			//		Delecte associated events
	
			// console.log("dojox.mdnd.Moveable ::: destroy");
			array.forEach(this.events, connect.disconnect);
			this.events = this.node = null;
		}
	});
});

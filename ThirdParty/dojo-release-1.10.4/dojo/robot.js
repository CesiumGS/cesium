define([
	"./_base/array",
	"./dom",
	"./dom-geometry",
	"./_base/kernel",
	"./_base/lang",
	"./_base/window",
	"doh/_browserRunner",
	"doh/robot",
	"./window"
], function(array, dom, geom, kernel, lang, win, doh, robot, winUtils){

kernel.experimental("dojo.robot");

// users who use doh+dojo get the added convenience of robot.mouseMoveAt(),
// instead of computing the absolute coordinates of their elements themselves
lang.mixin(robot, {

	_resolveNode: function(/*String||DOMNode||Function*/ n){
		if(typeof n == "function"){
			// if the user passed a function returning a node, evaluate it
			n = n();
		}
		return n ? dom.byId(n) : null;
	},

	_scrollIntoView: function(/*Node*/ n){
		// scrolls the passed node into view, scrolling all ancestor frames/windows as well.
		// Assumes parent iframes can be made fully visible given the current browser window size
		var p = null;
		array.forEach(robot._getWindowChain(n), function(w){
			// get the position of the node wrt its parent window
			// if it is a parent frame, its padding and border extents will get added in
			var p2 = geom.position(n, false),
				b = geom.getPadBorderExtents(n),
				oldp = null;
			// if p2 is the position of the original passed node, store the position away as p
			// otherwise, node is actually an iframe. in this case, add the iframe's position wrt its parent window and also the iframe's padding and border extents
			if(!p){
				p = p2;
			}else{
				oldp = p;
				p = {x: p.x+p2.x+b.l,
					y: p.y+p2.y+b.t,
					w: p.w,
					h: p.h};

			}
			// scroll the parent window so that the node translated into the parent window's coordinate space is in view
			winUtils.scrollIntoView(n,p);
			// adjust position for the new scroll offsets
			p2 = geom.position(n, false);
			if(!oldp){
				p = p2;
			}else{
				p = {x: oldp.x+p2.x+b.l,
					y: oldp.y+p2.y+b.t,
					w: p.w,
					h: p.h};
			}
			// get the parent iframe so it can be scrolled too
			n = w.frameElement;
		});
	},

	_position: function(/*Node*/ n){
		// Returns the geom.position of the passed node wrt the passed window's viewport,
		// following any parent iframes containing the node and clipping the node to each iframe.
		// precondition: _scrollIntoView already called
		var p = null, max = Math.max, min = Math.min;
		// p: the returned position of the node
		array.forEach(robot._getWindowChain(n), function(w){
			// get the position of the node wrt its parent window
			// if it is a parent frame, its padding and border extents will get added in
			var p2 = geom.position(n, false), b = geom.getPadBorderExtents(n);
			// if p2 is the position of the original passed node, store the position away as p
			// otherwise, node is actually an iframe. in this case, add the iframe's position wrt its parent window and also the iframe's padding and border extents
			if(!p){
				p = p2;
			}else{
				var view = winUtils.getBox(n.contentWindow.document);
				p2.r = p2.x+view.w;
				p2.b = p2.y+view.h;
				p = {x: max(p.x+p2.x,p2.x)+b.l, // clip left edge of node wrt the iframe
					y: max(p.y+p2.y,p2.y)+b.t,	// top edge
					r: min(p.x+p2.x+p.w,p2.r)+b.l,	// right edge (to compute width)
					b: min(p.y+p2.y+p.h,p2.b)+b.t}; // bottom edge (to compute height)
				// save a few bytes by computing width and height from r and b
				p.w = p.r-p.x;
				p.h = p.b-p.y;
			}
			// the new node is now the old node's parent iframe
			n=w.frameElement;
		});
		return p;
	},

	_getWindowChain : function(/*Node*/ n){
		// Returns an array of windows starting from the passed node's parent window and ending at dojo's window
		var cW = winUtils.get(n.ownerDocument);
		var arr = [cW];
		var f = cW.frameElement;
		return (cW == win.global || !f) ? arr : arr.concat(robot._getWindowChain(f));
	},

	scrollIntoView : function(/*String||DOMNode||Function*/ node, /*Number, optional*/ delay){
		// summary:
		//		Scroll the passed node into view, if it is not.
		// node:
		//		The id of the node, or the node itself, to move the mouse to.
		//		If you pass an id or a function that returns a node, the node will not be evaluated until the movement executes.
		//		This is useful if you need to move the mouse to an node that is not yet present.
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.

		robot.sequence(function(){
			robot._scrollIntoView(robot._resolveNode(node));
		}, delay);
	},

	mouseMoveAt : function(/*String||DOMNode||Function*/ node, /*Integer, optional*/ delay, /*Integer, optional*/ duration, /*Number, optional*/ offsetX, /*Number, optional*/ offsetY){
		// summary:
		//		Moves the mouse over the specified node at the specified relative x,y offset.
		// description:
		//		Moves the mouse over the specified node at the specified relative x,y offset.
		//		If you do not specify an offset, mouseMove will default to move to the middle of the node.
		//		Example: to move the mouse over a ComboBox's down arrow node, call doh.mouseMoveAt(dijit.byId('setvaluetest').downArrowNode);
		// node:
		//		The id of the node, or the node itself, to move the mouse to.
		//		If you pass an id or a function that returns a node, the node will not be evaluated until the movement executes.
		//		This is useful if you need to move the mouse to an node that is not yet present.
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		// |	robot.mouseClick({left:true}, 100) // first call; wait 100ms
		// |	robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		// duration:
		//		Approximate time Robot will spend moving the mouse
		//		The default is 100ms.
		// offsetX:
		//		x offset relative to the node, in pixels, to move the mouse. The default is half the node's width.
		// offsetY:
		//		y offset relative to the node, in pixels, to move the mouse. The default is half the node's height.

		robot._assertRobot();

		// Schedule an action to scroll the node into view, then calculate it's center point
		var point = {};
		this.sequence(function(){
			node = robot._resolveNode(node);
			robot._scrollIntoView(node);
			var pos = robot._position(node);
			if(offsetY === undefined){
				offsetX = pos.w/2;
				offsetY = pos.h/2;
			}
			point.x = pos.x+offsetX;
			point.y = pos.y+offsetY;
		}, delay);

		// Schedule a bunch of actions to move the mouse from the current position to point.
		// These actions won't run until after the above callback.
		this.mouseMoveTo(point, 0, duration, false);
	}
});

return robot;
});

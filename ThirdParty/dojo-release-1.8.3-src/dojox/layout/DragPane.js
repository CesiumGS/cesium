define(["dojo/_base/declare", "dijit/_Widget", "dojo/_base/html", "dojo/dom-style"],
  function(declare, Widget, htmlUtil, domStyle){
return declare("dojox.layout.DragPane", Widget, {
	// summary:
	//		Makes a pane's content draggable by/within it's surface
	// description:
	//		A small widget which takes a node with overflow:auto and
	//		allows dragging to position the content. Useful with images,
	//		or for just adding "something" to a overflow-able div.

	// invert: Boolean
	//		Naturally, the behavior is to invert the axis of the drag.
	//		Setting invert:false will make the pane drag in the same
	//		direction as the mouse.
	invert: true,
	
	postCreate: function(){
		this.connect(this.domNode, "onmousedown", "_down");
		this.connect(this.domNode, "onmouseleave", "_up");
		this.connect(this.domNode, "onmouseup", "_up");
	},
	
	_down: function(/*Event*/ e){
		// summary:
		//		mousedown handler, start the dragging
		var t = this.domNode;
		e.preventDefault();
		domStyle.set(t, "cursor", "move");
		this._x = e.pageX;
		this._y = e.pageY;
		if ((this._x < t.offsetLeft + t.clientWidth) &&
			(this._y < t.offsetTop + t.clientHeight)) {
			htmlUtil.setSelectable(t,false);
			this._mover = this.connect(t, "onmousemove", "_move");
		}
	},
	
	_up: function(/*Event*/ e){
		// summary:
		//		mouseup handler, stop the dragging
		htmlUtil.setSelectable(this.domNode,true);
		domStyle.set(this.domNode, "cursor", "pointer");
		this._mover && this.disconnect(this._mover);
		delete this._mover;
	},
	
	_move: function(/*Event*/ e){
		// summary:
		//		mousemove listener, offset the scroll amount by the delta
		//		since our last call.
		
		var mod = this.invert ? 1 : -1;
		this.domNode.scrollTop += (this._y - e.pageY) * mod;
		this.domNode.scrollLeft += (this._x - e.pageX) * mod;
		this._x = e.pageX;
		this._y = e.pageY;
		
	}
	
});
});

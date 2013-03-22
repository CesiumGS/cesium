define([
	"dojo/_base/declare", // declare
	"dojo/mouse",
	"dojo/on",
	"dojo/touch",
	"./_ListBase"
], function(declare, mouse, on, touch, _ListBase){

// module:
//		dijit/form/_ListMouseMixin

return declare( "dijit.form._ListMouseMixin", _ListBase, {
	// summary:
	//		a Mixin to handle mouse or touch events for a focus-less menu
	//		Abstract methods that must be defined externally:
	//
	//		- onClick: item was chosen (mousedown somewhere on the menu and mouseup somewhere on the menu)
	// tags:
	//		private

	postCreate: function(){
		this.inherited(arguments);

		this.own(on(this.domNode, touch.press, function(evt){ evt.preventDefault(); })); // prevent focus shift on list scrollbar press

		this._listConnect(touch.press, "_onMouseDown");
		this._listConnect(touch.release, "_onMouseUp");
		this._listConnect(mouse.enter, "_onMouseOver");
		this._listConnect(mouse.leave, "_onMouseOut");
	},

	_onMouseDown: function(/*Event*/ evt, /*DomNode*/ target){
		if(this._hoveredNode){
			this.onUnhover(this._hoveredNode);
			this._hoveredNode = null;
		}
		this._isDragging = true;
		this._setSelectedAttr(target);
	},

	_onMouseUp: function(/*Event*/ evt, /*DomNode*/ target){
		this._isDragging = false;
		var selectedNode = this.selected;
		var hoveredNode = this._hoveredNode;
		if(selectedNode && target == selectedNode){
			this.onClick(selectedNode);
		}else if(hoveredNode && target == hoveredNode){ // drag to select
			this._setSelectedAttr(hoveredNode);
			this.onClick(hoveredNode);
		}
	},

	_onMouseOut: function(/*Event*/ evt, /*DomNode*/ target){
		if(this._hoveredNode){
			this.onUnhover(this._hoveredNode);
			this._hoveredNode = null;
		}
		if(this._isDragging){
			this._cancelDrag = (new Date()).getTime() + 1000; // cancel in 1 second if no _onMouseOver fires
		}
	},

	_onMouseOver: function(/*Event*/ evt, /*DomNode*/ target){
		if(this._cancelDrag){
			var time = (new Date()).getTime();
			if(time > this._cancelDrag){
				this._isDragging = false;
			}
			this._cancelDrag = null;
		}
		this._hoveredNode = target;
		this.onHover(target);
		if(this._isDragging){
			this._setSelectedAttr(target);
		}
	}
});

});

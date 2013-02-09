define([
	"dojo/_base/declare",	// declare
	"dojo/on",
	"dojo/window" // winUtils.scrollIntoView
], function(declare, on, winUtils){

// module:
//		dijit/form/_ListBase

return declare( "dijit.form._ListBase", null, {
	// summary:
	//		Focus-less menu to handle UI events consistently
	//		Abstract methods that must be defined externally:
	//
	//		- onSelect: item is active (mousedown but not yet mouseup, or keyboard arrow selected but no Enter)
	//		- onDeselect:  cancels onSelect
	// tags:
	//		private

	// selected: DOMNode
	//		currently selected node
	selected: null,

	_listConnect: function(/*String|Function*/ eventType, /*String*/ callbackFuncName){
		// summary:
		//		Connects 'containerNode' to specified method of this object
		//		and automatically registers for 'disconnect' on widget destroy.
		// description:
		//		Provide widget-specific analog to 'connect'.
		//		The callback function is called with the normal event object,
		//		but also a second parameter is passed that indicates which list item
		//		actually received the event.
		// returns:
		//		A handle that can be passed to `disconnect` in order to disconnect
		//		before the widget is destroyed.
		// tags:
		//		private

		var self = this;
		return self.own(on(self.containerNode,
			on.selector(
				function(eventTarget, selector, target){
					return eventTarget.parentNode == target;
				},
				eventType
			),
			function(evt){
				evt.preventDefault();
				self[callbackFuncName](evt, this);
			}
		));
	},

	selectFirstNode: function(){
		// summary:
		//		Select the first displayed item in the list.
		var first = this.containerNode.firstChild;
		while(first && first.style.display == "none"){
			first = first.nextSibling;
		}
		this._setSelectedAttr(first);
	},

	selectLastNode: function(){
		// summary:
		//		Select the last displayed item in the list
		var last = this.containerNode.lastChild;
		while(last && last.style.display == "none"){
			last = last.previousSibling;
		}
		this._setSelectedAttr(last);
	},

	selectNextNode: function(){
		// summary:
		//		Select the item just below the current selection.
		//		If nothing selected, select first node.
		var selectedNode = this.selected;
		if(!selectedNode){
			this.selectFirstNode();
		}else{
			var next = selectedNode.nextSibling;
			while(next && next.style.display == "none"){
				next = next.nextSibling;
			}
			if(!next){
				this.selectFirstNode();
			}else{
				this._setSelectedAttr(next);
			}
		}
	},

	selectPreviousNode: function(){
		// summary:
		//		Select the item just above the current selection.
		//		If nothing selected, select last node (if
		//		you select Previous and try to keep scrolling up the list).
		var selectedNode = this.selected;
		if(!selectedNode){
			this.selectLastNode();
		}else{
			var prev = selectedNode.previousSibling;
			while(prev && prev.style.display == "none"){
				prev = prev.previousSibling;
			}
			if(!prev){
				this.selectLastNode();
			}else{
				this._setSelectedAttr(prev);
			}
		}
	},

	_setSelectedAttr: function(/*DomNode*/ node){
		// summary:
		//		Does the actual select.
		if(this.selected != node){
			var selectedNode = this.selected;
			if(selectedNode){
				this.onDeselect(selectedNode);
				this.selected = null;
			}
			if(node){
				this.selected = node;
				winUtils.scrollIntoView(node);
				this.onSelect(node);
			}
		}else if(node){
			this.onSelect(node);
		}
	}
});

});

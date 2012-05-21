define([
	"dojo/_base/declare",	// declare
	"dojo/window" // winUtils.scrollIntoView
], function(declare, winUtils){

// module:
//		dijit/form/_ListBase
// summary:
//		Focus-less menu to handle UI events consistently

return declare( "dijit.form._ListBase", null, {
	// summary:
	//		Focus-less menu to handle UI events consistently
	//		Abstract methods that must be defined externally:
	//			onSelect: item is active (mousedown but not yet mouseup, or keyboard arrow selected but no Enter)
	//			onDeselect:  cancels onSelect
	// tags:
	//		private

	// selected: DOMnode
	//		currently selected node
	selected: null,

	_getTarget: function(/*Event*/ evt){
		var tgt = evt.target;
		var container = this.containerNode;
		if(tgt == container || tgt == this.domNode){ return null; }
		while(tgt && tgt.parentNode != container){
			// recurse to the top
			tgt = tgt.parentNode;
		}
		return tgt;
	},

	selectFirstNode: function(){
		// summary:
		// 		Select the first displayed item in the list.
		var first = this.containerNode.firstChild;
		while(first && first.style.display == "none"){
			first = first.nextSibling;
		}
		this._setSelectedAttr(first);
	},

	selectLastNode: function(){
		// summary:
		// 		Select the last displayed item in the list
		var last = this.containerNode.lastChild;
		while(last && last.style.display == "none"){
			last = last.previousSibling;
		}
		this._setSelectedAttr(last);
	},

	selectNextNode: function(){
		// summary:
		// 		Select the item just below the current selection.
		// 		If nothing selected, select first node.
		var selectedNode = this._getSelectedAttr();
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
		// 		Select the item just above the current selection.
		// 		If nothing selected, select last node (if
		// 		you select Previous and try to keep scrolling up the list).
		var selectedNode = this._getSelectedAttr();
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
			var selectedNode = this._getSelectedAttr();
			if(selectedNode){
				this.onDeselect(selectedNode);
				this.selected = null;
			}
			if(node && node.parentNode == this.containerNode){
				this.selected = node;
				winUtils.scrollIntoView(node);
				this.onSelect(node);
			}
		}else if(node){
			this.onSelect(node);
		}
	},

	_getSelectedAttr: function(){
		// summary:
		//		Returns the selected node.
		var v = this.selected;
		return (v && v.parentNode == this.containerNode) ? v : (this.selected = null);
	}
});

});

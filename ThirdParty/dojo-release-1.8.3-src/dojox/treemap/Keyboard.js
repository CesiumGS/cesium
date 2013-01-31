define(["dojo/_base/array", "dojo/_base/lang", "dojo/_base/event", "dojo/_base/declare", "dojo/on", "dojo/keys", "dojo/dom-attr",
	"./_utils", "dijit/_FocusMixin"],
	function(arr, lang, event, declare, on, keys, domAttr, utils, _FocusMixin){

	return declare("dojox.treemap.Keyboard", _FocusMixin, {
		// summary:
		//		Specializes TreeMap to support keyboard navigation and accessibility.
		
		// tabIndex: String
		//		Order fields are traversed when user hits the tab key
		tabIndex: "0",
		_setTabIndexAttr: "domNode",
			
		constructor: function(){
		},
		
		postCreate: function(){
			this.inherited(arguments);
			this._keyDownHandle = on(this.domNode, "keydown", lang.hitch(this, this._onKeyDown));
			this._mouseDownHandle = on(this.domNode, "mousedown", lang.hitch(this, this._onMouseDown));
		},
		
		destroy: function(){
			this.inherited(arguments);
			this._keyDownHandle.remove();
			this._mouseDownHandle.remove();
		},

		createRenderer: function(item, level, kind){
			var renderer = this.inherited(arguments);
			// on Firefox we need a tabindex on sub divs to let the keyboard event be dispatched
			// put -1 so that it is not tablable
			domAttr.set(renderer, "tabindex", "-1");
			return renderer;
		},
		
		_onMouseDown: function(e){
			this.domNode.focus();
		},
	
		_onKeyDown: function(e){
			var selected = this.get("selectedItem");
			if(!selected){
				// nothing selected selected we can't navigate
				return;
			}
			var renderer = this.itemToRenderer[this.getIdentity(selected)];
			var parent = renderer.parentItem;
			var children, childrenI, selectedI;
			// we also need items to be sorted out
			if(e.keyCode != keys.UP_ARROW && e.keyCode != keys.NUMPAD_MINUS &&
				e.keyCode != keys.NUMPAD_PLUS){
				children = (e.keyCode == keys.DOWN_ARROW)?selected.children:parent.children;
				if(children){
					childrenI = utils.initElements(children, lang.hitch(this,
						this._computeAreaForItem)).elements;
					selectedI = childrenI[arr.indexOf(children, selected)];
					childrenI.sort(function(a, b){
						return b.size - a.size;
					});
				}else{
					return;
				}
			}
			var newSelected;
			switch(e.keyCode){
				case keys.LEFT_ARROW:
				newSelected = children[childrenI[Math.max(0, arr.indexOf(childrenI, selectedI)-1)].index];				
				break;
				case keys.RIGHT_ARROW:
				newSelected = children[childrenI[Math.min(childrenI.length-1, arr.indexOf(childrenI, selectedI)+1)].index];								
				break;
				case keys.DOWN_ARROW:
				newSelected = children[childrenI[0].index];
				break;
				case keys.UP_ARROW:
				newSelected = parent;
				break;
				// TODO
				//case "+":
				case keys.NUMPAD_PLUS:
				if(!this._isLeaf(selected) && this.drillDown){
					this.drillDown(renderer);
					event.stop(e);
				}
				break;
				// TODO
				//case "-":
				case keys.NUMPAD_MINUS:
				if(!this._isLeaf(selected) && this.drillUp){
					this.drillUp(renderer);
					event.stop(e);
				}
				break;
			}
			if(newSelected){
				if(!this._isRoot(newSelected)){
					this.set("selectedItem", newSelected);
					event.stop(e);
				}
			}
		}
	});
});
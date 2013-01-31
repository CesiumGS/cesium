define([
"dojo/_base/declare", 
"dojo/_base/lang", 
"dojo/_base/event", 
"dojo/_base/window", 
"dojo/on", 
"dojo/dom-class", 
"dojo/dom-style",
"dijit/_WidgetBase", 
"dijit/_TemplatedMixin", 
"dojo/text!./templates/ExpandRenderer.html"],
	 
function(
declare, 
lang, 
event, 
win, 
on, 
domClass, 
domStyle, 
_WidgetBase, 
_TemplatedMixin, 
template){
	
	return declare("dojox.calendar.ExpandRenderer", [_WidgetBase, _TemplatedMixin], {
		
		// summary:
		//		The default renderer display in MatrixView cells where some item renderers cannot be displayed because of size constraints.
		
		templateString: template,
		
		baseClass: "dojoxCalendarExpand",
		
		// owner: dojox/calendar/_ViewBase
		//		The view that contains this renderer.
		owner: null,

		// focused: Boolean
		//		Indicates that the renderer is focused.
		focused: false,

		// up: Boolean
		//		Indicates that the mouse cursor is over renderer.
		up: false,

		// down: Boolean
		//		Indicates that the renderer is pressed.
		down: false,

		// date: Date
		//		The date displayed by the cell where this renderer is used.
		date: null,

		// items: Object[]
		//		List of items that are not displayed in the cell because of the size constraints.
		items: null,
		
		// rowIndex: Integer
		//		Row index where this renderer is used.
		rowIndex: -1,
		
		// columnIndex: Integer
		//		Column index where this renderer is used.
		columnIndex: -1,
		
		_setExpandedAttr: function(value){
			domStyle.set(this.expand, "display", value ? "none" : "inline-block");
			domStyle.set(this.collapse, "display", value ? "inline-block" : "none"); 
			this._set("expanded", value);
		},

		_setDownAttr: function(value){
			this._setState("down", value, "Down");
		},

		_setUpAttr: function(value){
			this._setState("up", value, "Up");
		},

		_setFocusedAttr: function(value){
			this._setState("focused", value, "Focused");
		},

		_setState: function(prop, value, cssClass){
			if (this[prop] != value){
				var tn = this.stateNode || this.domNode;
				domClass[value ? "add" : "remove"](tn, cssClass);
				this._set(prop, value);
			}	
		},

		_onClick: function(e){
			// tags:
			//		private

			if(this.owner && this.owner.expandRendererClickHandler){
				this.owner.expandRendererClickHandler(e, this);
			}
		},

		_onMouseDown: function(e){
			// tags:
			//		private

			event.stop(e);
			this.set("down", true);
		},

		_onMouseUp: function(e){
			// tags:
			//		private

			this.set("down", false);
		},

		_onMouseOver: function(e){
			// tags:
			//		private

			if(!this.up){
				var buttonDown = e.button == 1;
				this.set("up", !buttonDown);
				this.set("down", buttonDown);
			}
		},

		_onMouseOut: function(e){
			// tags:
			//		private

			var node = e.relatedTarget;
			while(node != e.currentTarget && node != win.doc.body && node != null){
				node = node.parentNode;
			}
			if(node == e.currentTarget){
				return;
			}
			this.set("up", false);
			this.set("down", false);
		}

	});

});

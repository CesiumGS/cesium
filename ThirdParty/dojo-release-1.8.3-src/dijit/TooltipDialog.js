define([
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.replace
	"dojo/_base/event", // event.stop
	"dojo/keys", // keys
	"dojo/_base/lang", // lang.hitch
	"./focus",
	"./layout/ContentPane",
	"./_DialogMixin",
	"./form/_FormMixin",
	"./_TemplatedMixin",
	"dojo/text!./templates/TooltipDialog.html",
	"./main"		// exports methods to dijit global
], function(declare, domClass, event, keys, lang,
			focus, ContentPane, _DialogMixin, _FormMixin, _TemplatedMixin, template, dijit){

	// module:
	//		dijit/TooltipDialog


	return declare("dijit.TooltipDialog",
		[ContentPane, _TemplatedMixin, _FormMixin, _DialogMixin], {
		// summary:
		//		Pops up a dialog that appears like a Tooltip

		// title: String
		//		Description of tooltip dialog (required for a11y)
		title: "",

		// doLayout: [protected] Boolean
		//		Don't change this parameter from the default value.
		//		This ContentPane parameter doesn't make sense for TooltipDialog, since TooltipDialog
		//		is never a child of a layout container, nor can you specify the size of
		//		TooltipDialog in order to control the size of an inner widget.
		doLayout: false,

		// autofocus: Boolean
		//		A Toggle to modify the default focus behavior of a Dialog, which
		//		is to focus on the first dialog element after opening the dialog.
		//		False will disable autofocusing.  Default: true.
		autofocus: true,

		// baseClass: [protected] String
		//		The root className to use for the various states of this widget
		baseClass: "dijitTooltipDialog",

		// _firstFocusItem: [private readonly] DomNode
		//		The pointer to the first focusable node in the dialog.
		//		Set by `dijit/_DialogMixin._getFocusItems()`.
		_firstFocusItem: null,

		// _lastFocusItem: [private readonly] DomNode
		//		The pointer to which node has focus prior to our dialog.
		//		Set by `dijit/_DialogMixin._getFocusItems()`.
		_lastFocusItem: null,

		templateString: template,

		_setTitleAttr: function(/*String*/ title){
			this.containerNode.title = title;
			this._set("title", title);
		},

		postCreate: function(){
			this.inherited(arguments);
			this.connect(this.containerNode, "onkeypress", "_onKey");
		},

		orient: function(/*DomNode*/ node, /*String*/ aroundCorner, /*String*/ tooltipCorner){
			// summary:
			//		Configure widget to be displayed in given position relative to the button.
			//		This is called from the dijit.popup code, and should not be called
			//		directly.
			// tags:
			//		protected

			// Note: intentionally not using dijitTooltip class since that sets position:absolute, which
			// confuses dijit/popup trying to get the size of the tooltip.
			var newC = {
				"MR-ML": "dijitTooltipRight",
				"ML-MR": "dijitTooltipLeft",
				"TM-BM": "dijitTooltipAbove",
				"BM-TM": "dijitTooltipBelow",
				"BL-TL": "dijitTooltipBelow dijitTooltipABLeft",
				"TL-BL": "dijitTooltipAbove dijitTooltipABLeft",
				"BR-TR": "dijitTooltipBelow dijitTooltipABRight",
				"TR-BR": "dijitTooltipAbove dijitTooltipABRight",
				"BR-BL": "dijitTooltipRight",
				"BL-BR": "dijitTooltipLeft"
			}[aroundCorner + "-" + tooltipCorner];

			domClass.replace(this.domNode, newC, this._currentOrientClass || "");
			this._currentOrientClass = newC;

			// Tooltip.orient() has code to reposition connector for when Tooltip is before/after anchor.
			// Not putting here to avoid code bloat, and since TooltipDialogs are generally above/below.
			// Should combine code from Tooltip and TooltipDialog.
		},

		focus: function(){
			// summary:
			//		Focus on first field
			this._getFocusItems(this.containerNode);
			focus.focus(this._firstFocusItem);
		},

		onOpen: function(/*Object*/ pos){
			// summary:
			//		Called when dialog is displayed.
			//		This is called from the dijit.popup code, and should not be called directly.
			// tags:
			//		protected

			this.orient(this.domNode,pos.aroundCorner, pos.corner);

			// Position the tooltip connector for middle alignment.
			// This could not have been done in orient() since the tooltip wasn't positioned at that time.
			var aroundNodeCoords = pos.aroundNodePos;
			if(pos.corner.charAt(0) == 'M' && pos.aroundCorner.charAt(0) == 'M'){
				this.connectorNode.style.top = aroundNodeCoords.y + ((aroundNodeCoords.h - this.connectorNode.offsetHeight) >> 1) - pos.y + "px";
				this.connectorNode.style.left = "";
			}else if(pos.corner.charAt(1) == 'M' && pos.aroundCorner.charAt(1) == 'M'){
				this.connectorNode.style.left = aroundNodeCoords.x + ((aroundNodeCoords.w - this.connectorNode.offsetWidth) >> 1) - pos.x + "px";
			}

			this._onShow(); // lazy load trigger  (TODO: shouldn't we load before positioning?)
		},

		onClose: function(){
			// summary:
			//		Called when dialog is hidden.
			//		This is called from the dijit.popup code, and should not be called directly.
			// tags:
			//		protected
			this.onHide();
		},

		_onKey: function(/*Event*/ evt){
			// summary:
			//		Handler for keyboard events
			// description:
			//		Keep keyboard focus in dialog; close dialog on escape key
			// tags:
			//		private

			var node = evt.target;
			if(evt.charOrCode === keys.TAB){
				this._getFocusItems(this.containerNode);
			}
			var singleFocusItem = (this._firstFocusItem == this._lastFocusItem);
			if(evt.charOrCode == keys.ESCAPE){
				// Use defer to avoid crash on IE, see #10396.
				this.defer("onCancel");
				event.stop(evt);
			}else if(node == this._firstFocusItem && evt.shiftKey && evt.charOrCode === keys.TAB){
				if(!singleFocusItem){
					focus.focus(this._lastFocusItem); // send focus to last item in dialog
				}
				event.stop(evt);
			}else if(node == this._lastFocusItem && evt.charOrCode === keys.TAB && !evt.shiftKey){
				if(!singleFocusItem){
					focus.focus(this._firstFocusItem); // send focus to first item in dialog
				}
				event.stop(evt);
			}else if(evt.charOrCode === keys.TAB){
				// we want the browser's default tab handling to move focus
				// but we don't want the tab to propagate upwards
				evt.stopPropagation();
			}
		}
	});
});

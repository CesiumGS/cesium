define([
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.replace
	"dojo/has",
	"dojo/keys", // keys
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"./focus",
	"./layout/ContentPane",
	"./_DialogMixin",
	"./form/_FormMixin",
	"./_TemplatedMixin",
	"dojo/text!./templates/TooltipDialog.html",
	"./main"        // exports methods to dijit global
], function(declare, domClass, has, keys, lang, on, focus, ContentPane, _DialogMixin, _FormMixin, _TemplatedMixin, template, dijit){

	// module:
	//		dijit/TooltipDialog


	var TooltipDialog = declare("dijit.TooltipDialog",
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

			_setTitleAttr: "containerNode",

			postCreate: function(){
				this.inherited(arguments);
				this.own(on(this.domNode, "keydown", lang.hitch(this, "_onKey")));
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
					// Real around node
					"MR-ML": "dijitTooltipRight",
					"ML-MR": "dijitTooltipLeft",
					"TM-BM": "dijitTooltipAbove",
					"BM-TM": "dijitTooltipBelow",
					"BL-TL": "dijitTooltipBelow dijitTooltipABLeft",
					"TL-BL": "dijitTooltipAbove dijitTooltipABLeft",
					"BR-TR": "dijitTooltipBelow dijitTooltipABRight",
					"TR-BR": "dijitTooltipAbove dijitTooltipABRight",
					"BR-BL": "dijitTooltipRight",
					"BL-BR": "dijitTooltipLeft",

					// Positioning "around" a point, ex: mouse position
					"BR-TL": "dijitTooltipBelow dijitTooltipABLeft",
					"BL-TR": "dijitTooltipBelow dijitTooltipABRight",
					"TL-BR": "dijitTooltipAbove dijitTooltipABRight",
					"TR-BL": "dijitTooltipAbove dijitTooltipABLeft"
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
				this._getFocusItems();
				focus.focus(this._firstFocusItem);
			},

			onOpen: function(/*Object*/ pos){
				// summary:
				//		Called when dialog is displayed.
				//		This is called from the dijit.popup code, and should not be called directly.
				// tags:
				//		protected

				this.orient(this.domNode, pos.aroundCorner, pos.corner);

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
				//		Handler for keydown events
				// description:
				//		Keep keyboard focus in dialog; close dialog on escape key
				// tags:
				//		private

				if(evt.keyCode == keys.ESCAPE){
					// Use defer to avoid crash on IE, see #10396.  Not sure if this is still needed or not.
					// If this if() wasn't here, presumably dijit/popup would catch the ESCAPE key and close the popup.
					this.defer("onCancel");
					evt.stopPropagation();
					evt.preventDefault();
				}else if(evt.keyCode == keys.TAB){
					var node = evt.target;
					this._getFocusItems();
					if(this._firstFocusItem == this._lastFocusItem){
						evt.stopPropagation();
						evt.preventDefault();
					}else if(node == this._firstFocusItem && evt.shiftKey){
						focus.focus(this._lastFocusItem); // send focus to last item in dialog
						evt.stopPropagation();
						evt.preventDefault();
					}else if(node == this._lastFocusItem && !evt.shiftKey){
						focus.focus(this._firstFocusItem); // send focus to first item in dialog
						evt.stopPropagation();
						evt.preventDefault();
					}else{
						// we want the browser's default tab handling to move focus
						// but we don't want the tab to propagate upwards
						evt.stopPropagation();
					}
				}
			}
		});

	if(has("dojo-bidi")){
		TooltipDialog.extend({
			_setTitleAttr: function(/*String*/ title){
				this.containerNode.title = (this.textDir && this.enforceTextDirWithUcc) ? this.enforceTextDirWithUcc(null, title) : title;
				this._set("title", title);
			},

			_setTextDirAttr: function(/*String*/ textDir){
				if(!this._created || this.textDir != textDir){
					this._set("textDir", textDir);
					if(this.textDir && this.title){
						this.containerNode.title = this.enforceTextDirWithUcc(null, this.title);
					}
				}
			}
		});
	}

	return TooltipDialog;
});

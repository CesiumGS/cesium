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
	"."		// exports methods to dijit global
], function(declare, domClass, event, keys, lang,
			focus, ContentPane, _DialogMixin, _FormMixin, _TemplatedMixin, template, dijit){

/*=====
	var ContentPane = dijit.layout.ContentPane;
	var _DialogMixin = dijit._DialogMixin;
	var _FormMixin = dijit.form._FormMixin;
	var _TemplatedMixin = dijit._TemplatedMixin;
=====*/

	// module:
	//		dijit/TooltipDialog
	// summary:
	//		Pops up a dialog that appears like a Tooltip


	return declare("dijit.TooltipDialog",
		[ContentPane, _TemplatedMixin, _FormMixin, _DialogMixin], {
		// summary:
		//		Pops up a dialog that appears like a Tooltip

		// title: String
		// 		Description of tooltip dialog (required for a11y)
		title: "",

		// doLayout: [protected] Boolean
		//		Don't change this parameter from the default value.
		//		This ContentPane parameter doesn't make sense for TooltipDialog, since TooltipDialog
		//		is never a child of a layout container, nor can you specify the size of
		//		TooltipDialog in order to control the size of an inner widget.
		doLayout: false,

		// autofocus: Boolean
		// 		A Toggle to modify the default focus behavior of a Dialog, which
		// 		is to focus on the first dialog element after opening the dialog.
		//		False will disable autofocusing. Default: true
		autofocus: true,

		// baseClass: [protected] String
		//		The root className to use for the various states of this widget
		baseClass: "dijitTooltipDialog",

		// _firstFocusItem: [private] [readonly] DomNode
		//		The pointer to the first focusable node in the dialog.
		//		Set by `dijit._DialogMixin._getFocusItems`.
		_firstFocusItem: null,

		// _lastFocusItem: [private] [readonly] DomNode
		//		The pointer to which node has focus prior to our dialog.
		//		Set by `dijit._DialogMixin._getFocusItems`.
		_lastFocusItem: null,

		templateString: template,

		_setTitleAttr: function(/*String*/ title){
			this.containerNode.title = title;
			this._set("title", title)
		},

		postCreate: function(){
			this.inherited(arguments);
			this.connect(this.containerNode, "onkeypress", "_onKey");
		},

		orient: function(/*DomNode*/ node, /*String*/ aroundCorner, /*String*/ corner){
			// summary:
			//		Configure widget to be displayed in given position relative to the button.
			//		This is called from the dijit.popup code, and should not be called
			//		directly.
			// tags:
			//		protected
			var newC = "dijitTooltipAB" + (corner.charAt(1) == 'L' ? "Left" : "Right")
					+ " dijitTooltip"
					+ (corner.charAt(0) == 'T' ? "Below" : "Above");

			domClass.replace(this.domNode, newC, this._currentOrientClass || "");
			this._currentOrientClass = newC;
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
			this._onShow(); // lazy load trigger
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
				// Use setTimeout to avoid crash on IE, see #10396.
				setTimeout(lang.hitch(this, "onCancel"), 0);
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

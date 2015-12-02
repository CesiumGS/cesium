define([
	"dojo/_base/declare", // declare
	"dojo/dom-style", // domStyle.set
	"dojo/_base/lang",
	"dojo/query", // query
	"./popup",
	"./registry",	// registry.byNode
	"./MenuItem",
	"./hccss"
], function(declare, domStyle, lang, query, pm, registry, MenuItem){

	// module:
	//		dijit/PopupMenuItem

	return declare("dijit.PopupMenuItem", MenuItem, {
		// summary:
		//		An item in a Menu that spawn a drop down (usually a drop down menu)

		baseClass: "dijitMenuItem dijitPopupMenuItem",

		_fillContent: function(){
			// summary:
			//		When Menu is declared in markup, this code gets the menu label and
			//		the popup widget from the srcNodeRef.
			// description:
			//		srcNodeRef.innerHTML contains both the menu item text and a popup widget
			//		The first part holds the menu item text and the second part is the popup
			// example:
			// |	<div data-dojo-type="dijit/PopupMenuItem">
			// |		<span>pick me</span>
			// |		<popup> ... </popup>
			// |	</div>
			// tags:
			//		protected

			if(this.srcNodeRef){
				var nodes = query("*", this.srcNodeRef);
				this.inherited(arguments, [nodes[0]]);

				// save pointer to srcNode so we can grab the drop down widget after it's instantiated
				this.dropDownContainer = this.srcNodeRef;
			}
		},

		_openPopup: function(/*Object*/ params, /*Boolean*/ focus){
			// summary:
			//		Open the popup to the side of/underneath this MenuItem, and optionally focus first item
			// tags:
			//		protected

			var popup = this.popup;

			pm.open(lang.delegate(params, {
				popup: this.popup,
				around: this.domNode
			}));

			if(focus && popup.focus){
				popup.focus();
			}
		},

		_closePopup: function(){
			pm.close(this.popup);
			this.popup.parentMenu = null;
		},

		startup: function(){
			if(this._started){ return; }
			this.inherited(arguments);

			// We didn't copy the dropdown widget from the this.srcNodeRef, so it's in no-man's
			// land now.  Move it to <body>.
			if(!this.popup){
				var node = query("[widgetId]", this.dropDownContainer)[0];
				this.popup = registry.byNode(node);
			}
			this.ownerDocumentBody.appendChild(this.popup.domNode);
			this.popup.domNode.setAttribute("aria-labelledby", this.containerNode.id);
			this.popup.startup();

			this.popup.domNode.style.display="none";
			if(this.arrowWrapper){
				domStyle.set(this.arrowWrapper, "visibility", "");
			}
			this.focusNode.setAttribute("aria-haspopup", "true");
		},

		destroyDescendants: function(/*Boolean*/ preserveDom){
			if(this.popup){
				// Destroy the popup, unless it's already been destroyed.  This can happen because
				// the popup is a direct child of <body> even though it's logically my child.
				if(!this.popup._destroyed){
					this.popup.destroyRecursive(preserveDom);
				}
				delete this.popup;
			}
			this.inherited(arguments);
		}
	});
});

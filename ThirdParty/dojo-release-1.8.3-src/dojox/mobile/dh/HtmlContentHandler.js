define([
	"dojo/_base/kernel",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/Deferred",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dijit/registry",
	"../lazyLoadUtils"
], function(dojo, array, declare, Deferred, domClass, domConstruct, registry, lazyLoadUtils){

	// module:
	//		dojox/mobile/dh/HtmlContentHandler

	return declare("dojox.mobile.dh.HtmlContentHandler", null, {
		// summary:
		//		A HTML content handler.
		// description:
		//		This module is a content handler that creates a view from HTML
		//		data. If widgets used in the HTML data are not available, they
		//		are loaded automatically before instantiation.

		parse: function(/*String*/ content, /*DomNode*/ target, /*DomNode?*/ refNode){
			// summary:
			//		Parses the given data and creates a new view at the given position.
			// content:
			//		Content data for a new view.
			// target:
			//		A DOM node under which a new view is created.
			// refNode:
			//		An optional reference DOM node before which a new view is created.
			if(this.execScript){
				content = this.execScript(content);
			}
			var container = domConstruct.create("div", {
				innerHTML: content,
				style: {visibility: "hidden"}
			});
			target.insertBefore(container, refNode);

			return Deferred.when(lazyLoadUtils.instantiateLazyWidgets(container), function(){
				// allows multiple root nodes in the fragment,
				// but transition will be performed to the 1st view.
				var view;
				for(i = 0, len = container.childNodes.length; i < len; i++){
					var n = container.firstChild;
					if(!view && n.nodeType === 1){
						view = registry.byNode(n);
					}
					target.insertBefore(container.firstChild, refNode); // reparent
				}
				target.removeChild(container);
				if(!view || !domClass.contains(view.domNode, "mblView")){
					console.log("HtmlContentHandler.parse: invalid view content");
					return null;
				}
				return view.id;
			});
		}
	});
});

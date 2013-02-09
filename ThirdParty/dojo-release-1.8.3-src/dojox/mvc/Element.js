define([
	"dojo/_base/declare",
	"dijit/_WidgetBase"
], function(declare, _WidgetBase){
	return declare("dojox.mvc.Element", _WidgetBase, {
		// summary:
		//		A widget implicitly created by dojox/mvc/parserExtension.
		//		Maps "value" attribute to form element value, innerText/innerHTML to element's innerText/innerHTML, and other attributes to DOM attributes.
		//		Also, for form element, updates value (or checked for check box) as user edits.

		_setInnerTextAttr: {node: "domNode", type: "innerText"},
		_setInnerHTMLAttr: {node: "domNode", type: "innerHTML"},

		buildRendering: function(){
			// summary:
			//		Set onchange event handler for form elements.

			this.inherited(arguments);
			if(/select|input|textarea/i.test(this.domNode.tagName)){
				var _self = this, node = this.focusNode = this.domNode;
				this.on("change", function(e){
					var attr = /^checkbox$/i.test(node.getAttribute("type")) ? "checked" : "value";
					_self._set(attr, _self.get(attr));
				});
			}
		},

		_getCheckedAttr: function(){ return this.domNode.checked; },
		_getValueAttr: function(){ return this.domNode.value; }
	});
});

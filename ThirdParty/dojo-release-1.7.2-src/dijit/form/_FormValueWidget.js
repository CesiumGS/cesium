define([
	"dojo/_base/declare", // declare
	"dojo/_base/sniff", // has("ie")
	"./_FormWidget",
	"./_FormValueMixin"
], function(declare, has, _FormWidget, _FormValueMixin){

/*=====
var _FormWidget = dijit.form._FormWidget;
var _FormValueMixin = dijit.form._FormValueMixin;
=====*/

// module:
//		dijit/form/_FormValueWidget
// summary:
//		FormValueWidget


return declare("dijit.form._FormValueWidget", [_FormWidget, _FormValueMixin],
{
	// summary:
	//		Base class for widgets corresponding to native HTML elements such as <input> or <select> that have user changeable values.
	// description:
	//		Each _FormValueWidget represents a single input value, and has a (possibly hidden) <input> element,
	//		to which it serializes it's input value, so that form submission (either normal submission or via FormBind?)
	//		works as expected.

	// Don't attempt to mixin the 'type', 'name' attributes here programatically -- they must be declared
	// directly in the template as read by the parser in order to function. IE is known to specifically
	// require the 'name' attribute at element creation time.  See #8484, #8660.

	_layoutHackIE7: function(){
		// summary:
		//		Work around table sizing bugs on IE7 by forcing redraw

		if(has("ie") == 7){ // fix IE7 layout bug when the widget is scrolled out of sight
			var domNode = this.domNode;
			var parent = domNode.parentNode;
			var pingNode = domNode.firstChild || domNode; // target node most unlikely to have a custom filter
			var origFilter = pingNode.style.filter; // save custom filter, most likely nothing
			var _this = this;
			while(parent && parent.clientHeight == 0){ // search for parents that haven't rendered yet
				(function ping(){
					var disconnectHandle = _this.connect(parent, "onscroll",
						function(){
							_this.disconnect(disconnectHandle); // only call once
							pingNode.style.filter = (new Date()).getMilliseconds(); // set to anything that's unique
							setTimeout(function(){ pingNode.style.filter = origFilter }, 0); // restore custom filter, if any
						}
					);
				})();
				parent = parent.parentNode;
			}
		}
	}
});

});

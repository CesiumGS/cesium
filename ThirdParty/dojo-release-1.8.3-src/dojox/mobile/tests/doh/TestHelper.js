define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/dom-class",
	"dijit/registry",
	"doh/runner"
], function(declare, lang, has, domClass, registry, runner){

	// module:
	//		dojox/mobile/tests/doh/TestHelper
	// summary:
	//		A DOH test Helper class

	var TestHelper = new function(){

		this.fireOnClick = function(obj){
			var node;
			if(typeof obj === "string"){
				var widget = registry.byId(obj);
				node = widget.domNode;
			}else{
				node = obj;
			}
			this.fireOnEvent(node, "mousedown");
			this.fireOnEvent(node, "mouseup");
		};

		this.fireOnEvent = function(node, evstr){
			if(has("ie")<9){
				node.fireEvent( "on" + evstr );
			}else{
				var e = document.createEvent('Events');
				e.initEvent(evstr, true, true);
				node.dispatchEvent(e);
			}
		};
		this.verifyImageSrc = function(node, regExp, hintPrefix, hintSuffix) {
			hintPrefix = hintPrefix || "";
			hintSuffix = hintSuffix || "";
			if(!has("ie") && regExp && node){
				doh.assertTrue(node.src.search(regExp) != -1, hintPrefix + "search " + regExp.toString() + hintSuffix);
			}
		};
	};
	return TestHelper;
});

define(["dojo/has", "./_WidgetBase", "./_BidiMixin"], function(has, _WidgetBase, _BidiMixin){

	// module:
	//		dijit/_BidiSupport

	/*=====
	return function(){
		// summary:
		//		Deprecated module for enabling textdir support in the dijit widgets.   New code should just define
		//		has("dojo-bidi") to return true, rather than manually requiring this module.
	};
	=====*/

	_WidgetBase.extend(_BidiMixin);

	// Back-compat with version 1.8: just including _BidiSupport should trigger bidi support in all the widgets.
	// Although this statement doesn't do much because the other widgets have likely already been loaded.
	has.add("dojo-bidi", true);

	return _WidgetBase;
});

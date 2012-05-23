define([
	"dojo/_base/lang",
	"dojo/i18n",
	"dijit/_WidgetBase"
], function(lang, di18n, WidgetBase){

/*=====
	var WidgetBase = dijit._WidgetBase;
=====*/

	// module:
	//		dojox/mobile/i18n
	// summary:
	//		An internationalization utility for dojox.mobile-based user
	//		applications.

	var i18n = lang.getObject("dojox.mobile.i18n", true);
/*=====
	var i18n = dojox.mobile.i18n;
=====*/

	i18n.load = function(/*String*/packageName, /*String*/bundleName, /*String?*/locale){
		// summary:
		//		Loads an nls resouce bundle and returns an array of localized
		//		resources.
		return i18n.registerBundle(di18n.getLocalization(packageName, bundleName, locale));
	};

	i18n.registerBundle = function(/*Array*/bundle){
		// summary:
		//		Accumulates the given localized resouces in an array and returns
		//		it.
		if(!i18n.bundle){ i18n.bundle = []; }
		return lang.mixin(i18n.bundle, bundle);
	};

	lang.extend(WidgetBase, {
		mblNoConv: false,
		_cv: function(s){
			if(this.mblNoConv || !i18n.bundle){ return s; }
			return i18n.bundle[lang.trim(s)] || s;
		}
	});

	return i18n;
});

define([
	"dojo/_base/lang",
	"dojo/i18n",
	"dijit/_WidgetBase"
], function(lang, di18n, WidgetBase){

	// module:
	//		dojox/mobile/i18n

	var i18n = {
		// summary:
		//		An internationalization utility for applications based on dojox/mobile.
	};
	lang.setObject("dojox.mobile.i18n", i18n);

	i18n.load = function(/*String*/packageName, /*String*/bundleName, /*String?*/locale){
		// summary:
		//		Loads an nls resource bundle and returns an array of localized
		//		resources.
		return i18n.registerBundle(di18n.getLocalization(packageName, bundleName, locale));
	};

	i18n.registerBundle = function(/*Array*/bundle){
		// summary:
		//		Accumulates the given localized resources in an array and returns
		//		it.
		if(!i18n.bundle){ i18n.bundle = []; }
		return lang.mixin(i18n.bundle, bundle);
	};

	i18n.I18NProperties = {
		// summary:
		//		These properties can be specified for any widget once the dojox/mobile/i18n module is loaded.

		// mblNoConv: Boolean
		//		Disables localization by dojox/mobile/i18n for the widget on which the property is set.
		mblNoConv: false
	};

	// Since any widget can have properties localized by dojox/mobile/i18n, mix I18NProperties
	// into the base widget class.  (This is a hack, but it's effective.)
	// This is for the benefit of the parser.   Remove for 2.0.  Also, hide from doc viewer.
	lang.extend(WidgetBase, /*===== {} || =====*/ i18n.I18NProperties);

	// Mixin the _cv method which is called by property setters.
	lang.extend(WidgetBase, {
		_cv: function(s){
			if(this.mblNoConv || !i18n.bundle){ return s; }
			return i18n.bundle[lang.trim(s)] || s;
		}
	});

	return i18n;
});

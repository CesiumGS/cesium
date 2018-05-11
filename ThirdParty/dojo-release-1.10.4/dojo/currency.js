define([
	"./_base/array",
	"./_base/lang",
	/*===== "./_base/declare", =====*/
	"./number",
	"./i18n", "./i18n!./cldr/nls/currency",
	"./cldr/monetary"
], function(darray, lang, /*===== declare, =====*/ dnumber, i18n, nlsCurrency, cldrMonetary){

// module:
//		dojo/currency

var currency = {
	// summary:
	//		localized formatting and parsing routines for currencies
	// description:
	//		extends dojo.number to provide culturally-appropriate formatting of values
	//		in various world currencies, including use of a currency symbol.  The currencies are specified
	//		by a three-letter international symbol in all uppercase, and support for the currencies is
	//		provided by the data in `dojo.cldr`.  The scripts generating dojo.cldr specify which
	//		currency support is included.  A fixed number of decimal places is determined based
	//		on the currency type and is not determined by the 'pattern' argument.  The fractional
	//		portion is optional, by default, and variable length decimals are not supported.
};
lang.setObject("dojo.currency", currency);

currency._mixInDefaults = function(options){
	options = options || {};
	options.type = "currency";

	// Get locale-dependent currency data, like the symbol
	var bundle = i18n.getLocalization("dojo.cldr", "currency", options.locale) || {};

	// Mixin locale-independent currency data, like # of places
	var iso = options.currency;
	var data = cldrMonetary.getData(iso);

	darray.forEach(["displayName","symbol","group","decimal"], function(prop){
		data[prop] = bundle[iso+"_"+prop];
	});

	data.fractional = [true, false];

	// Mixin with provided options
	return lang.mixin(data, options);
};

/*=====
currency.__FormatOptions = declare([dnumber.__FormatOptions], {
	// type: String?
	//		Should not be set.  Value is assumed to be "currency".
	// symbol: String?
	//		localized currency symbol. The default will be looked up in table of supported currencies in `dojo.cldr`
	//		A [ISO4217](http://en.wikipedia.org/wiki/ISO_4217) currency code will be used if not found.
	// currency: String?
	//		an [ISO4217](http://en.wikipedia.org/wiki/ISO_4217) currency code, a three letter sequence like "USD".
	//		For use with dojo.currency only.
	// places: Number?
	//		number of decimal places to show.  Default is defined based on which currency is used.
	type: "",
	symbol: "",
	currency: "",
	places: ""
});
=====*/

currency.format = function(/*Number*/ value, /*__FormatOptions?*/ options){
	// summary:
	//		Format a Number as a currency, using locale-specific settings
	//
	// description:
	//		Create a string from a Number using a known, localized pattern.
	//		[Formatting patterns](http://www.unicode.org/reports/tr35/#Number_Elements)
	//		appropriate to the locale are chosen from the [CLDR](http://unicode.org/cldr)
	//		as well as the appropriate symbols and delimiters and number of decimal places.
	//
	// value:
	//		the number to be formatted.

	return dnumber.format(value, currency._mixInDefaults(options));
};

currency.regexp = function(/*dnumber.__RegexpOptions?*/ options){
	//
	// summary:
	//		Builds the regular needed to parse a currency value
	//
	// description:
	//		Returns regular expression with positive and negative match, group and decimal separators
	//		Note: the options.places default, the number of decimal places to accept, is defined by the currency type.
	return dnumber.regexp(currency._mixInDefaults(options)); // String
};

/*=====
var __ParseOptions = currency.__ParseOptions = declare(dnumber.__ParseOptions, {
	// type: String?
	//		Should not be set.  Value is assumed to be currency.
	// currency: String?
	//		an [ISO4217](http://en.wikipedia.org/wiki/ISO_4217) currency code, a three letter sequence like "USD".
	//		For use with dojo.currency only.
	// symbol: String?
	//		localized currency symbol. The default will be looked up in table of supported currencies in `dojo.cldr`
	//		A [ISO4217](http://en.wikipedia.org/wiki/ISO_4217) currency code will be used if not found.
	// places: Number?
	//		fixed number of decimal places to accept.  The default is determined based on which currency is used.
	// fractional: Boolean|Array?
	//		Whether to include the fractional portion, where the number of decimal places are implied by the currency
	//		or explicit 'places' parameter.  The value [true,false] makes the fractional portion optional.
	//		By default for currencies, it the fractional portion is optional.
});
=====*/

currency.parse = function(/*String*/ expression, /*__ParseOptions?*/ options){
	//
	// summary:
	//		Convert a properly formatted currency string to a primitive Number,
	//		using locale-specific settings.
	// description:
	//		Create a Number from a string using a known, localized pattern.
	//		[Formatting patterns](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
	//		are chosen appropriate to the locale, as well as the appropriate symbols and delimiters
	//		and number of decimal places.
	// expression:
	//		A string representation of a currency value

	return dnumber.parse(expression, currency._mixInDefaults(options));
};

return currency;
});

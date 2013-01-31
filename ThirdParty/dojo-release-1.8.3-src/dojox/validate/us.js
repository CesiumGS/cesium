define(["dojo/_base/lang", "./_base", "./regexp"], 
 function(lang, validate, xregexp){

var us = lang.getObject("us", true, validate);
us.isState = function(value, flags){
	// summary:
	//		Validates US state and territory abbreviations.
	// value: String
	//		A two character string
	// flags: Object?
	//		- flags.allowTerritories  Allow Guam, Puerto Rico, etc.  Default is true.
	//		- flags.allowMilitary  Allow military 'states', e.g. Armed Forces Europe (AE).  Default is true.

	var re = new RegExp("^" + xregexp.us.state(flags) + "$", "i");
	return re.test(value); // Boolean
};

us.isPhoneNumber = function(/*String*/value){
	// summary:
	//		Validates 10 US digit phone number for several common formats
	// value:
	//		The telephone number string

	var flags = {
		format: [
			"###-###-####",
			"(###) ###-####",
			"(###) ### ####",
			"###.###.####",
			"###/###-####",
			"### ### ####",
			"###-###-#### x#???",
			"(###) ###-#### x#???",
			"(###) ### #### x#???",
			"###.###.#### x#???",
			"###/###-#### x#???",
			"### ### #### x#???",
			"##########"
		]
	};
	return validate.isNumberFormat(value, flags); // Boolean
};

us.isSocialSecurityNumber = function(/*String*/value){
	// summary:
	//		Validates social security number
	var flags = {
		format: [
			"###-##-####",
			"### ## ####",
			"#########"
		]
	};
	return validate.isNumberFormat(value, flags); // Boolean
};

us.isZipCode = function(/*String*/value){
	// summary:
	//		Validates U.S. zip-code
	var flags = {
		format: [
			"#####-####",
			"##### ####",
			"#########",
			"#####"
		]
	};
	return validate.isNumberFormat(value, flags); // Boolean
};

return us;
});

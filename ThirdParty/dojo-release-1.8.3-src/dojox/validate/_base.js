define([
	"dojo/_base/lang",
	"dojo/regexp", // dojo core expressions
	"dojo/number", // dojo number expressions
	"./regexp" // additional expressions
], function(lang, regexp, number, xregexp) {

var validate = lang.getObject("dojox.validate", true);

validate.isText = function(value, flags){
	// summary:
	//		Checks if a string has non whitespace characters.
	//		Parameters allow you to constrain the length.
	// value: String
	// flags: Object?
	//		{length: Number, minlength: Number, maxlength: Number}
	//
	//		- flags.length  If set, checks if there are exactly flags.length number of characters.
	//		- flags.minlength  If set, checks if there are at least flags.minlength number of characters.
	//		- flags.maxlength  If set, checks if there are at most flags.maxlength number of characters.
	
	flags = (typeof flags == "object") ? flags : {};
	
	// test for text
	if(/^\s*$/.test(value)){ return false; } // Boolean
	
	// length tests
	if(typeof flags.length == "number" && flags.length != value.length){ return false; } // Boolean
	if(typeof flags.minlength == "number" && flags.minlength > value.length){ return false; } // Boolean
	if(typeof flags.maxlength == "number" && flags.maxlength < value.length){ return false; } // Boolean
	
	return true; // Boolean

};

validate._isInRangeCache = {};
validate.isInRange = function(value, flags){
	// summary:
	//		Validates whether a string denoting a number
	//		is between a max and min.
	// value: String
	// flags: Object?
	//		{max:Number, min:Number, decimal:String}
	//
	//		- flags.max  A number, which the value must be less than or equal to for the validation to be true.
	//		- flags.min  A number, which the value must be greater than or equal to for the validation to be true.
	//		- flags.decimal  The character used for the decimal point.  Default is ".".
	
	value = number.parse(value, flags);
	if(isNaN(value)){
		return false; // Boolean
	}
    
	// assign default values to missing paramters
	flags = (typeof flags == "object") ? flags : {};
	var max = (typeof flags.max == "number") ? flags.max : Infinity,
		min = (typeof flags.min == "number") ? flags.min : -Infinity,
		dec = (typeof flags.decimal == "string") ? flags.decimal : ".",
	
		cache = validate._isInRangeCache,
		cacheIdx = value + "max" + max + "min" + min + "dec" + dec
	;
	if(typeof cache[cacheIdx] != "undefined"){
		return cache[cacheIdx];
	}

	cache[cacheIdx] = !(value < min || value > max);
	return cache[cacheIdx]; // Boolean

};

validate.isNumberFormat = function(value, flags){
	// summary:
	//		Validates any sort of number based format
	// description:
	//		Validates any sort of number based format. Use it for phone numbers,
	//		social security numbers, zip-codes, etc. The value can be validated
	//		against one format or one of multiple formats.
	//
	//		Format Definition
	//		|   #        Stands for a digit, 0-9.
	//		|   ?        Stands for an optional digit, 0-9 or nothing.
	//		All other characters must appear literally in the expression.
	// example:
	// |  "(###) ###-####"       ->   (510) 542-9742
	// |  "(###) ###-#### x#???" ->   (510) 542-9742 x153
	// |  "###-##-####"          ->   506-82-1089       i.e. social security number
	// |  "#####-####"           ->   98225-1649        i.e. zip code
	// value: String
	// flags: Object?
	//		- flags.format  A string or an Array of strings for multiple formats.
	// example:
	//	|	// returns true:
	//	|	dojox.validate.isNumberFormat("123-45", { format:"###-##" });
	// example:
	//		Check Multiple formats:
	// |	dojox.validate.isNumberFormat("123-45", {
	// |		format:["### ##","###-##","## ###"]
	// |	});
	//

	var re = new RegExp("^" + xregexp.numberFormat(flags) + "$", "i");
	return re.test(value); // Boolean
};

validate.isValidLuhn = function(/* String */value){
	// summary:
	//		Validate a String value against the Luhn algorithm.
	// description:
	//		Validate a String value against the Luhn algorithm to verify
	//		its integrity.
	
	var sum = 0, parity, curDigit;
	if(!lang.isString(value)){
		value = String(value);
	}
	value = value.replace(/[- ]/g,''); //ignore dashes and whitespaces
	parity = value.length % 2;

	for(var i = 0; i < value.length; i++){
		curDigit = parseInt(value.charAt(i));
		if(i % 2 == parity){
			curDigit *= 2;
		}
		if(curDigit > 9){
			curDigit -= 9;
		}
		sum += curDigit;
	}
	return !(sum % 10); // Boolean
};

return validate;

});

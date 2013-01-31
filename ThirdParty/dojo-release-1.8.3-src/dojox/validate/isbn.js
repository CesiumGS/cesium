define(["dojo/_base/lang", "./_base"], function(lang, validate){

validate.isValidIsbn = function(/* String */value) {
	// summary:
	//		Validate ISBN-10 or ISBN-13 based on the length of value
	// value: String
	//		An ISBN to validate
	// returns: Boolean
	var len, sum = 0, weight;
	if(!lang.isString(value)){
		value = String(value);
	}
	value = value.replace(/[- ]/g,''); //ignore dashes and whitespaces
	len = value.length;

	switch(len){
		case 10:
			weight = len;
			// ISBN-10 validation algorithm
			for(var i = 0; i < 9; i++){
				sum += parseInt(value.charAt(i)) * weight;
				weight--;
			}
			var t = value.charAt(9).toUpperCase();
			sum += t == 'X' ? 10 : parseInt(t);
			return sum % 11 == 0; // Boolean
			break;
		case 13:
			weight = -1;
			for(var i = 0; i< len; i++){
				sum += parseInt(value.charAt(i)) * (2 + weight);
				weight *= -1;
			}
			return sum % 10 == 0; // Boolean
			break;
	}
	return false;
};

return validate.isValidIsbn;
});

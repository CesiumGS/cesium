define([
	"dojo/_base/lang",
	"../_base"
], function(lang,dd){

	lang.getObject("dojox.dtl.filter.logic", true);

	lang.mixin(dd.filter.logic, {
		default_: function(value, arg){
			// summary:
			//		If value is unavailable, use given default
			return value || arg || "";
		},
		default_if_none: function(value, arg){
			// summary:
			//		If value is null, use given default
			return (value === null) ? arg || "" : value || "";
		},
		divisibleby: function(value, arg){
			// summary:
			//		Returns true if the value is divisible by the argument"
			return (parseInt(value, 10) % parseInt(arg, 10)) === 0;
		},
		_yesno: /\s*,\s*/g,
		yesno: function(value, arg){
			// summary:
			//		arg being a comma-delimited string, value of true/false/none
			//		chooses the appropriate item from the string
			if(!arg){
				arg = 'yes,no,maybe';
			}
			var parts = arg.split(dojox.dtl.filter.logic._yesno);
			if(parts.length < 2){
				return value;
			}
			if(value){
				return parts[0];
			}
			if((!value && value !== null) || parts.length < 3){
				return parts[1];
			}
			return parts[2];
		}
	});
	return dojox.dtl.filter.logic;
});
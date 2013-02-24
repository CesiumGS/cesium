define([
	"dojo/_base/lang",
	"dojo/_base/json",	// dojo.toJson
	"../_base"
], function(lang,json,dd){

	lang.getObject("dojox.dtl.filter.misc", true);

	lang.mixin(dd.filter.misc, {
		filesizeformat: function(value){
			// summary:
			//		Format the value like a 'human-readable' file size (i.e. 13 KB, 4.1 MB, 102bytes, etc).
			value = parseFloat(value);
			if(value < 1024){
				return (value == 1) ? value + " byte" : value + " bytes";
			}else if(value < 1024 * 1024){
				return (value / 1024).toFixed(1) + " KB";
			}else if(value < 1024 * 1024 * 1024){
				return (value / 1024 / 1024).toFixed(1) + " MB";
			}
			return (value / 1024 / 1024 / 1024).toFixed(1) + " GB";
		},
		pluralize: function(value, arg){
			// summary:
			//		Returns a plural suffix if the value is not 1, for '1 vote' vs. '2 votes'
			// description:
			//		By default, 's' is used as a suffix; if an argument is provided, that string
			//		is used instead. If the provided argument contains a comma, the text before
			//		the comma is used for the singular case.
			arg = arg || 's';
			if(arg.indexOf(",") == -1){
				arg = "," + arg;
			}
			var parts = arg.split(",");
			if(parts.length > 2){
				return "";
			}
			var singular = parts[0];
			var plural = parts[1];

			if(parseInt(value, 10) != 1){
				return plural;
			}
			return singular;
		},
		_phone2numeric: { a: 2, b: 2, c: 2, d: 3, e: 3, f: 3, g: 4, h: 4, i: 4, j: 5, k: 5, l: 5, m: 6, n: 6, o: 6, p: 7, r: 7, s: 7, t: 8, u: 8, v: 8, w: 9, x: 9, y: 9 },
		phone2numeric: function(value){
			// summary:
			//		Takes a phone number and converts it in to its numerical equivalent
			var dm = dd.filter.misc;
			value = value + "";
			var output = "";
			for(var i = 0; i < value.length; i++){
				var chr = value.charAt(i).toLowerCase();
				(dm._phone2numeric[chr]) ? output += dm._phone2numeric[chr] : output += value.charAt(i);
			}
			return output;
		},
		pprint: function(value){
			// summary:
			//		A wrapper around toJson unless something better comes along
			return json.toJson(value);
		}
	});
	return dojox.dtl.filter.misc;
});

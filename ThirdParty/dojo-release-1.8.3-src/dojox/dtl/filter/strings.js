define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojox/string/tokenize",
	"dojox/string/sprintf",
	"../filter/htmlstrings",
	"../_base"
], function(lang,array,Tokenize,Sprintf,htmlstrings,dd){

	lang.getObject("dojox.dtl.filter.strings", true);

	lang.mixin(dd.filter.strings, {
		_urlquote: function(/*String*/ url, /*String?*/ safe){
			if(!safe){
				safe = "/";
			}
			return Tokenize(url, /([^\w-_.])/g, function(token){
				if(safe.indexOf(token) == -1){
					if(token == " "){
						return "+";
					}else{
						var hex = token.charCodeAt(0).toString(16).toUpperCase();
						while(hex.length < 2){
							hex = "0" + hex;
						}
						return "%" + hex;
					}
				}
				return token;
			}).join("");
		},
		addslashes: function(value){
			// summary:
			//		Adds slashes - useful for passing strings to JavaScript, for example.
			return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");
		},
		capfirst: function(value){
			// summary:
			//		Capitalizes the first character of the value
			value = "" + value;
			return value.charAt(0).toUpperCase() + value.substring(1);
		},
		center: function(value, arg){
			// summary:
			//		Centers the value in a field of a given width
			arg = arg || value.length;
			value = value + "";
			var diff = arg - value.length;
			if(diff % 2){
				value = value + " ";
				diff -= 1;
			}
			for(var i = 0; i < diff; i += 2){
				value = " " + value + " ";
			}
			return value;
		},
		cut: function(value, arg){
			// summary:
			//		Removes all values of arg from the given string
			arg = arg + "" || "";
			value = value + "";
			return value.replace(new RegExp(arg, "g"), "");
		},
		_fix_ampersands: /&(?!(\w+|#\d+);)/g,
		fix_ampersands: function(value){
			// summary:
			//		Replaces ampersands with ``&amp;`` entities
			return value.replace(dojox.dtl.filter.strings._fix_ampersands, "&amp;");
		},
		floatformat: function(value, arg){
			// summary:
			//		Format a number according to arg
			// description:
			//		If called without an argument, displays a floating point
			//		number as 34.2 -- but only if there's a point to be displayed.
			//		With a positive numeric argument, it displays that many decimal places
			//		always.
			//		With a negative numeric argument, it will display that many decimal
			//		places -- but only if there's places to be displayed.
			arg = parseInt(arg || -1, 10);
			value = parseFloat(value);
			var m = value - value.toFixed(0);
			if(!m && arg < 0){
				return value.toFixed();
			}
			value = value.toFixed(Math.abs(arg));
			return (arg < 0) ? parseFloat(value) + "" : value;
		},
		iriencode: function(value){
			return dojox.dtl.filter.strings._urlquote(value, "/#%[]=:;$&()+,!");
		},
		linenumbers: function(value){
			// summary:
			//		Displays text with line numbers
			var df = dojox.dtl.filter;
			var lines = value.split("\n");
			var output = [];
			var width = (lines.length + "").length;
			for(var i = 0, line; i < lines.length; i++){
				line = lines[i];
				output.push(df.strings.ljust(i + 1, width) + ". " + dojox.dtl._base.escape(line));
			}
			return output.join("\n");
		},
		ljust: function(value, arg){
			value = value + "";
			arg = parseInt(arg, 10);
			while(value.length < arg){
				value = value + " ";
			}
			return value;
		},
		lower: function(value){
			// summary:
			//		Converts a string into all lowercase
			return (value + "").toLowerCase();
		},
		make_list: function(value){
			// summary:
			//		Returns the value turned into a list. For an integer, it's a list of
			//		digits. For a string, it's a list of characters.
			var output = [];
			if(typeof value == "number"){
				value = value + "";
			}
			if(value.charAt){
				for(var i = 0; i < value.length; i++){
					output.push(value.charAt(i));
				}
				return output;
			}
			if(typeof value == "object"){
				for(var key in value){
					output.push(value[key]);
				}
				return output;
			}
			return [];
		},
		rjust: function(value, arg){
			value = value + "";
			arg = parseInt(arg, 10);
			while(value.length < arg){
				value = " " + value;
			}
			return value;
		},
		slugify: function(value){
			// summary:
			//		Converts to lowercase, removes
			//		non-alpha chars and converts spaces to hyphens
			value = value.replace(/[^\w\s-]/g, "").toLowerCase();
			return value.replace(/[\-\s]+/g, "-");
		},
		_strings: {},
		stringformat: function(value, arg){
			// summary:
			//		Formats the variable according to the argument, a string formatting specifier.
			//		This specifier uses Python string formating syntax, with the exception that
			//		the leading "%" is dropped.
			arg = "" + arg;
			var strings = dojox.dtl.filter.strings._strings;
			if(!strings[arg]){
				strings[arg] = new Sprintf.Formatter("%" + arg);
			}
			return strings[arg].format(value);
		},
		title: function(value){
			// summary:
			//		Converts a string into titlecase
			var last, title = "";
			for(var i = 0, current; i < value.length; i++){
				current = value.charAt(i);
				if(last == " " || last == "\n" || last == "\t" || !last){
					title += current.toUpperCase();
				}else{
					title += current.toLowerCase();
				}
				last = current;
			}
			return title;
		},
		_truncatewords: /[ \n\r\t]/,
		truncatewords: function(value, arg){
			// summary:
			//		Truncates a string after a certain number of words
			// arg: Integer
			//		Number of words to truncate after
			arg = parseInt(arg, 10);
			if(!arg){
				return value;
			}

			for(var i = 0, j = value.length, count = 0, current, last; i < value.length; i++){
				current = value.charAt(i);
				if(dojox.dtl.filter.strings._truncatewords.test(last)){
					if(!dojox.dtl.filter.strings._truncatewords.test(current)){
						++count;
						if(count == arg){
							return value.substring(0, j + 1);
						}
					}
				}else if(!dojox.dtl.filter.strings._truncatewords.test(current)){
					j = i;
				}
				last = current;
			}
			return value;
		},
		_truncate_words: /(&.*?;|<.*?>|(\w[\w\-]*))/g,
		_truncate_tag: /<(\/)?([^ ]+?)(?: (\/)| .*?)?>/,
		_truncate_singlets: { br: true, col: true, link: true, base: true, img: true, param: true, area: true, hr: true, input: true },
		truncatewords_html: function(value, arg){
			arg = parseInt(arg, 10);

			if(arg <= 0){
				return "";
			}

			var strings = dojox.dtl.filter.strings;
			var words = 0;
			var open = [];

			var output = Tokenize(value, strings._truncate_words, function(all, word){
				if(word){
					// It's an actual non-HTML word
					++words;
					if(words < arg){
						return word;
					}else if(words == arg){
						return word + " ...";
					}
				}
				// Check for tag
				var tag = all.match(strings._truncate_tag);
				if(!tag || words >= arg){
					// Don't worry about non tags or tags after our truncate point
					return;
				}
				var closing = tag[1];
				var tagname = tag[2].toLowerCase();
				var selfclosing = tag[3];
				if(closing || strings._truncate_singlets[tagname]){
				}else if(closing){
					var i = array.indexOf(open, tagname);
					if(i != -1){
						open = open.slice(i + 1);
					}
				}else{
					open.unshift(tagname);
				}
				return all;
			}).join("");

			output = output.replace(/\s+$/g, "");

			for(var i = 0, tag; tag = open[i]; i++){
				output += "</" + tag + ">";
			}

			return output;
		},
		upper: function(value){
			return value.toUpperCase();
		},
		urlencode: function(value){
			return dojox.dtl.filter.strings._urlquote(value);
		},
		_urlize: /^((?:[(>]|&lt;)*)(.*?)((?:[.,)>\n]|&gt;)*)$/,
		_urlize2: /^\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/,
		urlize: function(value){
			return dojox.dtl.filter.strings.urlizetrunc(value);
		},
		urlizetrunc: function(value, arg){
			arg = parseInt(arg);
			return Tokenize(value, /(\S+)/g, function(word){
				var matches = dojox.dtl.filter.strings._urlize.exec(word);
				if(!matches){
					return word;
				}
				var lead = matches[1];
				var middle = matches[2];
				var trail = matches[3];

				var startsWww = middle.indexOf("www.") == 0;
				var hasAt = middle.indexOf("@") != -1;
				var hasColon = middle.indexOf(":") != -1;
				var startsHttp = middle.indexOf("http://") == 0;
				var startsHttps = middle.indexOf("https://") == 0;
				var firstAlpha = /[a-zA-Z0-9]/.test(middle.charAt(0));
				var last4 = middle.substring(middle.length - 4);

				var trimmed = middle;
				if(arg > 3){
					trimmed = trimmed.substring(0, arg - 3) + "...";
				}

				if(startsWww || (!hasAt && !startsHttp && middle.length && firstAlpha && (last4 == ".org" || last4 == ".net" || last4 == ".com"))){
					return '<a href="http://' + middle + '" rel="nofollow">' + trimmed + '</a>';
				}else if(startsHttp || startsHttps){
					return '<a href="' + middle + '" rel="nofollow">' + trimmed + '</a>';
				}else if(hasAt && !startsWww && !hasColon && dojox.dtl.filter.strings._urlize2.test(middle)){
					return '<a href="mailto:' + middle + '">' + middle + '</a>';
				}
				return word;
			}).join("");
		},
		wordcount: function(value){
			value = lang.trim(value);
			if(!value){ return 0; }
			return value.split(/\s+/g).length;
		},
		wordwrap: function(value, arg){
			arg = parseInt(arg);
			// summary:
			//		Wraps words at specified line length
			var output = [];
			var parts = value.split(/\s+/g);
			if(parts.length){
				var word = parts.shift();
				output.push(word);
				var pos = word.length - word.lastIndexOf("\n") - 1;
				for(var i = 0; i < parts.length; i++){
					word = parts[i];
					if(word.indexOf("\n") != -1){
						var lines = word.split(/\n/g);
					}else{
						var lines = [word];
					}
					pos += lines[0].length + 1;
					if(arg && pos > arg){
						output.push("\n");
						pos = lines[lines.length - 1].length;
					}else{
						output.push(" ");
						if(lines.length > 1){
							pos = lines[lines.length - 1].length;
						}
					}
					output.push(word);
				}
			}
			return output.join("");
		}
	});
	return dojox.dtl.filter.strings;
});
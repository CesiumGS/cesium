define([
	"dojo/_base/lang",
	"../_base"
], function(lang,dd){

	lang.getObject("dojox.dtl.filter.lists", true);

	lang.mixin(dd.filter.lists, {
		_dictsort: function(a, b){
			if(a[0] == b[0]){
				return 0;
			}
			return (a[0] < b[0]) ? -1 : 1;
		},
		dictsort: function(value, arg){
			// summary:
			//		Takes a list of dicts, returns that list sorted by the property given in the argument.
			if(!arg){
				return value;
			}

			var i, item, items = [];
			if(!lang.isArray(value)){
				var obj = value, value = [];
				for(var key in obj){
					value.push(obj[key]);
				}
			}
			for(i = 0; i < value.length; i++){
				items.push([new dojox.dtl._Filter('var.' + arg).resolve(new dojox.dtl._Context({ 'var' : value[i]})), value[i]]);
			}
			items.sort(dojox.dtl.filter.lists._dictsort);
			var output = [];
			for(i = 0; item = items[i]; i++){
				output.push(item[1]);
			}
			return output;
		},
		dictsortreversed: function(value, arg){
			// summary:
			//		Takes a list of dicts, returns that list sorted in reverse order by the property given in the argument.
			if(!arg) return value;

			var dictsort = dojox.dtl.filter.lists.dictsort(value, arg);
			return dictsort.reverse();
		},
		first: function(value){
			// summary:
			//		Returns the first item in a list
			return (value.length) ? value[0] : "";
		},
		join: function(value, arg){
			// summary:
			//		Joins a list with a string, like Python's ``str.join(list)``
			// description:
			//		Django throws a compile error, but JS can't do arg checks
			//		so we're left with run time errors, which aren't wise for something
			//		as trivial here as an empty arg.
			return value.join(arg || ",");
		},
		length: function(value){
			// summary:
			//		Returns the length of the value - useful for lists
			return (isNaN(value.length)) ? (value + "").length : value.length;
		},
		length_is: function(value, arg){
			// summary:
			//		Returns a boolean of whether the value's length is the argument
			return value.length == parseInt(arg);
		},
		random: function(value){
			// summary:
			//		Returns a random item from the list
			return value[Math.floor(Math.random() * value.length)];
		},
		slice: function(value, arg){
			// summary:
			//		Returns a slice of the list.
			// description:
			//		Uses the same syntax as Python's list slicing; see
			//		http://www.diveintopython.net/native_data_types/lists.html#odbchelper.list.slice
			//		for an introduction.
			//		Also uses the optional third value to denote every X item.
			arg = arg || "";
			var parts = arg.split(":");
			var bits = [];
			for(var i = 0; i < parts.length; i++){
				if(!parts[i].length){
					bits.push(null);
				}else{
					bits.push(parseInt(parts[i]));
				}
			}

			if(bits[0] === null){
				bits[0] = 0;
			}
			if(bits[0] < 0){
				bits[0] = value.length + bits[0];
			}
			if(bits.length < 2 || bits[1] === null){
				bits[1] = value.length;
			}
			if(bits[1] < 0){
				bits[1] = value.length + bits[1];
			}
			
			return value.slice(bits[0], bits[1]);
		},
		_unordered_list: function(value, tabs){
			var ddl = dojox.dtl.filter.lists;
			var i, indent = "";
			for(i = 0; i < tabs; i++){
				indent += "\t";
			}
			if(value[1] && value[1].length){
				var recurse = [];
				for(i = 0; i < value[1].length; i++){
					recurse.push(ddl._unordered_list(value[1][i], tabs + 1))
				}
				return indent + "<li>" + value[0] + "\n" + indent + "<ul>\n" + recurse.join("\n") + "\n" + indent + "</ul>\n" + indent + "</li>";
			}else{
				return indent + "<li>" + value[0] + "</li>";
			}
		},
		unordered_list: function(value){
			// summary:
			//		Recursively takes a self-nested list and returns an HTML unordered list --
			//		WITHOUT opening and closing `<ul>` tags.
			// description:
			//		The list is assumed to be in the proper format. For example, if ``var`` contains
			//		``['States', [['Kansas', [['Lawrence', []], ['Topeka', []]]], ['Illinois', []]]]``,
			//		then ``{{ var|unordered_list }}`` would return::
			//
			//		|	<li>States
			//		|	<ul>
			//		|		<li>Kansas
			//		|		<ul>
			//		|			<li>Lawrence</li>
			//		|			<li>Topeka</li>
			//		|		</ul>
			//		|		</li>
			//		|		<li>Illinois</li>
			//		|	</ul>
			//		|	</li>
			return dojox.dtl.filter.lists._unordered_list(value, 1);
		}
	});
	return dojox.dtl.filter.lists;
});
define(["../main", "doh/main", "../string"], function(dojo, doh){

doh.register("tests.string",
	[
		function test_string_pad(t){
			t.is("00001", dojo.string.pad("1", 5));
			t.is("000001", dojo.string.pad("000001", 5));
			t.is("10000", dojo.string.pad("1", 5, null, true));
		},

		function test_string_substitute(t){
			t.is("File 'foo.html' is not found in directory '/temp'.",
				dojo.string.substitute(
					"File '${0}' is not found in directory '${1}'.",
					["foo.html","/temp"]
				)
			);
			t.is("File 'foo.html' is not found in directory '/temp'.",
				dojo.string.substitute(
					"File '${name}' is not found in directory '${info.dir}'.",
					{
						name: "foo.html",
						info: { dir: "/temp" }
					}
				)
			);
			// Verify that an error is thrown!
			t.assertError(Error, dojo.string, "substitute", ["${x}", {y:1}]);
		},

		function test_string_substitute_transform(t){
			var getPrefix = function(str){
				// try to figure out the type
				var prefix = (str.charAt(0) == "/") ? "directory": "file";
				if(this.____prefix){
					prefix = this.____prefix + prefix;
				}
				return prefix + " '" + str + "'";
			};

			var obj = {
				____prefix: "...",
				getPrefix: getPrefix
			};

			t.is("file 'foo.html' is not found in directory '/temp'.",
				dojo.string.substitute(
					"${0} is not found in ${1}.",
					["foo.html","/temp"],
					getPrefix
				)
			);

			t.is("...file 'foo.html' is not found in ...directory '/temp'.",
				dojo.string.substitute(
					"${0} is not found in ${1}.",
					["foo.html","/temp"],
					obj.getPrefix, obj
				)
			);
		},

		function test_string_substitute_formatter(t){
			t.is("thinger -- howdy",
				dojo.string.substitute(
					"${0:postfix}", ["thinger"], null, {
						postfix: function(value, key){
							return value + " -- howdy";
						}
					}
				)
			);
		},

		function test_string_trim(t){
			t.is("astoria", dojo.string.trim("   \f\n\r\t      astoria           "));
			t.is("astoria", dojo.string.trim("astoria                            "));
			t.is("astoria", dojo.string.trim("                            astoria"));
			t.is("astoria", dojo.string.trim("astoria"));
			t.is("a", dojo.string.trim("   a   "));
		},

		function test_string_rep(t){
			t.is("aaaaa", dojo.string.rep("a", 5));
			t.is("abababab", dojo.string.rep("ab", 4));
			t.is("", dojo.string.rep("ab", 0));
			t.is("", dojo.string.rep("", 3));
		}
	]
);

});
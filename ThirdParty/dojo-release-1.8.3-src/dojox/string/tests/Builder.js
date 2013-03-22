dojo.provide("dojox.string.tests.Builder");

dojo.require("dojox.string.Builder");

tests.register("dojox.string.tests.Builder", [
	{
		name: "Append",
		runTest: function(t) {
			var b = new dojox.string.Builder();
			b.append("foo");
			t.is("foo", b.toString());
			b.append("bar", "baz");
			t.is("foobarbaz", b.toString());
			b.append("ben").append("zoo");
			t.is("foobarbazbenzoo", b.toString());
			b.append(5);
			t.is("foobarbazbenzoo5", b.toString());
		}
	},
	{
		name: "AppendArray",
		runTest: function(t){
			var b = new dojox.string.Builder();
			b.appendArray([ "foo", "bar", "baz" ]);
			t.is("foobarbaz", b.toString());
			b.appendArray([ "bar", "baz" ]);
			t.is("foobarbazbarbaz", b.toString());
			b.appendArray(["ben","zoo"]).appendArray(["zoo","ben"]);
			t.is("foobarbazbarbazbenzoozooben", b.toString());
			b.appendArray([ 5, 8 ]);
			t.is("foobarbazbarbazbenzoozooben58", b.toString());
		}
	},
	{
		name: "Construction",
		runTest: function(t){
			var b = new dojox.string.Builder();
			t.is("", b.toString());
			b = new dojox.string.Builder("foo");
			t.is("foo", b.toString());
		}
	},
	{
		name: "Replace",
		runTest: function(t){
			var b = new dojox.string.Builder("foobar");
			t.is("foobar", b.toString());
			b.replace("foo", "baz");
			t.is("bazbar", b.toString());
			b.replace("baz", "ben");
			t.is("benbar", b.toString());
			b.replace("foo", "moo");
			t.is("benbar", b.toString());
			b.replace("enba", "o");
			t.is("bor", b.toString());
			b.replace("o", "a").replace("b", "f");
			t.is("far", b.toString());
		}
	},
	{
		name: "Insert",
		runTest: function(t){
			var b = new dojox.string.Builder();
			//insert at 0 is prepend
			b.insert(0, "foo");
			t.is("foo", b.toString());
			b.insert(0, "more");
			t.is("morefoo", b.toString());
			
			//insert positions stuff after the 4th character
			b.insert(4, "fun");
			t.is("morefunfoo", b.toString());
			
			//insert at len of string is push_back
			b.insert(10, "awesome");
			t.is("morefunfooawesome", b.toString());
			
			//insert past len of string is push_back
			b.insert(100, "bad");
			t.is("morefunfooawesomebad", b.toString());
			
			b = new dojox.string.Builder();
			b.insert(0, "foo").insert(3, "bar").insert(3, "zoo");
			t.is("foozoobar", b.toString());
		}
	},
	{
		name: "Remove",
		runTest: function(t){
			var b = new dojox.string.Builder("foobarbaz");
			b.remove(3,3);
			t.is("foobaz", b.toString());
			b.remove(0,3);
			t.is("baz", b.toString());
			b.remove(2, 100);
			t.is("ba", b.toString());
			b.remove(0,0);
			t.is("ba", b.toString());
			b.append("zbarfoo");
			b.remove(5);
			t.is("bazba", b.toString());
		}
	}
]);

dojo.provide("dojox.string.tests.sprintf");

dojo.require("dojox.string.sprintf");
dojo.require("dojo.string");


// Mapping using the %(var) format

// Flags:
//	(space): Preceeds a positive number with a blank space
//	+: Preceeds a positive number with a + sign
//	0: Pads numbers using zeroes
//	-: Left justify a number (they're right justified by default)
//	#: Alternate view for the specifier

tests.register("dojox.string.tests.sprintf", [
	{
		name: "Flag: (space)",
		runTest: function(t){
			var sprintf = dojox.string.sprintf;

			t.is(" 42", sprintf("% d", 42));
			t.is("-42", sprintf("% d", -42));
			t.is("   42", sprintf("% 5d", 42));
			t.is("  -42", sprintf("% 5d", -42));
			t.is("             42", sprintf("% 15d", 42));
			t.is("            -42", sprintf("% 15d", -42));
		}
	},
	{
		name: "Flag: +",
		runTest: function(t){
			var sprintf = dojox.string.sprintf;

			t.is("+42", sprintf("%+d", 42));
			t.is("-42", sprintf("%+d", -42));
			t.is("  +42", sprintf("%+5d", 42));
			t.is("  -42", sprintf("%+5d", -42));
			t.is("            +42", sprintf("%+15d", 42));
			t.is("            -42", sprintf("%+15d", -42));
		}
	},
	{
		name: "Flag: 0",
		runTest: function(t){
			var sprintf = dojox.string.sprintf;

			t.is("42", sprintf("%0d", 42));
			t.is("-42", sprintf("%0d", -42));
			t.is("00042", sprintf("%05d", 42));
			t.is("00-42", sprintf("%05d", -42));
			t.is("000000000000042", sprintf("%015d", 42));
			t.is("000000000000-42", sprintf("%015d", -42));
		}
	},
	{
		name: "Flag: -",
		runTest: function(t){
			var sprintf = dojox.string.sprintf;

			t.is("42", sprintf("%-d", 42));
			t.is("-42", sprintf("%-d", -42));
			t.is("42   ", sprintf("%-5d", 42));
			t.is("-42  ", sprintf("%-5d", -42));
			t.is("42             ", sprintf("%-15d", 42));
			t.is("-42            ", sprintf("%-15d", -42));

			t.is("42", sprintf("%-0d", 42));
			t.is("-42", sprintf("%-0d", -42));
			t.is("42   ", sprintf("%-05d", 42));
			t.is("-42  ", sprintf("%-05d", -42));
			t.is("42             ", sprintf("%-015d", 42));
			t.is("-42            ", sprintf("%-015d", -42));

			t.is("42", sprintf("%0-d", 42));
			t.is("-42", sprintf("%0-d", -42));
			t.is("42   ", sprintf("%0-5d", 42));
			t.is("-42  ", sprintf("%0-5d", -42));
			t.is("42             ", sprintf("%0-15d", 42));
			t.is("-42            ", sprintf("%0-15d", -42));
		}
	},
	{
		name: "Precision",
		runTest: function(t){
			var sprintf = dojox.string.sprintf;

			t.is("42", sprintf("%d", 42.8952));
			t.is("42", sprintf("%.2d", 42.8952)); // Note: the %d format is an int
			t.is("42", sprintf("%.2i", 42.8952));
			t.is("42.90", sprintf("%.2f", 42.8952));
			t.is("42.90", sprintf("%.2F", 42.8952));
			t.is("42.8952000000", sprintf("%.10f", 42.8952));
			t.is("42.90", sprintf("%1.2f", 42.8952));
			t.is(" 42.90", sprintf("%6.2f", 42.8952));
			t.is("042.90", sprintf("%06.2f", 42.8952));
			t.is("+42.90", sprintf("%+6.2f", 42.8952));
			t.is("42.8952000000", sprintf("%5.10f", 42.8952));
		}
	},
	{
		name: "Bases",
		runTest: function(t){
			var sprintf = dojox.string.sprintf;

			t.is("\x7f", sprintf("%c", 0x7f));

			var error = false;
			try {
				sprintf("%c", -100);
			}catch(e){
				t.is("invalid character code passed to %c in sprintf", e.message);
				error = true;
			}
			t.t(error);

			error = false;
			try {
				sprintf("%c", 0x200000);
			}catch(e){
				t.is("invalid character code passed to %c in sprintf", e.message);
				error = true;
			}
			t.t(error);
		}
	},
	{
		name: "Mapping",
		runTest: function(t){
			var sprintf = dojox.string.sprintf;

			// %1$s format
			t.is("%1$", sprintf("%1$"));
			t.is("%0$s", sprintf("%0$s"));
			t.is("Hot Pocket", sprintf("%1$s %2$s", "Hot", "Pocket"));
			t.is("12.0 Hot Pockets", sprintf("%1$.1f %2$s %3$ss", 12, "Hot", "Pocket"));
			t.is(" 42", sprintf("%1$*.f", "42", 3));

			error = false;
			try {
				sprintf("%2$*s", "Hot Pocket");
			}catch(e){
				t.is("got 1 printf arguments, insufficient for '%2$*s'", e.message);
				error = true;
			}
			t.t(error);

			// %(map)s format
			t.is("%(foo", sprintf("%(foo", {}));
			t.is("Hot Pocket", sprintf("%(temperature)s %(crevace)s", {
				temperature: "Hot",
				crevace: "Pocket"
			}));
			t.is("12.0 Hot Pockets", sprintf("%(quantity).1f %(temperature)s %(crevace)ss", {
				quantity: 12,
				temperature: "Hot",
				crevace: "Pocket"
			}));

			var error = false;
			try {
				sprintf("%(foo)s", 42);
			}catch(e){
				t.is("format requires a mapping", e.message);
				error = true;
			}
			t.t(error);

			error = false;
			try {
				sprintf("%(foo)s %(bar)s", "foo", 42);
			}catch(e){
				t.is("format requires a mapping", e.message);
				error = true;
			}
			t.t(error);

			error = false;
			try {
				sprintf("%(foo)*s", {
					foo: "Hot Pocket"
				});
			}catch(e){
				t.is("* width not supported in mapped formats", e.message);
				error = true;
			}
			t.t(error);
		}
	},
	{
		name: "Positionals",
		runTest: function(t){
			var sprintf = dojox.string.sprintf;

			t.is(" foo", sprintf("%*s", "foo", 4));
			t.is("      3.14", sprintf("%*.*f", 3.14159265, 10, 2));
			t.is("0000003.14", sprintf("%0*.*f", 3.14159265, 10, 2));
			t.is("3.14      ", sprintf("%-*.*f", 3.14159265, 10, 2));

			var error = false;
			try {
				sprintf("%*s", "foo", "bar");
			}catch(e){
				t.is("the argument for * width at position 2 is not a number in %*s", e.message);
				error = true;
			}
			t.t(error);

			error = false;
			try {
				sprintf("%10.*f", "foo", 42);
			}catch(e){
				t.is("format argument 'foo' not a float; parseFloat returned NaN", e.message);
				error = true;
			}
			t.t(error);
		}
	},
	{
		name: "vs. Formatter",
		runTest: function(t){
			var sprintf = dojox.string.sprintf;

			for(var i = 0; i < 1000; i++){
				sprintf("%d %s Pockets", i, "Hot");
			}
		}
	},
	{
		name: "Formatter",
		runTest: function(t){
			var Formatter = dojox.string.sprintf.Formatter;

			var str = new Formatter("%d %s Pockets");
			for(var i = 0; i < 1000; i++){
				str.format(i, "Hot");
			}
		}
	},
	{
		name: "Miscellaneous",
		runTest: function(t) {
			var sprintf = dojox.string.sprintf;

			t.is("+hello+", sprintf("+%s+", "hello"));
			t.is("+10+", sprintf("+%d+", 10));
			t.is("a", sprintf("%c", "a"));
			t.is('"', sprintf("%c", 34));
			t.is('$', sprintf("%c", 36));
			t.is("10", sprintf("%d", 10));

			var error = false;
			try {
				sprintf("%s%s", 42);
			}catch(e){
				t.is("got 1 printf arguments, insufficient for '%s%s'", e.message);
				error = true;
			}
			t.t(error);

			error = false;
			try {
				sprintf("%c");
			}catch(e){
				t.is("got 0 printf arguments, insufficient for '%c'", e.message);
				error = true;
			}
			t.t(error);

			t.is("%10", sprintf("%10", 42));
		}
	}
]);
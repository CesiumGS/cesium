dojo.provide("dojox.dtl.tests.text.filter");

dojo.require("dojox.dtl");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.utils.date");
dojo.require("dojox.date.php");
dojo.require("dojox.string.sprintf");

// If you update something here, update it in the HTML tests
doh.register("dojox.dtl.text.filter",
	[
		function test_filter_add(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ four: 4 });
			tpl = new dd.Template('{{ four|add:"6" }}');
			t.is("10", tpl.render(context));
			context.four = "4";
			t.is("10", tpl.render(context));
			tpl = new dd.Template('{{ four|add:"six" }}');
			t.is("4", tpl.render(context));
			tpl = new dd.Template('{{ four|add:"6.6" }}');
			t.is("10", tpl.render(context));
		},
		function test_filter_addslashes(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ unslashed: "Test back slashes \\, double quotes \" and single quotes '" })
			var tpl = new dd.Template('{{ unslashed|addslashes|safe }}');
			t.is("Test back slashes \\\\, double quotes \\\" and single quotes \\'", tpl.render(context));
		},
		function test_filter_capfirst(t){
			var dd = dojox.dtl;

			var tpl = new dd.Template('{{ uncapped|capfirst }}');
			t.is("Cap", tpl.render(new dd.Context({ uncapped: "cap" })));
		},
		function test_filter_center(t){
			var dd = dojox.dtl;

			var context = new dd.Context();
			var tpl = new dd.Template('{{ narrow|center }}');
			context.narrow = "even";
			t.is("even", tpl.render(context));
			context.narrow = "odd";
			t.is("odd", tpl.render(context));
			tpl = new dd.Template('{{ narrow|center:"5" }}');
			context.narrow = "even";
			t.is("even ", tpl.render(context));
			context.narrow = "odd";
			t.is(" odd ", tpl.render(context));
			tpl = new dd.Template('{{ narrow|center:"6" }}');
			context.narrow = "even";
			t.is(" even ", tpl.render(context));
			context.narrow = "odd";
			t.is(" odd  ", tpl.render(context));
			tpl = new dd.Template('{{ narrow|center:"12" }}');
			context.narrow = "even";
			t.is("    even    ", tpl.render(context));
			context.narrow = "odd";
			t.is("    odd     ", tpl.render(context));
		},
		function test_filter_cut(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ uncut: "Apples and oranges" });
			var tpl = new dd.Template('{{ uncut|cut }}');
			t.is("Apples and oranges", tpl.render(context));
			tpl = new dd.Template('{{ uncut|cut:"A" }}');
			t.is("pples and oranges", tpl.render(context));
			tpl = new dd.Template('{{ uncut|cut:" " }}');
			t.is("Applesandoranges", tpl.render(context));
			tpl = new dd.Template('{{ uncut|cut:"e" }}');
			t.is("Appls and orangs", tpl.render(context));
		},
		function test_filter_date(t){
			var dd = dojox.dtl;
			var context = new dd.Context({ now: new Date(2007, 0, 1), then: new Date(2007, 1, 1) });

			var tpl = new dd.Template('{{ now|date }}');
			t.is(dojox.dtl.utils.date.format(context.now, "N j, Y"), tpl.render(context));

			context.then = new Date(2007, 0, 1);
			tpl = new dd.Template('{{ now|date:"d" }}');
			t.is("01", tpl.render(context));

			tpl = new dd.Template('{{ now|date:"D" }}');
			t.is("Mon", tpl.render(context));

			tpl = new dd.Template('{{ now|date:"j" }}');
			t.is("1", tpl.render(context));

			tpl = new dd.Template('{{ now|date:"l" }}');
			t.is("Monday", tpl.render(context));

			tpl = new dd.Template('{{ now|date:"N" }}');
			t.is("Jan.", tpl.render(context));

			tpl = new dd.Template('{{ now|date:"S" }}');
			t.is("st", tpl.render(context));
			context.now.setDate(2);
			t.is("nd", tpl.render(context));
			context.now.setDate(3);
			t.is("rd", tpl.render(context));
			context.now.setDate(4);
			t.is("th", tpl.render(context));
			context.now.setDate(5);
			t.is("th", tpl.render(context));
			context.now.setDate(6);
			t.is("th", tpl.render(context));
			context.now.setDate(7);
			t.is("th", tpl.render(context));
			context.now.setDate(8);
			t.is("th", tpl.render(context));
			context.now.setDate(9);
			t.is("th", tpl.render(context));
			context.now.setDate(10);
			t.is("th", tpl.render(context));
			context.now.setDate(11);
			t.is("th", tpl.render(context));
			context.now.setDate(12);
			t.is("th", tpl.render(context));
			context.now.setDate(13);
			t.is("th", tpl.render(context));
			context.now.setDate(14);
			t.is("th", tpl.render(context));
			context.now.setDate(15);
			t.is("th", tpl.render(context));
			context.now.setDate(16);
			t.is("th", tpl.render(context));
			context.now.setDate(17);
			t.is("th", tpl.render(context));
			context.now.setDate(18);
			t.is("th", tpl.render(context));
			context.now.setDate(19);
			t.is("th", tpl.render(context));
			context.now.setDate(20);
			t.is("th", tpl.render(context));
			context.now.setDate(21);
			t.is("st", tpl.render(context));
			context.now.setDate(22);
			t.is("nd", tpl.render(context));
			context.now.setDate(23);
			t.is("rd", tpl.render(context));
			context.now.setDate(24);
			t.is("th", tpl.render(context));
			context.now.setDate(25);
			t.is("th", tpl.render(context));
			context.now.setDate(26);
			t.is("th", tpl.render(context));
			context.now.setDate(27);
			t.is("th", tpl.render(context));
			context.now.setDate(28);
			t.is("th", tpl.render(context));
			context.now.setDate(29);
			t.is("th", tpl.render(context));
			context.now.setDate(30);
			t.is("th", tpl.render(context));
			context.now.setDate(31);
			t.is("st", tpl.render(context));
			context.now.setDate(1);

			tpl = new dd.Template('{{ now|date:"w" }}');
			t.is("1", tpl.render(context));

			tpl = new dd.Template('{{ now|date:"z" }}');
			t.is("0", tpl.render(context));

			tpl = new dd.Template('{{ now|date:"W" }}');
			t.is("1", tpl.render(context));
		},
		function test_filter_default(t){
			var dd = dojox.dtl;

			var context = new dd.Context();
			tpl = new dd.Template('{{ empty|default }}');
			t.is("", tpl.render(context));
			tpl = new dd.Template('{{ empty|default:"full" }}');
			t.is("full", tpl.render(context));
			context.empty = "not empty";
			t.is("not empty", tpl.render(context));
		},
		function test_filter_default_if_none(t){
			var dd = dojox.dtl;

			var context = new dd.Context();
			tpl = new dd.Template('{{ empty|default_if_none }}');
			t.is("", tpl.render(context));
			tpl = new dd.Template('{{ empty|default_if_none:"full" }}');
			t.is("", tpl.render(context));
			context.empty = null;
			t.is("full", tpl.render(context));
			context.empty = "not empty";
			t.is("not empty", tpl.render(context));
		},
		function test_filter_dictsort(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				fruit: [
					{ name: "lemons", toString: function(){ return this.name; } },
					{ name: "apples", toString: function(){ return this.name; } },
					{ name: "grapes", toString: function(){ return this.name; } }
				]
			});
 			tpl = new dd.Template('{{ fruit|dictsort|join:"|" }}');
			t.is("lemons|apples|grapes", tpl.render(context));
			tpl = new dd.Template('{{ fruit|dictsort:"name"|join:"|" }}');
			t.is("apples|grapes|lemons", tpl.render(context));
		},
		function test_filter_dictsort_reversed(t){
			var dd = dojox.dtl;

			context = new dd.Context({
				fruit: [
					{ name: "lemons", toString: function(){ return this.name; } },
					{ name: "apples", toString: function(){ return this.name; } },
					{ name: "grapes", toString: function(){ return this.name; } }
				]
			});
			tpl = new dd.Template('{{ fruit|dictsortreversed:"name"|join:"|" }}');
			t.is("lemons|grapes|apples", tpl.render(context));
		},
		function test_filter_divisibleby(t){
			var dd = dojox.dtl;

			context = new dd.Context();
			tpl = new dd.Template('{{ 4|divisibleby:"2" }}');
			t.is("true", tpl.render(context));
			context = new dd.Context({ number: 4 });
			tpl = new dd.Template('{{ number|divisibleby:3 }}');
			t.is("false", tpl.render(context));
		},
		function test_filter_escape(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ unescaped: "Try & cover <all> the \"major\" 'situations' at once" });
			tpl = new dd.Template('{{ unescaped|escape }}');
			t.is("Try &amp; cover &lt;all&gt; the &quot;major&quot; &#39;situations&#39; at once", tpl.render(context));
		},
		function test_filter_filesizeformat(t){
			var dd = dojox.dtl;

			var tpl = new dd.Template('{{ 1|filesizeformat }}');
			t.is("1 byte", tpl.render());
			tpl = new dd.Template('{{ 512|filesizeformat }}');
			t.is("512 bytes", tpl.render());
			tpl = new dd.Template('{{ 1024|filesizeformat }}');
			t.is("1.0 KB", tpl.render());
			tpl = new dd.Template('{{ 2048|filesizeformat }}');
			t.is("2.0 KB", tpl.render());
			tpl = new dd.Template('{{ 1048576|filesizeformat }}');
			t.is("1.0 MB", tpl.render());
			tpl = new dd.Template('{{ 1073741824|filesizeformat }}');
			t.is("1.0 GB", tpl.render());
		},
		function test_filter_first(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				fruit: [
					{ name: "lemons", toString: function(){ return this.name; } },
					{ name: "apples", toString: function(){ return this.name; } },
					{ name: "grapes", toString: function(){ return this.name; } }
				]
			});
			tpl = new dd.Template('{{ fruit|first }}');
			t.is("lemons", tpl.render(context));
		},
		function test_filter_fix_ampersands(t){
			var dd = dojox.dtl;

			var tpl = new dd.Template('{{ "One & Two"|fix_ampersands|safe }}');
			t.is("One &amp; Two", tpl.render());
		},
		function test_filter_floatformat(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ num1: 34.23234, num2: 34.00000 });
			var tpl = new dd.Template('{{ num1|floatformat }}');
			t.is("34.2", tpl.render(context));
			tpl = new dd.Template('{{ num2|floatformat }}');
			t.is("34", tpl.render(context));
			tpl = new dd.Template('{{ num1|floatformat:3 }}');
			t.is("34.232", tpl.render(context));
			tpl = new dd.Template('{{ num2|floatformat:3 }}');
			t.is("34.000", tpl.render(context));
			tpl = new dd.Template('{{ num1|floatformat:-3 }}');
			t.is("34.2", tpl.render(context));
			tpl = new dd.Template('{{ num2|floatformat:-3 }}');
			t.is("34", tpl.render(context));
		},
		function test_filter_get_digit(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ pi: 314159265 });
			var tpl = new dd.Template('{{ pi|get_digit:1 }}');
			t.is("3", tpl.render(context));
			tpl = new dd.Template('{{ pi|get_digit:"2" }}');
			t.is("1", tpl.render(context));
			tpl = new dd.Template('{{ pi|get_digit:0 }}');
			t.is("314159265", tpl.render(context));
			tpl = new dd.Template('{{ "nada"|get_digit:1 }}');
			t.is("0", tpl.render(context));
		},
		function test_filter_iriencode(t){
			var dd = dojox.dtl;

			var tpl = new dd.Template('{{ "http://homepage.com/~user"|urlencode|iriencode }}');
			t.is("http%3A//homepage.com/%7Euser", tpl.render());
			tpl = new dd.Template('{{ "pottedmeat@dojotoolkit.org"|iriencode }}');
			t.is("pottedmeat%40dojotoolkit.org", tpl.render());
		},
		function test_filter_join(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ items: ["foo", "bar", "baz" ]});
			var tpl = new dd.Template("{{ items|join }}");
			t.is("foo,bar,baz", tpl.render(context));

			tpl = new dd.Template('{{ items|join:"mustard" }}');
			t.is("foomustardbarmustardbaz", tpl.render(context));
		},
		function test_filter_length(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				fruit: [
					{ name: "lemons", toString: function(){ return this.name; } },
					{ name: "apples", toString: function(){ return this.name; } },
					{ name: "grapes", toString: function(){ return this.name; } }
				]
			});
			tpl = new dd.Template('{{ fruit|length }}');
			t.is("3", tpl.render(context));
			tpl = new dd.Template('{{ fruit|first|length }}');
			t.is("6", tpl.render(context));
		},
		function test_filter_length_is(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				fruit: [
					{ name: "lemons", toString: function(){ return this.name; } },
					{ name: "apples", toString: function(){ return this.name; } },
					{ name: "grapes", toString: function(){ return this.name; } }
				]
			});
			tpl = new dd.Template('{{ fruit|length_is:"3" }}');
			t.is("true", tpl.render(context));
			tpl = new dd.Template('{{ fruit|length_is:"4" }}');
			t.is("false", tpl.render(context));
		},
		function test_filter_linebreaks(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ unbroken: "This is just\r\n\n\ra bunch\nof text\n\n\nand such" });
			tpl = new dd.Template('{{ unbroken|linebreaks|safe }}');
			t.is("<p>This is just</p>\n\n<p>a bunch<br />of text</p>\n\n<p>and such</p>", tpl.render(context));
		},
		function test_filter_linebreaksbr(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ unbroken: "This is just\r\n\n\ra bunch\nof text\n\n\nand such" });
			tpl = new dd.Template('{{ unbroken|linebreaksbr|safe }}');
			t.is("This is just<br /><br />a bunch<br />of text<br /><br /><br />and such", tpl.render(context));
		},
		function test_filter_linenumbers(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ lines: "One\nTwo\nThree\nFour\n" });
			var tpl = new dd.Template('{{ lines|linenumbers }}');
			t.is("1. One\n2. Two\n3. Three\n4. Four\n5. ", tpl.render(context));
		},
		function test_filter_ljust(t){
			var dd = dojox.dtl;

			var context = new dd.Context();
			var tpl = new dd.Template('{{ narrow|ljust }}');
			context.narrow = "even";
			t.is("even", tpl.render(context));
			context.narrow = "odd";
			t.is("odd", tpl.render(context));
			tpl = new dd.Template('{{ narrow|ljust:"5" }}');
			context.narrow = "even";
			t.is("even ", tpl.render(context));
			context.narrow = "odd";
			t.is("odd  ", tpl.render(context));
			tpl = new dd.Template('{{ narrow|ljust:"6" }}');
			context.narrow = "even";
			t.is("even  ", tpl.render(context));
			context.narrow = "odd";
			t.is("odd   ", tpl.render(context));
			tpl = new dd.Template('{{ narrow|ljust:"12" }}');
			context.narrow = "even";
			t.is("even        ", tpl.render(context));
			context.narrow = "odd";
			t.is("odd         ", tpl.render(context));
		},
		function test_filter_lower(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ mixed: "MiXeD" });
			var tpl  = new dd.Template('{{ mixed|lower }}');
			t.is("mixed", tpl.render(context));
		},
		function test_filter_make_list(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ word: "foo", number: 314159265, arr: ["first", "second"], obj: {first: "first", second: "second"} });
			var tpl = new dd.Template('{{ word|make_list|join:"|" }} {{ number|make_list|join:"|" }} {{ arr|make_list|join:"|" }} {{ obj|make_list|join:"|" }}');
			t.is("f|o|o 3|1|4|1|5|9|2|6|5 first|second first|second", tpl.render(context));
		},
		function test_filter_phone2numeric(t){
			var dd = dojox.dtl;

			tpl = new dd.Template('{{ "1-800-pottedmeat"|phone2numeric }}');
			t.is("1-800-7688336328", tpl.render());
		},
		function test_filter_pluralize(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ animals: ["bear", "cougar", "aardvark"] });
			var tpl = new dd.Template('{{ animals|length }} animal{{ animals|length|pluralize }}');
			t.is("3 animals", tpl.render(context));
			context.animals = ["bear"];
			t.is("1 animal", tpl.render(context));
			context = new dd.Context({ fairies: ["tinkerbell", "Andy Dick" ]});
			tpl = new dd.Template('{{ fairies|length }} fair{{ fairies|length|pluralize:"y,ies" }}');
			t.is("2 fairies", tpl.render(context));
			context.fairies.pop();
			t.is("1 fairy", tpl.render(context));
		},
		function test_filter_pprint(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ animals: ["bear", "cougar", "aardvark"] });
			tpl = new dd.Template("{{ animals|pprint|safe }}");
			t.is('["bear","cougar","aardvark"]', tpl.render(context));
		},
		function test_filter_random(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				fruit: [
					{ name: "lemons", toString: function(){ return this.name; } },
					{ name: "apples", toString: function(){ return this.name; } },
					{ name: "grapes", toString: function(){ return this.name; } }
				]
			});
			tpl = new dd.Template('{{ fruit|random }}');
			result = tpl.render(context);
			t.t(result == "lemons" || result == "apples" || result == "grapes");
			var different = false;
			for(var i = 0; i < 10; i++){
				// Check to see if it changes
				if(result != tpl.render(context) && result == "lemons" || result == "apples" || result == "grapes"){
					different = true;
					break;
				}
			}
			t.t(different);
		},
		function test_filter_removetags(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ tagged: "I'm gonna do something <script>evil</script> with the <html>filter" });
			tpl = new dd.Template('{{ tagged|removetags:"script <html>"|safe }}');
			t.is("I'm gonna do something evil with the filter", tpl.render(context));
		},
		function test_filter_rjust(t){
			var dd = dojox.dtl;

			var context = new dd.Context();
			var tpl = new dd.Template('{{ narrow|rjust }}');
			context.narrow = "even";
			t.is("even", tpl.render(context));
			context.narrow = "odd";
			t.is("odd", tpl.render(context));
			tpl = new dd.Template('{{ narrow|rjust:"5" }}');
			context.narrow = "even";
			t.is(" even", tpl.render(context));
			context.narrow = "odd";
			t.is("  odd", tpl.render(context));
			tpl = new dd.Template('{{ narrow|rjust:"6" }}');
			context.narrow = "even";
			t.is("  even", tpl.render(context));
			context.narrow = "odd";
			t.is("   odd", tpl.render(context));
			tpl = new dd.Template('{{ narrow|rjust:"12" }}');
			context.narrow = "even";
			t.is("        even", tpl.render(context));
			context.narrow = "odd";
			t.is("         odd", tpl.render(context));
		},
		function test_filter_slice(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				fruit: [
					{ name: "lemons", toString: function(){ return this.name; } },
					{ name: "apples", toString: function(){ return this.name; } },
					{ name: "grapes", toString: function(){ return this.name; } }
				]
			});
			tpl = new dd.Template('{{ fruit|slice:":1"|join:"|" }}');
			t.is("lemons", tpl.render(context));
			tpl = new dd.Template('{{ fruit|slice:"1"|join:"|" }}');
			t.is("apples|grapes", tpl.render(context));
			tpl = new dd.Template('{{ fruit|slice:"1:3"|join:"|" }}');
			t.is("apples|grapes", tpl.render(context));
			tpl = new dd.Template('{{ fruit|slice:""|join:"|" }}');
			t.is("lemons|apples|grapes", tpl.render(context));
			tpl = new dd.Template('{{ fruit|slice:"-1"|join:"|" }}');
			t.is("grapes", tpl.render(context));
			tpl = new dd.Template('{{ fruit|slice:":-1"|join:"|" }}');
			t.is("lemons|apples", tpl.render(context));
			tpl = new dd.Template('{{ fruit|slice:"-2:-1"|join:"|" }}');
			t.is("apples", tpl.render(context));
		},
		function test_filter_slugify(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ unslugged: "Apples and oranges()"});
			tpl = new dd.Template('{{ unslugged|slugify }}');
			t.is("apples-and-oranges", tpl.render(context));
		},
		function test_filter_stringformat(t){
			var dd = dojox.dtl;

			var tpl = new dd.Template('{{ 42|stringformat:"7.3f" }}');
			t.is(" 42.000", tpl.render());
		},
		function test_filter_striptags(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ tagged: "I'm gonna do something <script>evil</script> with the <html>filter" });
			tpl = new dd.Template('{{ tagged|striptags|safe }}');
			t.is("I'm gonna do something evil with the filter", tpl.render(context));
		},
		function test_filter_time(t){
			var dd = dojox.dtl;
			var context = new dd.Context({ now: new Date(2007, 0, 1) });

			tpl = new dd.Template('{{ now|time }}');
			t.is(dojox.dtl.utils.date.format(context.now, "P"), tpl.render(context));
			tpl = new dd.Template('{{ now|time:"g" }}');
			t.is('12', tpl.render(context));
		},
		function test_filter_timesince(t){
			var dd = dojox.dtl;
			var context = new dd.Context({ now: new Date(2007, 0, 1), then: new Date(2007, 1, 1) });

			tpl = new dd.Template('{{ now|timesince:then }}');
			t.is("1 month", tpl.render(context));
			context.then = new Date(2007, 0, 5);
			t.is("4 days", tpl.render(context));
			context.then = new Date(2007, 0, 17);
			t.is("2 weeks", tpl.render(context));
			context.then = new Date(2008, 1, 1);
			t.is("1 year", tpl.render(context));
		},
		function test_filter_timeuntil(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ now: new Date(2007, 0, 1), then: new Date(2007, 1, 1) });
			var tpl = new dd.Template('{{ now|timeuntil:then }}');
			t.is("1 month", tpl.render(context));
			context.then = new Date(2007, 0, 5);
			t.is("4 days", tpl.render(context));
			context.then = new Date(2007, 0, 17);
			t.is("2 weeks", tpl.render(context));
			context.then = new Date(2008, 1, 1);
			t.is("1 year", tpl.render(context));
		},
		function test_filter_title(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ name: "potted meat" });
			var tpl = new dd.Template("{{ name|title|safe }}");
			t.is("Potted Meat", tpl.render(context));

			context.name = "What's going on?";
			t.is("What's Going On?", tpl.render(context));

			context.name = "use\nline\nbREAKs\tand tabs";
			t.is("Use\nLine\nBreaks\tAnd Tabs", tpl.render(context));
		},
		function test_filter_truncatewords(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ word: "potted meat writes a lot of tests" });
			var tpl = new dd.Template("{{ word|truncatewords }}");
			t.is(context.word, tpl.render(context));

			tpl = new dd.Template('{{ word|truncatewords:"1" }}');
			t.is("potted", tpl.render(context));

			tpl = new dd.Template('{{ word|truncatewords:"2" }}');
			t.is("potted meat", tpl.render(context));

			tpl = new dd.Template('{{ word|truncatewords:20" }}');
			t.is(context.word, tpl.render(context));

			context.word = "potted \nmeat   \nwrites  a lot of tests";
			tpl = new dd.Template('{{ word|truncatewords:"3" }}');
			t.is("potted \nmeat   \nwrites", tpl.render(context));
		},
		function test_filter_truncatewords_html(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				body: "Test a string <em>that ends <i>inside a</i> tag</em> with different args",
				size: 2
			})
			var tpl = new dd.Template('{{ body|truncatewords_html:size|safe }}');
			t.is("Test a ...", tpl.render(context));
			context.size = 4;
			t.is("Test a string <em>that ...</em>", tpl.render(context));
			context.size = 6;
			t.is("Test a string <em>that ends <i>inside ...</i></em>", tpl.render(context));
		},
		function test_filter_unordered_list(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ states: ["States", [["Kansas", [["Lawrence", []], ["Topeka", []]]], ["Illinois", []]]] });
			tpl = new dd.Template('{{ states|unordered_list|safe }}');
			t.is("\t<li>States\n\t<ul>\n\t\t<li>Kansas\n\t\t<ul>\n\t\t\t<li>Lawrence</li>\n\t\t\t<li>Topeka</li>\n\t\t</ul>\n\t\t</li>\n\t\t<li>Illinois</li>\n\t</ul>\n\t</li>", tpl.render(context));
		},
		function test_filter_upper(t){
			var dd = dojox.dtl;

			var context = new dd.Context({ mixed: "MiXeD" });
			var tpl  = new dd.Template('{{ mixed|upper }}');
			t.is("MIXED", tpl.render(context));
		},
		function test_filter_urlencode(t){
			var dd = dojox.dtl;

			var tpl = new dd.Template('{{ "http://homepage.com/~user"|urlencode }}');
			t.is("http%3A//homepage.com/%7Euser", tpl.render());

			// see http://bugs.dojotoolkit.org/ticket/12932
			tpl = new dd.Template('{{ "\t"|urlencode }}');
			t.is("\t", decodeURIComponent(tpl.render()));
		},
		function test_filter_urlize(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				body: "My favorite websites are www.televisionwithoutpity.com, http://daringfireball.net and you can email me at pottedmeat@sitepen.com"
			});
			var tpl = new dd.Template("{{ body|urlize|safe }}");
			t.is('My favorite websites are <a href="http://www.televisionwithoutpity.com" rel="nofollow">www.televisionwithoutpity.com</a> <a href="http://daringfireball.net" rel="nofollow">http://daringfireball.net</a> and you can email me at <a href="mailto:pottedmeat@sitepen.com">pottedmeat@sitepen.com</a>', tpl.render(context));
		},
		function test_filter_urlizetrunc(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				body: "My favorite websites are www.televisionwithoutpity.com, http://daringfireball.net and you can email me at pottedmeat@sitepen.com"
			});
			var tpl = new dd.Template("{{ body|urlizetrunc|safe }}");
			t.is('My favorite websites are <a href="http://www.televisionwithoutpity.com" rel="nofollow">www.televisionwithoutpity.com</a> <a href="http://daringfireball.net" rel="nofollow">http://daringfireball.net</a> and you can email me at <a href="mailto:pottedmeat@sitepen.com">pottedmeat@sitepen.com</a>', tpl.render(context));
			tpl = new dd.Template('{{ body|urlizetrunc:"2"|safe }}');
			t.is('My favorite websites are <a href="http://www.televisionwithoutpity.com" rel="nofollow">www.televisionwithoutpity.com</a> <a href="http://daringfireball.net" rel="nofollow">http://daringfireball.net</a> and you can email me at <a href="mailto:pottedmeat@sitepen.com">pottedmeat@sitepen.com</a>', tpl.render(context));
			tpl = new dd.Template('{{ body|urlizetrunc:"10"|safe }}');
			t.is('My favorite websites are <a href="http://www.televisionwithoutpity.com" rel="nofollow">www.tel...</a> <a href="http://daringfireball.net" rel="nofollow">http://...</a> and you can email me at <a href="mailto:pottedmeat@sitepen.com">pottedmeat@sitepen.com</a>', tpl.render(context));
		},
		function test_filter_wordcount(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				food: "Hot Pocket"
			});
			var tpl = new dd.Template("{{ food|wordcount }}");
			t.is("2", tpl.render(context));
			context.food = "";
			t.is("0", tpl.render(context));
			context.food = "A nice barbecue, maybe a little grilled veggies, some cole slaw.";
			t.is("11", tpl.render(context));
		},
		function test_filter_wordwrap(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				body: "shrimp gumbo, shrimp pie, shrimp scampi, shrimp stew, fried shrimp, baked shrimp, shrimp o grotten, grilled shrimp, shrimp on a stick, shrimp salad, shrimp pop overs, shrimp cake, shrimp legs, shrimp stuffed eggs, shrimp cre oll, shrimp soup, creamed shrimp on toast, shrimp crapes, shrimply good crescent rolls, shrimp pizza, scalloped shrimp, boiled shrimp, shrimp cocktail"
			});
			var tpl = new dd.Template("{{ body|wordwrap }}");
			t.is(context.body, tpl.render(context));
			tpl = new dd.Template("{{ body|wordwrap:width }}");
			context.width = 10;
			t.is("shrimp\ngumbo,\nshrimp\npie,\nshrimp\nscampi,\nshrimp\nstew,\nfried\nshrimp,\nbaked\nshrimp,\nshrimp o\ngrotten,\ngrilled\nshrimp,\nshrimp on\na stick,\nshrimp\nsalad,\nshrimp pop\novers,\nshrimp\ncake,\nshrimp\nlegs,\nshrimp\nstuffed\neggs,\nshrimp cre\noll,\nshrimp\nsoup,\ncreamed\nshrimp on\ntoast,\nshrimp\ncrapes,\nshrimply\ngood\ncrescent\nrolls,\nshrimp\npizza,\nscalloped\nshrimp,\nboiled\nshrimp,\nshrimp\ncocktail", tpl.render(context));
			tpl = new dd.Template('{{ body|wordwrap:"80" }}');
			t.is("shrimp gumbo, shrimp pie, shrimp scampi, shrimp stew, fried shrimp, baked\nshrimp, shrimp o grotten, grilled shrimp, shrimp on a stick, shrimp salad,\nshrimp pop overs, shrimp cake, shrimp legs, shrimp stuffed eggs, shrimp cre oll,\nshrimp soup, creamed shrimp on toast, shrimp crapes, shrimply good crescent\nrolls, shrimp pizza, scalloped shrimp, boiled shrimp, shrimp cocktail", tpl.render(context));
		},
		function test_filter_yesno(t){
			var dd = dojox.dtl;

			var context = new dd.Context();
			tpl = new dd.Template('{{ true|yesno }}');
			t.is("yes", tpl.render(context));
			context = new dd.Context({ test: "value" });
			tpl = new dd.Template('{{ test|yesno }}');
			t.is("yes", tpl.render(context));
			tpl = new dd.Template('{{ false|yesno }}');
			t.is("no", tpl.render(context));
			tpl = new dd.Template('{{ null|yesno }}');
			t.is("maybe", tpl.render(context));
			tpl = new dd.Template('{{ true|yesno:"bling,whack,soso" }}');
			t.is("bling", tpl.render(context));
			context = new dd.Context({ test: "value" });
			tpl = new dd.Template('{{ test|yesno:"bling,whack,soso" }}');
			t.is("bling", tpl.render(context));
			tpl = new dd.Template('{{ false|yesno:"bling,whack,soso" }}');
			t.is("whack", tpl.render(context));
			tpl = new dd.Template('{{ null|yesno:"bling,whack,soso" }}');
			t.is("soso", tpl.render(context));
			tpl = new dd.Template('{{ null|yesno:"bling,whack" }}');
			t.is("whack", tpl.render(context));
		},
		function test_filter_contrib_key(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				headers: ["action", "type"],
				items: [
					{
						action: "eat",
						type: "apple"
					},
					{
						action: "mash",
						type: "banana"
					}
				]
			});

			var tpl = new dd.Template("{% load dojox.dtl.contrib.objects %}<ul>{% for item in items %}<li><ul>{% for header in headers %}<li>{{ header }}: {{ item|key:header }}</li>{% endfor %}</ul></li>{% endfor %}</ul>");
			t.is('<ul><li><ul><li>action: eat</li><li>type: apple</li></ul></li><li><ul><li>action: mash</li><li>type: banana</li></ul></li></ul>', tpl.render(context));
		}
	]
);
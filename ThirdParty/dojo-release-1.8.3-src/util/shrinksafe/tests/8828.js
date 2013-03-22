var result = [], string_tests;

(function(){
	// testing string munging

	var n = "c";
	result.push("a" + "b", "a" + n);

	var ll = "+";
	result.push(ll);

	var color = "red";
	var f = "The" + "Quick" + color + "Fox";
	result.push(f);

	var h = 4;
	var multiline = "this" +
		"is" + "a" + "test"
		+ "spanning" +
		h + "lines"
	;
	result.push(multiline);

	// aliases. all "bar"
	var a = "bar", b = 'bar', c = a;

	// a multi-line string outside of the array
	var ml = "testing" +
		"multiple" +
		"lines";

	var val = [
		"test" + "ing",
		"test" + a + "simple",
		"testing" + "combined" + b + "variables",
		"test \"+" + "weird syntax",
		'test' + 'basic',
		'test "mixed"',
		ml,
		'test "mixed" and' + 'munge',
		"t" + "e" + "s" + "t",
		"t" + "e" + "s" + c + "t",
		// weirdest example imaginable?:
		'"slightly"+"off"',
		// fail:
		!"a" + "b",
		(!"a") + "b",
		!("a") + "b"
	];

	string_tests = function(){
		return val;
	}

})();
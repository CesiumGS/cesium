define(["../main", "doh/main", "../back"], function(dojo, doh){
	doh.register("tests.back.hash", [
		function getAndSet(t){
			var cases = [
				"test",
				"test with spaces",
				"test%20with%20encoded",
				"test+with+pluses",
				" leading",
				"trailing ",
				"under_score",
				"extra#mark",
				"extra?instring",
				"extra&instring",
				"#leadinghash"
			];
			var b = dojo.back;
			function verify(s){
				dojo.back.setHash(s);
				t.is(s, dojo.back.getHash(s));
			}
			dojo.forEach(cases, verify);
		}
	]);
});

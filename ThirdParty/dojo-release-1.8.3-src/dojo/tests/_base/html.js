define(["dojo/has", "doh/main", "require"], function(has, doh, require){
	if(doh.isBrowser){
		doh.register("tests._base.html", require.toUrl("./html.html"), 15000);
		doh.register("tests._base.html_id", require.toUrl("./html_id.html"), 15000);
		doh.register("tests._base.html_element", require.toUrl("./html_element.html"), 15000);
		doh.register("tests._base.html_rtl", require.toUrl("./html_rtl.html"), 15000);
		// IE9+ cannot handle loading quirks mode documents inside the test runner, see #14321
		has("ie") >= 9 || doh.register("tests._base.html_quirks", require.toUrl("./html_quirks.html"), 15000);
		doh.register("tests._base.html_box", require.toUrl("./html_box.html"), 35000);
		has("ie") >= 9 || doh.register("tests._base.html_box_quirks", require.toUrl("./html_box_quirks.html"), 35000);
		doh.register("tests._base.html_isBodyLtr", require.toUrl("./html_isBodyLtr.html"), 35000);
		doh.register("tests._base.html_docScroll", require.toUrl("./html_docScroll.html"), 35000);
	}
});

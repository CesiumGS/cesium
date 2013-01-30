define(["doh/runner"], function(doh){
	try{
		var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g, "").replace(/^&/, "?");
		doh.registerUrl("dojox.mvc.tests.WidgetList_tests.doh_mvc_DOMNode-search-results-repeat", require.toUrl("dojox/mvc/tests/WidgetList_tests/doh_mvc_DOMNode-search-results-repeat.html" + userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.WidgetList_tests.doh_mvc_mobile-demo", require.toUrl("dojox/mvc/tests/WidgetList_tests/doh_mvc_mobile-demo.html" + userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.WidgetList_tests.doh_mvc_new_ref-set-repeat", require.toUrl("dojox/mvc/tests/WidgetList_tests/doh_mvc_new_ref-set-repeat.html" + userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.WidgetList_tests.doh_mvc_performance_search-results-repeat", require.toUrl("dojox/mvc/tests/WidgetList_tests/doh_mvc_performance_search-results-repeat.html" + userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.WidgetList_tests.doh_mvc_programmatic-repeat-store", require.toUrl("dojox/mvc/tests/WidgetList_tests/doh_mvc_programmatic-repeat-store.html" + userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.WidgetList_tests.doh_mvc_repeat_select_cancel", require.toUrl("dojox/mvc/tests/WidgetList_tests/doh_mvc_repeat_select_cancel.html" + userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.WidgetList_tests.doh_mvc_repeat_select_manualsave", require.toUrl("dojox/mvc/tests/WidgetList_tests/doh_mvc_repeat_select_manualsave.html" + userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.WidgetList_tests.doh_mvc_search-results-repeat", require.toUrl("dojox/mvc/tests/WidgetList_tests/doh_mvc_search-results-repeat.html" + userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.WidgetList_tests.doh_mvc_search-results-repeat-store", require.toUrl("dojox/mvc/tests/WidgetList_tests/doh_mvc_search-results-repeat-store.html" + userArgs), 999999);
		doh.registerUrl("dojox.mvc.tests.WidgetList_tests.doh_new-mvc_label_and_totals", require.toUrl("dojox/mvc/tests/WidgetList_tests/doh_new-mvc_label_and_totals.html" + userArgs), 999999);
	}catch(e){
		doh.debug(e);
	}
});


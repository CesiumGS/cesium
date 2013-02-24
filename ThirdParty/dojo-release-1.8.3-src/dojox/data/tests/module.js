dojo.provide("dojox.data.tests.module");

try{
	dojo.require("dojox.data.tests.ClientFilter");
	dojo.require("dojox.data.tests.stores.CsvStore");
	dojo.require("dojox.data.tests.stores.KeyValueStore");
	dojo.require("dojox.data.tests.stores.AndOrReadStore");
	dojo.require("dojox.data.tests.stores.AndOrWriteStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.HtmlTableStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.HtmlStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.OpmlStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.XmlStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.FlickrStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.FlickrRestStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.PicasaStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.AtomReadStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.GoogleSearchStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.GoogleFeedStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.WikipediaStore");

	//Load only if in a browser AND if the location is remote (not file.  As it needs a PHP server to work).
	if(dojo.isBrowser){
		if(window.location.protocol !== "file:"){
			dojo.require("dojox.data.tests.stores.QueryReadStore");
			dojo.require("dojox.data.tests.stores.SnapLogicStore");
			dojo.require("dojox.data.tests.stores.FileStore");
		}
	}
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.CssRuleStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.CssClassStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.AppStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.stores.OpenSearchStore");
	dojo.requireIf(dojo.isBrowser, "dojox.data.tests.dom");
}catch(e){
	doh.debug(e);
}




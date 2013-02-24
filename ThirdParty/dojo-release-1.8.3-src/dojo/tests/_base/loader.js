define([
	"dojo",
	"doh",
	"require",
	"dojo/sniff",
	"dojo/has!dojo-publish-privates?./loader/core",
	"dojo/has!dojo-amd-factory-scan?./loader/modules",
	"dojo/has!dojo-publish-privates?./loader/moduleIds",
	"./loader/bootstrap"], function(dojo, doh, require, has){
	if(doh.isBrowser){
		doh.register("tests._base.loader.asyncWithDojoRequire", require.toUrl("./loader/asyncWithDojoRequire.html"));

		doh.register("tests._base.loader.config?dojoConfig-djConfig-require", require.toUrl("./loader/config.html")+"?dojoConfig-djConfig-require");
		doh.register("tests._base.loader.config?dojoConfig-require", require.toUrl("./loader/config.html")+"?dojoConfig-require");
		doh.register("tests._base.loader.config?dojoConfig-djConfig", require.toUrl("./loader/config.html")+"?dojoConfig-djConfig");
		doh.register("tests._base.loader.config?dojoConfig", require.toUrl("./loader/config.html")+"?dojoConfig");
		doh.register("tests._base.loader.config?djConfig-require", require.toUrl("./loader/config.html")+"?djConfig-require");
		doh.register("tests._base.loader.config?djConfig", require.toUrl("./loader/config.html")+"?djConfig");
		doh.register("tests._base.loader.config?require", require.toUrl("./loader/config.html")+"?require");
		if(has("dojo-publish-privates")){
			doh.register("tests._base.loader.config?configApi.html", require.toUrl("./loader/configApi.html"));
		}
		doh.register("tests._base.loader.config?config-sniff.html", require.toUrl("./loader/config-sniff.html"));
		doh.register("tests._base.loader.config?config-sniff-djConfig.html", require.toUrl("./loader/config-sniff-djConfig.html"));
		doh.register("tests._base.loader.config?config-has.html", require.toUrl("./loader/config-has.html"));
		//TODO: doh.register("tests._base.loader.cdn-load", require.toUrl("./loader/cdnTest.html"));
		doh.register("tests._base.loader.loader-declareStepsOnProvide", require.toUrl("./loader/declareStepsOnProvide.html"));

		doh.register("tests._base.loader.publish-require-result", require.toUrl("./loader/publishRequireResult.html"));
		doh.register("tests._base.loader.no-publish-require-result", require.toUrl("./loader/publishRequireResult.html")+"?do-not-publish");

		doh.register("tests._base.loader.top-level-module-by-paths", require.toUrl("./loader/paths.html"));
		doh.register("tests._base.loader.xdomin-sync-1", require.toUrl("./loader/xdomain/xdomain.html"), {async:0, variation:1});
		doh.register("tests._base.loader.xdomin-sync-2", require.toUrl("./loader/xdomain/xdomain.html"), {async:0, variation:2});
		doh.register("tests._base.loader.xdomin-async-1", require.toUrl("./loader/xdomain/xdomain.html"), {async:"legacyAsync", variation:1});
		doh.register("tests._base.loader.xdomin-async-2", require.toUrl("./loader/xdomain/xdomain.html"), {async:"legacyAsync", variation:2});
		// the requirejs test suite. The following tests are not used:
		//
		//	 * baseUrl: dojo's baseUrl is different--it defaults to the dojo tree. See TODO
		//	 * layers: dojo's build system does things differently
		//	 * afterload: is not constructed in a way that works with doh
		//	 * plugin/sync: this test seems like it will always fail in async mode; TODO check with James
        //
		doh.register("tests._base.loader.requirejs-simple-sync", require.toUrl("./loader/requirejs/simple.html"), {async:0});
		doh.register("tests._base.loader.requirejs-simple-async", require.toUrl("./loader/requirejs/simple.html"), {async:1});

		doh.register("tests._base.loader.requirejs-config-sync", require.toUrl("./loader/requirejs/config.html"), {async:0});
		doh.register("tests._base.loader.requirejs-config-async", require.toUrl("./loader/requirejs/config.html"), {async:1});

		if(has("dojo-requirejs-api")){
			doh.register("tests._base.loader.requirejs-dataMain-sync", require.toUrl("./loader/requirejs/dataMain.html"), {async:0});
			doh.register("tests._base.loader.requirejs-dataMain-async", require.toUrl("./loader/requirejs/dataMain.html"), {async:1});
		}
		doh.register("tests._base.loader.requirejs-simple-nohead-sync", require.toUrl("./loader/requirejs/simple-nohead.html"), {async:0});
		doh.register("tests._base.loader.requirejs-simple-nohead-async", require.toUrl("./loader/requirejs/simple-nohead.html"), {async:1});

		function compactPath(path){
			var
				result= [],
				segment, lastSegment;
		    path= path.split("/");
			while(path.length){
				segment= path.shift();
				if(segment==".." && result.length && lastSegment!=".."){
					result.pop();
				}else if(segment!="."){
					result.push(lastSegment= segment);
				} // else ignore "."
			}
			return result.join("/");
		}
		var
			qstart= location.href.indexOf(location.search),
		    root= qstart!=-1 ? location.href.substring(0, qstart) : location.href,
			setup= compactPath(root + "/../" + require.toUrl("./loader/requirejs/requirejs-setup.js")),
			baseUrl= setup.substring(0, setup.length - "/requirejs-setup.js".length);
		if(has("ie")>6){
			doh.register("tests._base.loader.requirejs-simple-badbase-sync", require.toUrl("./loader/requirejs/simple-badbase.html"), {
				async:0,
				baseUrl:baseUrl,
				setup:setup,
				dojo:compactPath(root + "/../" + require.toUrl("../../dojo.js"))
			});
		}
		doh.register("tests._base.loader.requirejs-simple-badbase-async", require.toUrl("./loader/requirejs/simple-badbase.html"), {
			async:1,
			baseUrl:baseUrl,
			setup:setup,
			dojo:compactPath(root + "/../" + require.toUrl("../../dojo.js"))
		});

		//doh.register("tests._base.loader.requirejs-circular-sync", require.toUrl("./loader/requirejs/circular.html"), {async:0});
		doh.register("tests._base.loader.requirejs-circular-async", require.toUrl("./loader/requirejs/circular.html"), {async:1});

		if(has("dojo-requirejs-api")){
			doh.register("tests._base.loader.requirejs-depoverlap-sync", require.toUrl("./loader/requirejs/depoverlap.html"), {async:0});
			doh.register("tests._base.loader.requirejs-depoverlap-async", require.toUrl("./loader/requirejs/depoverlap.html"), {async:1});
		}

		doh.register("tests._base.loader.requirejs-urlfetch-sync", require.toUrl("./loader/requirejs/urlfetch/urlfetch.html"), {async:0});
		doh.register("tests._base.loader.requirejs-urlfetch-async", require.toUrl("./loader/requirejs/urlfetch/urlfetch.html"), {async:1});

		if(has("dojo-amd-factory-scan")){
			doh.register("tests._base.loader.requirejs-uniques-sync", require.toUrl("./loader/requirejs/uniques/uniques.html"), {async:0});
			doh.register("tests._base.loader.requirejs-uniques-async", require.toUrl("./loader/requirejs/uniques/uniques.html"), {async:1});
		}
//>>excludeStart("requireJSI18nTests", kwArgs.insertAbsMids);
		doh.register("tests._base.loader.requirejs-i18nlocaleunknown-sync", require.toUrl("./loader/requirejs/i18n/i18n.html")+"?bundle=i18n!nls/fr-fr/colors", {async:0});
		doh.register("tests._base.loader.requirejs-i18nlocaleunknown-async", require.toUrl("./loader/requirejs/i18n/i18n.html")+"?bundle=i18n!nls/fr-fr/colors", {async:1});

		doh.register("tests._base.loader.requirejs-i18n-sync", require.toUrl("./loader/requirejs/i18n/i18n.html"), {async:0});
		doh.register("tests._base.loader.requirejs-i18n-async", require.toUrl("./loader/requirejs/i18n/i18n.html"), {async:1});

		doh.register("tests._base.loader.requirejs-i18nlocale-sync", require.toUrl("./loader/requirejs/i18n/i18n.html")+"?locale=en-us-surfer", {async:0});
		doh.register("tests._base.loader.requirejs-i18nlocale-async", require.toUrl("./loader/requirejs/i18n/i18n.html")+"?locale=en-us-surfer", {async:1});

		doh.register("tests._base.loader.requirejs-i18nbundle-sync", require.toUrl("./loader/requirejs/i18n/i18n.html")+"?bundle=i18n!nls/en-us-surfer/colors", {async:0});
		doh.register("tests._base.loader.requirejs-i18nbundle-async", require.toUrl("./loader/requirejs/i18n/i18n.html")+"?bundle=i18n!nls/en-us-surfer/colors", {async:1});

		doh.register("tests._base.loader.requirejs-i18ncommon-sync", require.toUrl("./loader/requirejs/i18n/common.html"), {async:0});
		doh.register("tests._base.loader.requirejs-i18ncommon-async", require.toUrl("./loader/requirejs/i18n/common.html"), {async:1});

		doh.register("tests._base.loader.requirejs-i18ncommonlocale-sync", require.toUrl("./loader/requirejs/i18n/common.html")+"?locale=en-us-surfer", {async:0});
		doh.register("tests._base.loader.requirejs-i18ncommonlocale-async", require.toUrl("./loader/requirejs/i18n/common.html")+"?locale=en-us-surfer", {async:1});
//>>excludeEnd("requireJSI18nTests");
		doh.register("tests._base.loader.requirejs-paths-sync", require.toUrl("./loader/requirejs/paths/paths.html"), {async:0});
		doh.register("tests._base.loader.requirejs-paths-async", require.toUrl("./loader/requirejs/paths/paths.html"), {async:1});

		doh.register("tests._base.loader.requirejs-relative-sync", require.toUrl("./loader/requirejs/relative/relative.html"), {async:0});
		doh.register("tests._base.loader.requirejs-relative-async", require.toUrl("./loader/requirejs/relative/relative.html"), {async:1});

		doh.register("tests._base.loader.requirejs-text-sync", require.toUrl("./loader/requirejs/text/text.html"), {async:0});
		doh.register("tests._base.loader.requirejs-text-async", require.toUrl("./loader/requirejs/text/text.html"), {async:1});
		doh.register("tests._base.loader.requirejs-text-sync", require.toUrl("./loader/requirejs/text/text.html"), {async:0, aliasTest:1});
		doh.register("tests._base.loader.requirejs-text-async", require.toUrl("./loader/requirejs/text/text.html"), {async:1, aliasTest:1});

		doh.register("tests._base.loader.requirejs-textOnly-sync", require.toUrl("./loader/requirejs/text/textOnly.html"), {async:0});
		doh.register("tests._base.loader.requirejs-textOnly-async", require.toUrl("./loader/requirejs/text/textOnly.html"), {async:1});

		doh.register("tests._base.loader.requirejs-exports-sync", require.toUrl("./loader/requirejs/exports/exports.html"), {async:0});
		doh.register("tests._base.loader.requirejs-exports-async", require.toUrl("./loader/requirejs/exports/exports.html"), {async:1});

		doh.register("tests._base.loader.require-config", require.toUrl("./loader/config/test.html"), {async:1});
	}
});


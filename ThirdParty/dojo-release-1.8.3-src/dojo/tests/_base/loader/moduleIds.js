define(["doh", "dojo", "dojo/_base/url"], function(doh, dojo){

	var compactPath = function(path){
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
	};

	doh.register("dojo.tests._base._loader.modulesIds", [
		function compactPath(t){
			var compactPath = require.compactPath;
			t.is(compactPath("../../dojo/../../mytests"), "../../../mytests");
			t.is(compactPath("module"), "module");
			t.is(compactPath("a/./b"), "a/b");
			t.is(compactPath("a/../b"), "b");
			t.is(compactPath("a/./b/./c/./d"), "a/b/c/d");
			t.is(compactPath("a/../b/../c/../d"), "d");
			t.is(compactPath("a/b/c/../../d"), "a/d");
			t.is(compactPath("a/b/c/././d"), "a/b/c/d");
			t.is(compactPath("./a/b"), "a/b");
			t.is(compactPath("../a/b"), "../a/b");
			t.is(compactPath(""), "");
		},

		function testModuleIds(t){
			require({
				packages:[{
					// canonical...
					name:"pack1",
					location:"../packages/pack1Root"
				}, {
					// nonstandard main
					name:"pack2",
					main:"pack2Main",
					location:"/pack2Root"
				}, {
					// nonstandard main
					name:"pack3",
					main:"public/main",
					location:"/pack3Root"
				}]
			});

			function get(mid, refmod){
				return require.getModuleInfo(mid, refmod, require.packs, require.modules, "../../dojo/", require.mapProgs, require.pathsMapProg, 1);
			}

			function check(result, expectedPid, expectedMidSansPid, expectedUrl){
				t.is(result.pid, expectedPid);
				t.is(result.mid, expectedPid + "/" + expectedMidSansPid);
				t.is(result.url, expectedUrl + ".js");
			}

            // non-relative module id resolution...

			var pack1Root= "../../packages/pack1Root/";

			// the various mains...
			check(get("pack1"), "pack1", "main", pack1Root + "main");
			check(get("pack2"), "pack2", "pack2Main", "/pack2Root/pack2Main");
			check(get("pack3"), "pack3", "public/main", "/pack3Root/public/main");

			// modules...
			check(get("pack1/myModule"), "pack1", "myModule", pack1Root + "myModule");
			check(get("pack2/myModule"), "pack2", "myModule", "/pack2Root/myModule");
			check(get("pack3/myModule"), "pack3", "myModule", "/pack3Root/myModule");

			// relative module id resolution; relative to module in top-level
			var refmod= {mid:"pack1/main", pack:require.packs.pack1};
			check(get(".", refmod), "pack1", "main", pack1Root + "main");
			check(get("./myModule", refmod), "pack1", "myModule", pack1Root + "myModule");
			check(get("./myModule/mySubmodule", refmod), "pack1", "myModule/mySubmodule", pack1Root + "myModule/mySubmodule");

			// relative module id resolution; relative to module
			refmod= {mid:"pack1/sub/publicModule", pack:require.packs.pack1};
			check(get(".", refmod), "pack1", "sub", pack1Root + "sub");
			check(get("./myModule", refmod), "pack1", "sub/myModule", pack1Root + "sub/myModule");
			check(get("..", refmod), "pack1", "main", pack1Root + "main");
			check(get("../myModule", refmod), "pack1", "myModule", pack1Root + "myModule");
			check(get("../util/myModule", refmod), "pack1", "util/myModule", pack1Root + "util/myModule");
		},

		function baseUrl(t){
			var originalBaseUrl = dojo.config["baseUrl"] || "./";

			t.assertEqual(originalBaseUrl, dojo.baseUrl);
		},

		function moduleUrl(t){
			var expected = require.toUrl("dojo/tests/myTest.html");
			t.is(null, dojo.moduleUrl());
			t.is(null, dojo.moduleUrl(null));
			t.is(null, dojo.moduleUrl(null, "myTest.html"));
			// note we expect a trailing slash
			t.is(expected.substring(0, expected.length - 11), dojo.moduleUrl("dojo.tests"));
			t.is(expected, dojo.moduleUrl("dojo.tests", "myTest.html"));
		},

		function modulePaths(t){
			dojo.registerModulePath("mycoolmod", "../some/path/mycoolpath");
			dojo.registerModulePath("mycoolmod.widget", "http://some.domain.com/another/path/mycoolpath/widget");

			t.assertEqual(compactPath(require.baseUrl + "../some/path/mycoolpath/util/"), dojo.moduleUrl("mycoolmod.util"));
			t.assertEqual("http://some.domain.com/another/path/mycoolpath/widget/", dojo.moduleUrl("mycoolmod.widget"));
			t.assertEqual("http://some.domain.com/another/path/mycoolpath/widget/thingy/", dojo.moduleUrl("mycoolmod.widget.thingy"));
		},

		function moduleUrls(t){
			dojo.registerModulePath("mycoolmod", "some/path/mycoolpath");
			dojo.registerModulePath("mycoolmod2", "/some/path/mycoolpath2");
			dojo.registerModulePath("mycoolmod.widget", "http://some.domain.com/another/path/mycoolpath/widget");
			dojo.registerModulePath("ipv4.widget", "http://ipv4user:ipv4passwd@some.domain.com:2357/another/path/ipv4/widget");
			dojo.registerModulePath("ipv6.widget", "ftp://ipv6user:ipv6passwd@[::2001:0db8:3c4d:0015:0:0:abcd:ef12]:1113/another/path/ipv6/widget");
			dojo.registerModulePath("ipv6.widget2", "https://[0:0:0:0:0:1]/another/path/ipv6/widget2");


			var basePrefix = require.baseUrl;

			t.assertEqual(compactPath(basePrefix + "some/path/mycoolpath/my/favorite.html"),
				dojo.moduleUrl("mycoolmod", "my/favorite.html"));
			t.assertEqual(compactPath(basePrefix + "some/path/mycoolpath/my/favorite.html"),
				dojo.moduleUrl("mycoolmod.my", "favorite.html"));

			t.assertEqual("/some/path/mycoolpath2/my/favorite.html",
				dojo.moduleUrl("mycoolmod2", "my/favorite.html"));
			t.assertEqual("/some/path/mycoolpath2/my/favorite.html",
				dojo.moduleUrl("mycoolmod2.my", "favorite.html"));

			t.assertEqual("http://some.domain.com/another/path/mycoolpath/widget/my/favorite.html",
				dojo.moduleUrl("mycoolmod.widget", "my/favorite.html"));
			t.assertEqual("http://some.domain.com/another/path/mycoolpath/widget/my/favorite.html",
				dojo.moduleUrl("mycoolmod.widget.my", "favorite.html"));

			// individual component testing
			t.assertEqual("http://ipv4user:ipv4passwd@some.domain.com:2357/another/path/ipv4/widget/components.html",
				(new dojo._Url(dojo.moduleUrl("ipv4.widget", "components.html"))).uri);
			t.assertEqual("http",
				(new dojo._Url(dojo.moduleUrl("ipv4.widget", "components.html"))).scheme);
			t.assertEqual("ipv4user:ipv4passwd@some.domain.com:2357",
				(new dojo._Url(dojo.moduleUrl("ipv4.widget", "components.html"))).authority);
			t.assertEqual("ipv4user",
				(new dojo._Url(dojo.moduleUrl("ipv4.widget", "components.html"))).user);
			t.assertEqual("ipv4passwd",
				(new dojo._Url(dojo.moduleUrl("ipv4.widget", "components.html"))).password);
			t.assertEqual("some.domain.com",
				(new dojo._Url(dojo.moduleUrl("ipv4.widget", "components.html"))).host);
			t.assertEqual("2357",
				(new dojo._Url(dojo.moduleUrl("ipv4.widget", "components.html"))).port);
			t.assertEqual("/another/path/ipv4/widget/components.html",
				(new dojo._Url(dojo.moduleUrl("ipv4.widget", "components.html?query"))).path);
			t.assertEqual("q=somequery",
				(new dojo._Url(dojo.moduleUrl("ipv4.widget", "components.html?q=somequery"))).query);
			t.assertEqual("fragment",
				(new dojo._Url(dojo.moduleUrl("ipv4.widget", "components.html#fragment"))).fragment);

			t.assertEqual("ftp://ipv6user:ipv6passwd@[::2001:0db8:3c4d:0015:0:0:abcd:ef12]:1113/another/path/ipv6/widget/components.html",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget", "components.html"))).uri);
			t.assertEqual("ftp",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget", "components.html"))).scheme);
			t.assertEqual("ipv6user:ipv6passwd@[::2001:0db8:3c4d:0015:0:0:abcd:ef12]:1113",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget", "components.html"))).authority);
			t.assertEqual("ipv6user",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget", "components.html"))).user);
			t.assertEqual("ipv6passwd",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget", "components.html"))).password);
			t.assertEqual("::2001:0db8:3c4d:0015:0:0:abcd:ef12",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget", "components.html"))).host);
			t.assertEqual("1113",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget", "components.html"))).port);
			t.assertEqual("/another/path/ipv6/widget/components.html",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget", "components.html?query"))).path);
			t.assertEqual("somequery",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget", "components.html?somequery"))).query);
			t.assertEqual("somefragment",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget", "components.html?somequery#somefragment"))).fragment);

			t.assertEqual("https://[0:0:0:0:0:1]/another/path/ipv6/widget2/components.html",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget2", "components.html"))).uri);
			t.assertEqual("https",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget2", "components.html"))).scheme);
			t.assertEqual("[0:0:0:0:0:1]",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget2", "components.html"))).authority);
			t.assertEqual(null,
				(new dojo._Url(dojo.moduleUrl("ipv6.widget2", "components.html"))).user);
			t.assertEqual(null,
				(new dojo._Url(dojo.moduleUrl("ipv6.widget2", "components.html"))).password);
			t.assertEqual("0:0:0:0:0:1",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget2", "components.html"))).host);
			t.assertEqual(null,
				(new dojo._Url(dojo.moduleUrl("ipv6.widget2", "components.html"))).port);
			t.assertEqual("/another/path/ipv6/widget2/components.html",
				(new dojo._Url(dojo.moduleUrl("ipv6.widget2", "components.html"))).path);
			t.assertEqual(null,
				(new dojo._Url(dojo.moduleUrl("ipv6.widget2", "components.html"))).query);
			t.assertEqual(null,
				(new dojo._Url(dojo.moduleUrl("ipv6.widget2", "components.html"))).fragment);
		}
	]);
});


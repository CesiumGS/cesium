define(['doh', 'dojo/_base/kernel', 'dojo/_base/xhr', 'dojox/io/xhrPlugins', 'dojo/_base/url'], function(doh, dojo, xhr, xhrPlugins){

xhrPlugins.addXdr("http://xdrsupportingsite.com/"); // make sure the registry is setup
var url = dojo.moduleUrl("dojox.io", "tests/crossSite.php");
url = url.toString();

doh.register("dojox.io.tests.xhrPlugins", [
	function getLocal(t){
		var d = new doh.Deferred();
		var dfd = xhr("GET",{url:url});
		dfd.addCallback(function(result){
			d.callback(result.match(/response/));
		});
		return d;
	},

	function crossSiteRequest(t){
		// Note: this isn't really testing much unless you are using IE8 (XDomainRequest) or a
		// browser that supports cross-site XHR (maybe FF3.1?)
		var d = new doh.Deferred();
		// persevere supports both XDR and cross-site XHR so we can use it for cross-site testing for now
		dojox.io.xhrPlugins.addXdr("http://persevere.sitepen.com/");
		dojox.io.xhrPlugins.addCrossSiteXhr("http://persevere.sitepen.com/");
		try {
			var dfd = xhr("GET",{url:"http://persevere.sitepen.com/SMD"});
		}
		catch (e){
			if(e.message.match(/No match/)){
				return null; // this browser doesn't support this transport
			}
			throw e;
		}
		dfd.addCallback(function(result){
			d.callback(result.match(/transport/));
		});
		// TODO: This should run off a fixed URL on some Dojo server.
		
/*		dojox.io.xhrPlugins.addXdr("http://dojotoolkit.org/...");
		dojox.io.xhrPlugins.addCrossSiteXhr("http://dojotoolkit.org/...");
				
		var dfd = xhr("GET",{url:"http://dojotoolkit.org/.../dojox/io/tests/crossSite.php"});
		dfd.addCallback(function(result){
			d.callback(result.match(/response/));
		}); */
		return d;
	},
	function proxiedRequest(t){
		var d = new doh.Deferred();
		dojox.io.xhrPlugins.addProxy(url+"?url=");

		var dfd = xhr("GET",{url:"http://someforeignsite.com/SMD"});
		dfd.addCallback(function(result){
			d.callback(result.match(/proxied/));
		});
		return d;
	}
]);

});

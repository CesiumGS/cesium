define([
	"require",
	"doh/main",
	"./request/handlers",
	"../has!host-node?./request/node"
], function(require, doh){
	if(doh.isBrowser){
		doh.register("tests.request.xhr", require.toUrl("./request/xhr.html"), 60000);
		doh.register("tests.request.script", require.toUrl("./request/script.html"), 60000);
		doh.register("tests.request.iframe", require.toUrl("./request/iframe.html"), 60000);
		doh.register("tests.request.registry", require.toUrl("./request/registry.html"), 60000);
		doh.register("tests.request.notify", require.toUrl("./request/notify.html"), 60000);
	}
});

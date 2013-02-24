define([
	"doh/runner",
	"dojo/has!host-browser?doh/_browserRunner",
	"dojo/has!host-node?doh/_nodeRunner",
	"dojo/has!host-rhino?doh/_rhinoRunner"], function(doh) {
	return doh;
});

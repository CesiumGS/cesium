define("test/Module", ["dijit","dojo","dojox","dojo/require!dijit/_TemplatedMixin"], function(dijit,dojo,dojox){
	console.log('MODULE loaded');

	dojo.provide('test.Module');

	dojo.require('dijit._TemplatedMixin');

	dojo.declare('test.Module', [ dijit._TemplatedMixin ], { foo : null });
});

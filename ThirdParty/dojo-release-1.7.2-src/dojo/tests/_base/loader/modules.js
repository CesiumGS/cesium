define([
	"doh",
	"dojo",
	"require",
	"./modules/anon",
	"./modules/wrapped",
	"dojo/tests/_base/loader/modules/full",
	"./modules/data",
	"./modules/factoryArity"], function(doh, dojo, require, anon, wrapped){

	doh.register("dojo.tests._base._loader.modules", [
		function testAMD(t){
			// test AMD module API
			t.is(anon.theAnswer, 42);
			t.is(require('./modules/anon').five, 5);
			t.is(wrapped.five, 5);
			t.is(dojo.require('dojo.tests._base.loader.modules.wrapped'), require('./modules/wrapped'));
			t.is(require('./modules/full').twiceTheAnswer, 84);
			t.is(require('./modules/data').five, 5);
			t.is(require('./modules/factoryArity').i, 5);
		}
	]);
});


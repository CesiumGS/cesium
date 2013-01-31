define([
	"doh",
	"dojo",
	"require",
	"./modules/anon",
	"./modules/wrapped",
	"dojo/tests/_base/loader/modules/full",
	"./modules/data",
	"./modules/factoryArity",
	"./modules/factoryArityExports",
	"./modules/idFactoryArity",
	"./modules/idFactoryArityExports"
], function(doh, dojo, require, anon, wrapped){

	doh.register("dojo.tests._base._loader.modules", [
		function testAMD(t){
			// test AMD module API
			t.is(anon.theAnswer, 42);
			t.is(require('./modules/anon').five, 5);
			t.is(wrapped.five, 5);
			t.is(dojo.require('dojo.tests._base.loader.modules.wrapped'), require('./modules/wrapped'));
			t.is(require('./modules/full').twiceTheAnswer, 84);
			t.is(require('./modules/data').five, 5);

			t.is(require('./modules/factoryArity').module.id, "dojo/tests/_base/loader/modules/factoryArity");
			t.is(require('./modules/factoryArity').id, "factoryArity");
			t.is(require('./modules/factoryArity').impliedDep, "impliedDep1");

			t.is(require('./modules/factoryArityExports').module.id, "dojo/tests/_base/loader/modules/factoryArityExports");
			t.is(require('./modules/factoryArityExports').id, "factoryArityExports");
			t.is(require('./modules/factoryArityExports').impliedDep, "impliedDep2");

			t.is(require('./modules/idFactoryArity').module.id, "dojo/tests/_base/loader/modules/idFactoryArity");
			t.is(require('./modules/idFactoryArity').id, "idFactoryArity");
			t.is(require('./modules/idFactoryArity').impliedDep, "impliedDep3");

			t.is(require('./modules/idFactoryArityExports').module.id, "dojo/tests/_base/loader/modules/idFactoryArityExports");
			t.is(require('./modules/idFactoryArityExports').id, "idFactoryArityExports");
			t.is(require('./modules/idFactoryArityExports').impliedDep, "impliedDep4");
		}
	]);
});


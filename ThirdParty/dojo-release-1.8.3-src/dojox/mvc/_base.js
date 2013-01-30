define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"./getStateful",
	"./StatefulModel",
	"./Bind",
	"./_DataBindingMixin",
	"./_patches"
], function(kernel, lang, getStateful, StatefulModel){
	// module:
	//		dojox/mvc/_base
	// summary:
	//		Pulls in essential MVC dependencies such as basic support for
	//		data binds, a data model and data binding mixin for dijits.
	kernel.experimental("dojox.mvc");

	var mvc = lang.getObject("dojox.mvc", true);
	/*=====
		mvc = dojox.mvc;
	=====*/

	// Factory method for dojox.mvc.StatefulModel instances
	mvc.newStatefulModel = function(/*Object*/args){
		// summary:
		//		Factory method that instantiates a new data model that view
		//		components may bind to.
		// args:
		//		The mixin properties.
		// description:
		//		Factory method that returns a client-side data model, which is a
		//		tree of dojo/Stateful objects matching the initial data structure
		//		passed as input:
		//
		//		- The mixin property "data" is used to provide a plain JavaScript
		//		  object directly representing the data structure.
		//		- The mixin property "store", along with an optional mixin property
		//		  "query", is used to provide a data store to query to obtain the
		//		  initial data.
		//
		//		This function returns an immediate dojox.mvc.StatefulModel instance or
		//		a Promise for such an instance as follows:
		//
		//		- if args.data: returns immediately
		//		- if args.store: if store returns immediately, this function returns immediately;
		//			if store returns a Promise, this function returns a model Promise

		if(args.data){
			return getStateful(args.data, StatefulModel.getStatefulOptions);
		}else if(args.store && lang.isFunction(args.store.query)){
			var model;
			var result = args.store.query(args.query);
			if(result.then){
				return (result.then(function(data){
					model = getStateful(data, StatefulModel.getStatefulOptions);
					model.store = args.store;
					return model;
				}));
			}else{
				model = getStateful(result, StatefulModel.getStatefulOptions);
				model.store = args.store;
				return model;
			}
		}
	};

	return mvc;
});

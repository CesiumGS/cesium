define(["dojo/_base/lang", "dojo/Deferred", "dojo/when", "dojo/_base/config",
		"dojo/store/DataStore"],
function(lang, Deferred, when, config, DataStore){
	return function(/*Object*/config, /*Object*/params, /*String*/item){
		// summary:
		//		simpleModel is called for each simple model, to create the simple model from the DataStore 
		//		based upon the store and query params.
		//		It will also load models and return the either the loadedModels or a promise.
		// description:
		//		Called for each model with a modelLoader of "dojox/app/utils/simpleModel", it will
		//		create the model based upon the store and query params set for the model in the config.
		// config: Object
		//		The models section of the config for this view or for the app.
		// params: Object
		//		The params set into the config for this model.
		// item: String
		//		The String with the name of this model
		// returns: model 
		//		 The model, of the store and query params specified in the config for this model.
		var loadedModels = {};
		var loadSimpleModelDeferred = new Deferred();

		var options;
		if(params.store){
			if((params.store.params.data || params.store.params.store)){
				options = {
					"store": params.store.store,
					"query": params.store.query ? params.store.query: {}
				};
			}else if(params.store.params.url){
				options = {
					"store": new DataStore({
						store: params.store.store
					}),
					"query": params.store.query ? params.store.query: {}
				};
			}
		}else if(params.data){
			if(params.data && lang.isString(params.data)){
				params.data = lang.getObject(params.data);
			}
			options = {"data": params.data, query: {}};
		}
		var createMvcPromise;
		try{
			if(options.store){
				createMvcPromise = options.store.query();
			}else{
				createMvcPromise = options.data;
			}
		}catch(ex){
			loadSimpleModelDeferred.reject("load mvc model error.");
			return loadSimpleModelDeferred.promise;
		}
		if(createMvcPromise.then){
			when(createMvcPromise, lang.hitch(this, function(newModel) {
				// now the loadedModels[item].models is set.
				//console.log("in simpleModel promise path, loadedModels = ", loadedModels);
				loadedModels = newModel;
				loadSimpleModelDeferred.resolve(loadedModels);
				return loadedModels;
			}), function(){
				loadModelLoaderDeferred.reject("load model error.")
			});
		}else{ // query did not return a promise, so use newModel
			loadedModels = createMvcPromise;
			//console.log("in simpleModel else path, loadedModels = ",loadedModels);
			loadSimpleModelDeferred.resolve(loadedModels);
			return loadedModels;
		}
			
		return loadSimpleModelDeferred;
	}
});

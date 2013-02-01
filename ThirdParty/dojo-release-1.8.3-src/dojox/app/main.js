define(["dojo/_base/kernel",  "require", "dojo/_base/lang", "dojo/_base/declare", "dojo/Deferred", "dojo/when", "dojo/has", "dojo/_base/config",
	"dojo/on", "dojo/ready", "dojo/_base/window", "dojo/dom-construct", "./model", "./View", "./controllers/Load", "./controllers/Transition",
	"./controllers/Layout"],
function(kernel, require, lang, declare, Deferred, when, has, config, on, ready, baseWindow, dom, Model, View,
		 LoadController, TransitionController, LayoutController){
	kernel.experimental("dojox.app");

	has.add("app-log-api", (config["app"] || {}).debugApp);

	var Application = declare(null, {
		constructor: function(params, node){
			lang.mixin(this, params);
			this.params = params;
			this.id = params.id;
			this.defaultView = params.defaultView;
			this.widgetId = params.id;
			this.controllers = [];
			this.children = {};
			this.loadedModels = {};

			// Create a new domNode and append to body
			// Need to bind startTransition event on application domNode,
			// Because dojox/mobile/ViewController bind startTransition event on document.body
			// Make application's root domNode id unique because this id can be visited by window namespace on Chrome 18.
			this.domNode = dom.create("div", {
				id: this.id+"_Root",
				style: "width:100%; height:100%; overflow-y:hidden; overflow-x:hidden;"
			});
			node.appendChild(this.domNode);
		},

		createDataStore: function(params){
			// summary:
			//		Create data store instance
			//
			// params: Object
			//		data stores configuration.

			if(params.stores){
				//create stores in the configuration.
				for(var item in params.stores){
					if(item.charAt(0) !== "_"){//skip the private properties
						var type = params.stores[item].type ? params.stores[item].type : "dojo/store/Memory";
						var config = {};
						if(params.stores[item].params){
							lang.mixin(config, params.stores[item].params);
						}
						// we assume the store is here through dependencies
						var storeCtor = require(type);
						if(config.data && lang.isString(config.data)){
							//get the object specified by string value of data property
							//cannot assign object literal or reference to data property
							//because json.ref will generate __parent to point to its parent
							//and will cause infinitive loop when creating StatefulModel.
							config.data = lang.getObject(config.data);
						}
						params.stores[item].store = new storeCtor(config);
					}
				}
			}
		},

		createControllers: function(controllers){
			// summary:
			//		Create controller instance
			//
			// controllers: Array
			//		controller configuration array.
			// returns:
			//		controllerDeferred object

			if(controllers){
				var requireItems = [];
				for(var i = 0; i < controllers.length; i++){
					requireItems.push(controllers[i]);
				}

				var def = new Deferred();
				var requireSignal;
				try{
					requireSignal = require.on("error", function(error){
						if(def.isResolved() || def.isRejected()){
							return;
						}
						def.reject("load controllers error.");
						requireSignal.remove();
					});
					require(requireItems, function(){
						def.resolve.call(def, arguments);
						requireSignal.remove();
					});
				}catch(ex){
					def.reject("load controllers error.");
					requireSignal.remove();
				}

				var controllerDef = new Deferred();
				when(def, lang.hitch(this, function(){
					for(var i = 0; i < arguments[0].length; i++){
						// Store Application object on each controller.
						this.controllers.push(new arguments[0][i](this));
					}
					controllerDef.resolve(this);
				}), function(){
					//require def error, reject loadChildDeferred
					controllerDef.reject("load controllers error.");
				});
				return controllerDef;
			}
		},

		trigger: function(event, params){
			// summary:
			//		trigger an event
			//
			// event: String
			//		event name. The event is binded by controller.bind() method.
			// params: Object
			//		event params.
			on.emit(this.domNode, event, params);
		},

		// setup default view and Controllers and startup the default view
		start: function(){
			//
			//create application level data store
			this.createDataStore(this.params);

			// create application level data model
			var loadModelLoaderDeferred = new Deferred();
			var createPromise;
			try{
				createPromise = Model(this.params.models, this);
			}catch(ex){
				loadModelLoaderDeferred.reject("load model error.");
				return loadModelLoaderDeferred.promise;
			}
			if(createPromise.then){
				when(createPromise, lang.hitch(this, function(newModel){
					this.loadedModels = newModel;
					this.setupAppView();
				}), function(){
					loadModelLoaderDeferred.reject("load model error.")
				});
			}else{
				this.loadedModels = createPromise;
				this.setupAppView();
			}
		},

		setupAppView: function(){
			//create application level view
			//
			if(this.template){
				this.view = new View({
					app: this,  // pass the app into the View so it can have easy access to app
					name: this.name,
					parent: this,
					templateString: this.templateString,
					definition: this.definition
				});
				when(this.view.start(), lang.hitch(this, function(){
					this.domNode = this.view.domNode;
					this.setupControllers();
					this.startup();
				}));
			}else{
				this.setupControllers();
				this.startup();
			}
		},

		getParamsFromHash: function(hash){
			// summary:
			//		get the params from the hash
			//
			// hash: String
			//		the url hash
			//
			// returns:
			//		the params object
			//
			var params = {};
			if(hash && hash.length){
				for(var parts= hash.split("&"), x= 0; x<parts.length; x++){
					var tp = parts[x].split("="), name=tp[0], value=encodeURIComponent(tp[1]||""); 
					if(name && value) {
						params[name] = value;
					}
				}
			}
			return params; // Object
		},

		setupControllers: function(){
			// create application controller instance
			if(!this.noAutoLoadControllers){
				this.controllers.push(new LoadController(this));
				this.controllers.push(new TransitionController(this));
				this.controllers.push(new LayoutController(this));
			}

			// move set _startView operation from history module to application
			var hash = window.location.hash;
			this._startView = (((hash && hash.charAt(0) == "#") ? hash.substr(1) : hash) || this.defaultView).split('&')[0];
			this._startParams = this.getParamsFromHash(hash) || this.defaultParams || {};
		},

		startup: function(){
			// load controllers in configuration file
			//
			var controllers = this.createControllers(this.params.controllers);
			when(controllers, lang.hitch(this, function(result){
				// emit load event and let controller to load view.
				this.trigger("load", {
					"viewId": this.defaultView,
					"params": this._startParams,
					"callback": lang.hitch(this, function(){
						var selectId = this.defaultView.split(",");
						selectId = selectId.shift();
						this.selectedChild = this.children[this.id + '_' + selectId];
						// transition to startView. If startView==defaultView, that means initial the default view.
						this.trigger("transition", {
							"viewId": this._startView,
							"params": this._startParams
						});
						this.setStatus(this.lifecycle.STARTED);
					})
				});
			}));
		}		
		
	});

	function generateApp(config, node, appSchema, validate){
		// summary:
		//		generate the application
		//
		// config: Object
		//		app config
		// node: domNode
		//		domNode.
		var path;
		if(!config.loaderConfig){
			config.loaderConfig = {};
		}
		if(!config.loaderConfig.paths){
			config.loaderConfig.paths = {};
		}
		if(!config.loaderConfig.paths["app"]){
			// Register application module path
			path = window.location.pathname;
			if(path.charAt(path.length) != "/"){
				path = path.split("/");
				path.pop();
				path = path.join("/");
			}
			config.loaderConfig.paths["app"] = path;
		}
		require(config.loaderConfig);

		if(!config.modules){
			config.modules = [];
		}
		// add dojox/app lifecycle module by default
		config.modules.push("dojox/app/module/lifecycle");
		var modules = config.modules.concat(config.dependencies);

		if(config.template){
			path = config.template;
			if(path.indexOf("./") == 0){
				path = "app/"+path;
			}
			modules.push("dojo/text!" + path);
		}

		require(modules, function(){
			var modules = [Application];
			for(var i = 0; i < config.modules.length; i++){
				modules.push(arguments[i]);
			}

			if(config.template){
				var ext = {
					templateString: arguments[arguments.length - 1]
				}
			}
			App = declare(modules, ext);

			ready(function(){
				var app = new App(config, node || baseWindow.body());

				if(has("app-log-api")){
					app.log = function(){  
						// summary:
						//		If config is set to turn on app logging, then log msg to the console
						//
						// arguments: 
						//		the message to be logged, 
						//		all but the last argument will be treated as Strings and be concatenated together, 
						//      the last argument can be an object it will be added as an argument to the console.log 						
						var msg = "";
						try{
							for(var i = 0; i < arguments.length-1; i++){
								msg = msg + arguments[i];
							}
							console.log(msg,arguments[arguments.length-1]);
						}catch(e){}
					};
				}else{
					app.log = function(){}; // noop
				}

				app.setStatus(app.lifecycle.STARTING);
				// Create global namespace for application.
				// The global name is application id. For example: modelApp
				var globalAppName = app.id;
				if(window[globalAppName]){
					lang.mixin(app, window[globalAppName]);
				}
				window[globalAppName] = app;
				app.start();
			});
		});
	}

	return function(config, node){
		if(!config){
			throw Error("App Config Missing");
		}

		if(config.validate){
			require(["dojox/json/schema", "dojox/json/ref", "dojo/text!dojox/application/schema/application.json"], function(schema, appSchema){
				schema = dojox.json.ref.resolveJson(schema);
				if(schema.validate(config, appSchema)){
					generateApp(config, node);
				}
			});
		}else{
			generateApp(config, node);
		}
	}
});

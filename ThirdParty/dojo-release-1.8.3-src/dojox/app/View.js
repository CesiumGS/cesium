define(["dojo/_base/declare", "dojo/_base/lang", "dojo/Deferred", "dojo/when", "require", "dojo/dom-attr", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "./model"],
function(declare, lang, Deferred, when, require, dattr, TemplatedMixin, WidgetsInTemplateMixin, Model){
	// module:
	//		dojox/app/View
	// summary:
	//		dojox/app view object, each view can have one parent view and several children views.

	return declare("dojox.app.View", null, {
		constructor: function(params){
			// summary:
			//		init view object. A user can use configuration file or programing type to create a view instance.
			//
			// example:
			//		|	use configuration file
			//		|
			// 		|	// load view definition from views/simple.js by default
			//		|	"simple":{
			//		|		"template": "./templates/simple.html",
			//		|		"dependencies":["dojox/mobile/TextBox"]
			//		|	}
			//		|
			//		|	"home":{
			//		|		"template": "./templates/home.html",
			//		|		"definition": "none",	// identify no view definition
			//		|		"dependencies":["dojox/mobile/TextBox"]
			//		|	}
			//		|	"main":{
			//		|		"template": "./templates/main.html",
			//		|		"definition": "./views/main.js", // identify load view definition from views/main.js
			//		|		"dependencies":["dojox/mobile/TextBox"]
			//		|	}
			//
			// example:
			//		|	var viewObj = new View({
			//		|		app: this.app,
			//		|		id: this.id,
			//		|		name: this.name,
			//		|		parent: this,
			//		|		templateString: this.templateString,
			//		|		definition: this.definition
			//		|	});
			//		|	viewObj.start(); // start view
			//
			// params:
			//		view parameters, include:
			//
			//		- app: the app
			//		- id: view id
			//		- name: view name
			//		- template: view template url. If templateString not empty, ignore this parameter.
			//		- templateString: view template string
			//		- definition: view definition url
			//		- parent: parent view
			//		- children: children views
			this.id = "";
			this.name = "";
			this.templateString = "";
			this.template = "";
			this.definition = "";
			this.parent = null;
			this.children = {};
			this.selectedChild = null;
			// private
			this._started = false;
			this._definition = null;

			lang.mixin(this, params);
			// mixin views configuration to current view instance.
			if(this.parent.views){
				lang.mixin(this, this.parent.views[this.name]);
			}
		},

		_loadViewDefinition: function(){
			// summary:
			//		Load view definition by configuration or by default.
			// tags:
			//		private
			//
			var _definitionDef = new Deferred();
			var path;

			if(this.definition && (this.definition === "none")){
				_definitionDef.resolve(true);
				return _definitionDef;
			}else if(this.definition){
				path = this.definition.replace(/(\.js)$/, "");
			}else{
				path = this.id.split("_");
				path.shift();
				path = path.join("/");
				path = "./views/" + path;
			}

			var requireSignal;
			try{
				var loadFile = path;
				var index = loadFile.indexOf("./");
				if(index >= 0){
					loadFile = path.substring(index+2);
				}
				requireSignal = require.on("error", function(error){
					if (_definitionDef.isResolved() || _definitionDef.isRejected()) {
						return;
					}
					if(error.info[0] && (error.info[0].indexOf(loadFile)>= 0)){
						_definitionDef.resolve(false);
						requireSignal.remove();
					}
				});

				if(path.indexOf("./") == 0){
					path = "app/"+path;
				}

				require([path], function(definition){
					_definitionDef.resolve(definition);
					requireSignal.remove();
				});
			}catch(ex){
				_definitionDef.resolve(false);
				requireSignal.remove();
			}
			return _definitionDef;
		},

		_loadViewTemplate: function(){
			// summary:
			//		load view HTML template and dependencies.
			// tags:
			//		private
			//

			if(this.templateString){
				return true;
			}else{
				if(!this.dependencies){
					this.dependencies = [];
				}
				var tpl = this.template;
				if(tpl.indexOf("./") == 0){
					tpl = "app/"+tpl;
				}
				var deps = this.template ? this.dependencies.concat(["dojo/text!"+tpl]) : this.dependencies.concat([]);
				var def = new Deferred();
				if(deps.length > 0){
					var requireSignal;
					try{
						requireSignal = require.on("error", lang.hitch(this, function(error){
							if(def.isResolved() || def.isRejected()){
								return;
							}
							if(error.info[0] && error.info[0].indexOf(this.template)>=0 ){
								def.resolve(false);
								requireSignal.remove();
							}
						}));
						require(deps, function(){
							def.resolve.call(def, arguments);
							requireSignal.remove();
						});
					}catch(ex){
						def.resolve(false);
						requireSignal.remove();
					}
				}else{
					def.resolve(true);
				}

				var loadViewDeferred = new Deferred();
				when(def, lang.hitch(this, function(){
					this.templateString = this.template ? arguments[0][arguments[0].length - 1] : "<div></div>";
					loadViewDeferred.resolve(this);
				}));
				return loadViewDeferred;
			}
		},

		// start view
		start: function(){
			// summary:
			//		start view object.
			//		load view template, view definition implement and startup all widgets in view template.
			if(this._started){
				return this;
			}

			var _definitionDef = this._loadViewDefinition();
			var _templateDef = this._loadViewTemplate();

			this._startDef = new Deferred();
			when(_definitionDef, lang.hitch(this, function(definition){
				this._definition = definition;
				when(_templateDef, lang.hitch(this, function(){
					// call setupModel, after setupModel startup will be called after startup the loadViewDeferred will be resolved
					this._setupModel();
				}));
			}));
			return this._startDef;
		},

		_setupModel: function(){
			// summary:
			//		Load views model if it is not already loaded then call _startup.
			// tags:
			//		private
			
			if (!this.loadedModels) {
				var loadModelLoaderDeferred = new Deferred();
				var createPromise;
				try{
					createPromise = Model(this.models, this.parent, this.app);
				}catch(ex){
					loadModelLoaderDeferred.reject("load model error.");
					return loadModelLoaderDeferred.promise;
				}
				if(createPromise.then){  // model returned a promise, so set loadedModels and call startup after the .when
					when(createPromise, lang.hitch(this, function(newModel){
						if(newModel){
							this.loadedModels = newModel;
						}
						this._startup();
					}),
					function(){
						loadModelLoaderDeferred.reject("load model error.")
					});
				}else{ // model returned the actual model not a promise, so set loadedModels and call _startup
					this.loadedModels = createPromise;
					this._startup();
				}
			}else{ // loadedModels already created so call _startup
				this._startup();				
			}		
		},

		_startup: function(){
			// summary:
			//		startup widgets in view template.
			// tags:
			//		private

			this._widget = this.render(this.templateString);
			// bind view level data model
			this.domNode = this._widget.domNode;
			this.parent.domNode.appendChild(this.domNode);

			//start widget
			this._widget.startup();

			// set widget attributes
			dattr.set(this.domNode, "id", this.id);
			dattr.set(this.domNode, "data-app-region", "center");
			dattr.set(this.domNode, "style", "width:100%; height:100%");
			this._widget.region = "center";

			//mixin view lifecycle implement
			if (this._definition) {
				lang.mixin(this, this._definition);
			}

			// call view assistant's init() method to initialize view
			this.app.log("  > in app/View calling init() name=[",this.name,"], parent.name=[",this.parent.name,"]");
			this.init();
			this._started = true;
			if(this._startDef){
				this._startDef.resolve(this);
			}
		},

		render: function(templateString){
			// summary:
			//		rendering view template HTML
			// templateString:
			//		template string
			var widgetTemplate = new TemplatedMixin();
			var widgetInTemplate = new WidgetsInTemplateMixin();
			// set the loadedModels here to be able to access the model on the parse.
			if(this.loadedModels){
				widgetInTemplate.loadedModels = this.loadedModels;
			}
			lang.mixin(widgetTemplate, widgetInTemplate);
			widgetTemplate.templateString = templateString;
			widgetTemplate.buildRendering();
			return widgetTemplate;
		},
		
		init: function(){
			// summary:
			//		view life cycle init()
		},

		beforeActivate: function(){
			// summary:
			//		view life cycle beforeActivate()
		},

		afterActivate: function(){
			// summary:
			//		view life cycle afterActivate()
		},

		beforeDeactivate: function(){
			// summary:
			//		view life cycle beforeDeactivate()
		},

		afterDeactivate: function(){
			// summary:
			//		view life cycle afterDeactivate()
		},

		destroy: function(){
			// summary:
			//		view life cycle destroy()
		}
	});
});

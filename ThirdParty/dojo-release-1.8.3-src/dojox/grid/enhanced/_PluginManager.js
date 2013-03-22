define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/connect",
	"./_Events",
	"./_FocusManager",
	"../util"
], function(dojo, lang, declare, array, connect, _Events, _FocusManager, util){

var _PluginManager = declare("dojox.grid.enhanced._PluginManager", null, {
	// summary:
	//		Singleton plugin manager
	// description:
	//		Plugin manager is responsible for:
	//
	//		1. Loading required plugins
	//		2. Handling collaboration and dependencies among plugins
	//
	//		Some plugin dependencies:
	//
	//		- "columnReordering" attribute won't work when either DnD or Indirect Selections plugin is on.
		
	// _options: Object
	//		Normalized plugin options
	_options: null,

	// _plugins: Array
	//		Plugin list
	_plugins: null,

	// _connects: Array
	//		Connection list
	_connects: null,

	constructor: function(inGrid){
		this.grid = inGrid;
		this._store = inGrid.store;
		this._options = {};
		this._plugins = [];
		this._connects = [];
		this._parseProps(this.grid.plugins);
		
		inGrid.connect(inGrid, "_setStore", lang.hitch(this, function(store){
			if(this._store !== store){
				this.forEach('onSetStore', [store, this._store]);
				this._store = store;
			}
		}));
	},
	startup: function(){
		this.forEach('onStartUp');
	},
	preInit: function(){
		// summary:
		//		Load appropriate plugins before DataGrid.postCreate().
		//		See EnhancedGrid.postCreate()
		this.grid.focus.destroy();
		this.grid.focus = new _FocusManager(this.grid);
		new _Events(this.grid);//overwrite some default events of DataGrid
		this._init(true);
		this.forEach('onPreInit');
	},
	postInit: function(){
		// summary:
		//		Load plugins after DataGrid.postCreate() - the default phase when plugins are created
		//		See EnhancedGrid.postCreate()
		this._init(false);
		
		array.forEach(this.grid.views.views, this._initView, this);
		this._connects.push(connect.connect(this.grid.views, 'addView', lang.hitch(this, this._initView)));
			
		if(this._plugins.length > 0){
			var edit = this.grid.edit;
			if(edit){ edit.styleRow = function(inRow){}; }
		}
		this.forEach('onPostInit');
	},
	forEach: function(func, args){
		array.forEach(this._plugins, function(p){
			if(!p || !p[func]){ return; }
			p[func].apply(p, args ? args : []);
		});
	},
	_parseProps: function(plugins){
		// summary:
		//		Parse plugins properties
		// plugins: Object
		//		Plugin properties defined by user
		if(!plugins){ return; }
		
		var p, loading = {}, options = this._options, grid = this.grid;
		var registry = _PluginManager.registry;//global plugin registry
		for(p in plugins){
			if(plugins[p]){//filter out boolean false e.g. {p:false}
				this._normalize(p, plugins, registry, loading);
			}
		}
		//"columnReordering" attribute won't work when DnD plugin is turned on.
		if(options.dnd){
			options.columnReordering = false;
		}
		
		//mixin all plugin properties into Grid
		lang.mixin(grid, options);
	},
	_normalize: function(p, plugins, registry, loading){
		// summary:
		//		Normalize plugin properties especially the dependency chain
		// p: String
		//		Plugin name
		// plugins: Object
		//		Plugin properties set by user
		// registry: Object
		//		The global plugin registry
		// loading: Object
		//		Map for checking process state
		if(!registry[p]){ throw new Error('Plugin ' + p + ' is required.');}
		
		if(loading[p]){ throw new Error('Recursive cycle dependency is not supported.'); }
		
		var options = this._options;
		if(options[p]){ return options[p]; }
		
		loading[p] = true;
		//TBD - more strict conditions?
		options[p] = lang.mixin({}, registry[p], lang.isObject(plugins[p]) ? plugins[p] : {});
		
		var dependencies = options[p]['dependency'];
		if(dependencies){
			if(!lang.isArray(dependencies)){
				dependencies = options[p]['dependency'] = [dependencies];
			}
			array.forEach(dependencies, function(dependency){
				if(!this._normalize(dependency, plugins, registry, loading)){
					throw new Error('Plugin ' + dependency + ' is required.');
				}
			}, this);
		}
		delete loading[p];
		return options[p];
	},
	_init: function(pre){
		// summary:
		//		Find appropriate plugins and load them
		// pre: Boolean
		//		True - preInit | False - postInit(by default)
		var p, preInit, options = this._options;
		for(p in options){
			preInit = options[p]['preInit'];
			if((pre ? preInit : !preInit) && options[p]['class'] && !this.pluginExisted(p)){
				this.loadPlugin(p);
			}
		}
	},
	loadPlugin: function(name){
		// summary:
		//		Load required plugin("name")
		// name: String
		//		Plugin name
		// returns: Object
		//		The newly loaded plugin
		var option = this._options[name];
		if(!option){ return null; } //return if no plugin option
		
		var plugin = this.getPlugin(name);
		if(plugin){ return plugin; } //return if plugin("name") already existed
		
		var dependencies = option['dependency'];
		array.forEach(dependencies, function(dependency){
			if(!this.loadPlugin(dependency)){
				throw new Error('Plugin ' + dependency + ' is required.');
			}
		}, this);
		var cls = option['class'];
		delete option['class'];//remove it for safety
		plugin = new this.getPluginClazz(cls)(this.grid, option);
		this._plugins.push(plugin);
		return plugin;
	},
	_initView: function(view){
		// summary:
		//		Overwrite several default behavior for each views(including _RowSelector view)
		if(!view){ return; }
		//add more events handler - _View
		util.funnelEvents(view.contentNode, view, "doContentEvent", ['mouseup', 'mousemove']);
		util.funnelEvents(view.headerNode, view, "doHeaderEvent", ['mouseup']);
	},
	pluginExisted: function(name){
		// summary:
		//		Check if plugin("name") existed
		// name: String
		//		Plugin name
		// returns: Boolean
		//		True - existed | False - not existed
		return !!this.getPlugin(name);
	},
	getPlugin: function(name){
		// summary:
		//		Get plugin("name")
		// name: String
		//		Plugin name
		// returns: Object
		//		Plugin instance
		var plugins = this._plugins;
		name = name.toLowerCase();
		for(var i = 0, len = plugins.length; i < len; i++){
			if(name == plugins[i]['name'].toLowerCase()){
				return plugins[i];
			}
		}
		return null;
	},
	getPluginClazz: function(clazz){
		// summary:
		//		Load target plugin which must be already required (require(..))
		// clazz: Class|String
		//		Plugin class
		if(lang.isFunction(clazz)){
			return clazz;//return if it's already a clazz
		}
		var errorMsg = 'Please make sure Plugin "' + clazz + '" is existed.';
		try{
			var cls = lang.getObject(clazz);
			if(!cls){ throw new Error(errorMsg); }
			return cls;
		}catch(e){
			throw new Error(errorMsg);
		}
	},
	isFixedCell: function(cell){
		// summary:
		//		See if target cell(column) is fixed or not.
		// cell: Object
		//		Target cell(column)
		// returns: Boolean
		//		True - fixed| False - not fixed

		//target cell can use Boolean attributes named "isRowSelector" or "fixedPos" to mark it's a fixed cell(column)
		return cell && (cell.isRowSelector || cell.fixedPos);
	},
	destroy: function(){
		// summary:
		//		Destroy all resources
		array.forEach(this._connects, connect.disconnect);
		this.forEach('destroy');
		if(this.grid.unwrap){
			this.grid.unwrap();
		}
		delete this._connects;
		delete this._plugins;
		delete this._options;
	}
});

_PluginManager.registerPlugin = function(clazz, props){
		// summary:
		//		Register plugins - TODO, a better way rather than global registry?
		// clazz: String
		//		Full class name, e.g. "dojox.grid.enhanced.plugins.DnD"
		// props: Object?
		//		Plugin properties e.g. {"dependency": ["nestedSorting"], ...}
	if(!clazz){
		console.warn("Failed to register plugin, class missed!");
		return;
	}
	var cls = _PluginManager;
	cls.registry = cls.registry || {};
	cls.registry[clazz.prototype.name]/*plugin name*/ = lang.mixin({"class": clazz}, (props ? props : {}));
};

return _PluginManager;

});

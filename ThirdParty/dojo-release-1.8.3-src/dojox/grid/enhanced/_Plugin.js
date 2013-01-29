define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/connect",
    "../EnhancedGrid"
], function(dojo, lang, declare, array, connect){
	
return declare("dojox.grid.enhanced._Plugin", null, {
	// summary:
	//		Base class for all plugins.
	// description:
	//		Provides common plugin functionality and basic life cycle management.
	//
	//		Each concrete plugin must have a name field and is responsible for registering itself to the global plugin registry
	//		e.g. for dnd plugin:
	// |		dojox.grid.EnhancedGrid.registerPlugin("dnd" /*plugin name*/,
	// |												dojox.grid.enhanced.plugins.DnD /*full class name of a plugin*/
	// |												{"preInit": false, "dependency": ["nestedSorting"]} /*properties*/);
	//
	//		[Keywords] of plugin properties (case sensitive):
	//
	//		- "preInit": boolean, whether a plugin should be created before EnhancedGrid.postCreate(),
	//		   false by default(plugins are created after EnhancedGrid.postCreate()).
	//		- "dependency": array or string, plugin(s) indicated by "dependency" will be created before the current one.
	//		   Note: recursive cycle dependencies are not supported e.g. following dependency is invalid:
	//		   pluginA -> pluginB -> pluginA
	//
	// example:
	//		1. Customize default DnD plugin
	//
	// |	declare("mygrid.MyDnD", dojox.grid.enhanced.plugins.DnD, {
	// |		name:"dnd" //still reuse the plugin name
	// |		constructor: function(inGrid, option){ ... }
	// |	});
	// |	dojox.grid.EnhancedGrid.registerPlugin("dnd", mygrid.MyDnD);
	//
	//		2. Add new plugin - PluginA
	//
	// |	declare("mygrid.PluginA", dojox.grid.enhanced._Plugin, {
	// |		name: "pA",
	// |		constructor: function(inGrid, option){ ... }
	// |	});
	// |	dojox.grid.EnhancedGrid.registerPlugin("pA",mygrid.PluginA);
	//
	//		3. Use plugins
	//
	// |	dojo.require("mygrid.MyDnD");
	// |	dojo.require("mygrid.PluginA");
	// |
	// |	<script type="text/javascript">
	// |		var grid = new dojox.grid.EnhancedGrid(
	// |		{plugins: {dnd:true, pA:true}, ... }, dojo.byId("gridDiv"));
	// |		grid.startup();
	// |	</script>

	// name: String
	//		Plugin name, e.g. 'nestedSorting', 'dnd'...
	name: 'plugin',
	
	// grid: Object
	//		Grid that the plugin belongs to
	grid: null,

	// option: Object
	//		Plugin properties - leveraged with default and user specified properties.
	//		e.g. for dnd plugin, it may look like {"class": dojox.grid.enhanced.plugins.DnD, "dependency": ["nestedSorting"], ...}
	option: {},

	// _connects: Array
	//		List of all connections.
	_connects: [],
	
	// _subscribes: Array
	//		List of all subscribes.
	_subscribes: [],

	// privates: Object
	//		Private properties/methods shouldn't be mixin-ed anytime.
	privates: {},
	
	constructor: function(inGrid, option){
		this.grid = inGrid;
		this.option = option;
		this._connects = [];
		this._subscribes = [];
		this.privates = lang.mixin({},dojox.grid.enhanced._Plugin.prototype);
		this.init();
	},
	
	init: function(){},
	
	onPreInit: function(){},
	
	onPostInit: function(){},
	
	onStartUp: function(){},
	
	connect: function(obj, event, method){
		// summary:
		//		Connects specified obj/event to specified method of this object.
		// example:
		//	|	var plugin = new dojox.grid.enhanced._Plugin(grid,"myPlugin",{...});
		//	|	// when foo.bar() is called, call the listener in the scope of plugin
		//	|	plugin.connect(foo, "bar", function(){
		//	|		console.debug(this.xxx());//"this" - plugin scope
		//	|	});
		var conn = connect.connect(obj, event, this, method);
		this._connects.push(conn);
		return conn;
	},
	disconnect: function(handle){
		// summary:
		//		Disconnects handle and removes it from connection list.
		array.some(this._connects, function(conn, i, conns){
			if(conn == handle){
				connect.disconnect(handle);
				conns.splice(i, 1);
				return true;
			}
			return false;
		});
	},
	subscribe: function(topic, method){
		// summary:
		//		Subscribes to the specified topic and calls the specified method
		//		of this object.
		// example:
		//	|	var plugin = new dojox.grid.enhanced._Plugin(grid,"myPlugin",{...});
		//	|	// when /my/topic is published, call the subscriber in the scope of plugin
		//	|	// with passed parameter - "v"
		//	|	plugin.subscribe("/my/topic", function(v){
		//	|		console.debug(this.xxx(v));//"this" - plugin scope
		//	|	});
		var subscribe = connect.subscribe(topic, this, method);
		this._subscribes.push(subscribe);
		return subscribe;
	},
	unsubscribe: function(handle){
		// summary:
		//		Un-subscribes handle and removes it from subscriptions list.
		array.some(this._subscribes, function(subscribe, i, subscribes){
			if(subscribe == handle){
				connect.unsubscribe(handle);
				subscribes.splice(i, 1);
				return true;
			}
			return false;
		});
	},
	onSetStore: function(store){
		// summary:
		//		Called when store is changed.
	},
	destroy: function(){
		// summary:
		//		Destroy all resources.
		array.forEach(this._connects, connect.disconnect);
		array.forEach(this._subscribes, connect.unsubscribe);
		delete this._connects;
		delete this._subscribes;
		delete this.option;
		delete this.privates;
		//console.log('Plugin [', this.name, '].destroy() executed!');
	}
});

//Each plugin is responsible for registering itself
// e.g. for DnD plugin(name:'dnd'):
// |	dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.DnD/*class*/,
// |		{"dependency": ["nestedSorting"]}/*Optional - properties*/);

});

define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/_base/html",
	"dojo/_base/event",
	"dojo/keys",
	"../_Plugin",
	"../../EnhancedGrid"
], function(declare, array, lang, html, evt, keys, _Plugin, EnhancedGrid){

var Menu = declare("dojox.grid.enhanced.plugins.Menu", _Plugin, {
	// summary:
	//		 Provides context menu support, including header menu, row menu, cell menu and selected region menu
	// example:
	// |	<div dojoType="dojox.grid.EnhancedGrid"
	// |		plugins="{menus:{headerMenu:"headerMenuId", rowMenu:"rowMenuId", cellMenu:"cellMenuId",
	// |						   selectedRegionMenu:"selectedRegionMenuId"}}" ...>
	// |	</div>
	
	// name: String
	//		Plugin name
	name: "menus",

	// types: [const] String[]
	//		menu types
	types: ['headerMenu', 'rowMenu', 'cellMenu', 'selectedRegionMenu'],
	
	constructor: function(){
		var g = this.grid;
		g.showMenu = lang.hitch(g, this.showMenu);
		g._setRowMenuAttr = lang.hitch(this, '_setRowMenuAttr');
		g._setCellMenuAttr = lang.hitch(this, '_setCellMenuAttr');
		g._setSelectedRegionMenuAttr = lang.hitch(this, '_setSelectedRegionMenuAttr');
	},
	onStartUp: function(){
		var type, option = this.option;
		for(type in option){
			if(array.indexOf(this.types, type) >= 0 && option[type]){
				this._initMenu(type, option[type]);
			}
		}
	},
	_initMenu: function(/*String*/ menuType, /*String|dijit/Menu*/ menu){
		var g = this.grid;
		if(!g[menuType]){//in case already created in _Grid.postCreate()
			var m = this._getMenuWidget(menu);
			if(!m){return;}
			g.set(menuType, m);
			if(menuType != "headerMenu"){
				m._scheduleOpen = function(){return;};
			}else{
				g.setupHeaderMenu();
			}
		}
	},
	_getMenuWidget: function(/*String|Widget(dijit.Menu)*/menu){
		// summary:
		//		Fetch the required menu widget(should already been created)
		return (menu instanceof dijit.Menu) ? menu : dijit.byId(menu);
	},
	_setRowMenuAttr: function(/*Widget(dijit.Menu)*/menu){
		// summary:
		//		Set row menu widget
		this._setMenuAttr(menu, 'rowMenu');
	},
	_setCellMenuAttr: function(/*Widget(dijit.Menu)*/menu){
		// summary:
		//		Set cell menu widget
		this._setMenuAttr(menu, 'cellMenu');
	},
	_setSelectedRegionMenuAttr: function(/*Widget(dijit.Menu)*/menu){
		// summary:
		//		Set row menu widget
		this._setMenuAttr(menu, 'selectedRegionMenu');
	},
	_setMenuAttr: function(/*Widget(dijit.Menu)*/menu, /*String*/menuType){
		// summary:
		//		Bind menus to Grid.
		var g = this.grid, n = g.domNode;
		if(!menu || !(menu instanceof dijit.Menu)){
			console.warn(menuType, " of Grid ", g.id, " is not existed!");
			return;
		}
		if(g[menuType]){
			g[menuType].unBindDomNode(n);
		}
		g[menuType] = menu;
		g[menuType].bindDomNode(n);
	},
	showMenu: function(/*Event*/e){
		// summary:
		//		Show appropriate context menu
		//		Fired from dojox.grid.enhanced._Events.onRowContextMenu, 'this' scope - Grid

		// TODO: test Shift-F10

		var inSelectedRegion = (e.cellNode && html.hasClass(e.cellNode, 'dojoxGridRowSelected') ||
			e.rowNode && (html.hasClass(e.rowNode, 'dojoxGridRowSelected') || html.hasClass(e.rowNode, 'dojoxGridRowbarSelected')));
		
		if(inSelectedRegion && this.selectedRegionMenu){
			this.onSelectedRegionContextMenu(e);
			return;
		}
		
		var info = {target: e.target, coords: e.keyCode !== keys.F10 && "pageX" in e ? {x: e.pageX, y: e.pageY } : null};
		if(this.rowMenu && (!this.cellMenu || this.selection.isSelected(e.rowIndex) || e.rowNode && html.hasClass(e.rowNode, 'dojoxGridRowbar'))){
			this.rowMenu._openMyself(info);
			evt.stop(e);
			return;
		}

		if(this.cellMenu){
			this.cellMenu._openMyself(info);
		}
		evt.stop(e);
	},
	destroy: function(){
		// summary:
		//		Destroy all resources.
		//		_Grid.destroy() will unbind headerMenu
		var g = this.grid;
		if(g.headerMenu){g.headerMenu.unBindDomNode(g.viewsHeaderNode);}
		if(g.rowMenu){g.rowMenu.unBindDomNode(g.domNode);}
		if(g.cellMenu){g.cellMenu.unBindDomNode(g.domNode);}
		if(g.selectedRegionMenu){g.selectedRegionMenu.destroy();}
		this.inherited(arguments);
	}
});

EnhancedGrid.registerPlugin(Menu/*name:'menus'*/);

return Menu;

});

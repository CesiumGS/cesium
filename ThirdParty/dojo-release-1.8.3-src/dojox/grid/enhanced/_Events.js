define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/keys",
	"dojo/_base/html",
	"dojo/_base/event",
	"dojox/grid/_Events"
], function(dojo, declare, keys, html, event, _Events){

return declare("dojox.grid.enhanced._Events", null, {
	// summary:
	//		Overwrite some default events of DataGrid
	//
	// description:
	//		Methods are copied or replaced for overwriting, this might be refined once
	//		an overall plugin architecture is set up for DataGrid.

	// _events: Object
	//		Method map cached from dojox.grid._Events().
	_events: null,

	// headerCellActiveClass: String
	//		css class to apply to grid header cells when activated(mouse down)
	headerCellActiveClass: 'dojoxGridHeaderActive',
	
	// cellActiveClass: String
	//		css class to apply to grid content cells when activated(mouse down)
	cellActiveClass: 'dojoxGridCellActive',
	
	// rowActiveClass: String
	//		css class to apply to grid rows when activated(mouse down)
	rowActiveClass: 'dojoxGridRowActive',

	constructor: function(inGrid){
		//TODO - extend dojox.grid._Events rather than mixin for 1.8
		this._events = new _Events();
		//mixin "this" to Grid
		inGrid.mixin(inGrid, this);
	},
	dokeyup: function(e){
		// summary:
		//		Grid key up event handler.
		// e: Event
		//		Un-decorated event object
		this.focus.currentArea().keyup(e);
	},
	onKeyDown: function(e){
		// summary:
		//		Overwritten, see dojox.grid._Events.onKeyDown();
		if(e.altKey || e.metaKey){ return; }
		var focus = this.focus;
		var editing = this.edit.isEditing();
		switch(e.keyCode){
			case keys.TAB:
				if(e.ctrlKey){ return; }
				focus.tab(e.shiftKey ? -1:1,e);
				break;
			case keys.UP_ARROW:
			case keys.DOWN_ARROW:
				if(editing){ return; }
				focus.currentArea().move(e.keyCode == keys.UP_ARROW ? -1 : 1, 0, e);
				break;
			case keys.LEFT_ARROW:
			case keys.RIGHT_ARROW:
				if(editing){ return; }
				var offset = (e.keyCode == keys.LEFT_ARROW) ? 1 : -1;
				if(html._isBodyLtr()){ offset *= -1; }
				focus.currentArea().move(0, offset, e);
				break;
			case keys.F10:
				if(this.menus && e.shiftKey){
					this.onRowContextMenu(e);
				}
				break;
			default:
				focus.currentArea().keydown(e);
				break;
		}
	},
	//TODO - make the following events more reasonalble - e.g. more accurate conditions
	//events for row selectors
	domouseup: function(e){
		if(e.cellNode){
			this.onMouseUp(e);
		}else{
			this.onRowSelectorMouseUp(e);
		}
	},
	domousedown: function(e){
		if(!e.cellNode){
			this.onRowSelectorMouseDown(e);
		}
	},
	onMouseUp: function(e){
		// summary:
		//		New - Event fired when mouse is up inside grid.
		// e: Event
		//		Decorated event object that contains reference to grid, cell, and rowIndex
		this[e.rowIndex == -1 ? "onHeaderCellMouseUp" : "onCellMouseUp"](e);
	},
	onCellMouseDown: function(e){
		// summary:
		//		Overwritten, see dojox.grid._Events.onCellMouseDown()
		html.addClass(e.cellNode, this.cellActiveClass);
		html.addClass(e.rowNode, this.rowActiveClass);
	},
	onCellMouseUp: function(e){
		// summary:
		//		New - Event fired when mouse is up inside content cell.
		// e: Event
		//		Decorated event object that contains reference to grid, cell, and rowIndex
		html.removeClass(e.cellNode, this.cellActiveClass);
		html.removeClass(e.rowNode, this.rowActiveClass);
	},
	onCellClick: function(e){
		// summary:
		//		Overwritten, see dojox.grid._Events.onCellClick()

		//invoke dojox.grid._Events.onCellClick()
		this._events.onCellClick.call(this, e);
		//move mouse events to the focus manager.
		this.focus.contentMouseEvent(e);//TODO
	},
	onCellDblClick: function(e){
		// summary:
		//		Overwritten, see dojox.grid._Events.onCellDblClick()
		if(this.pluginMgr.isFixedCell(e.cell)){ return; }
		if(this._click.length > 1 && (!this._click[0] || !this._click[1])){
			this._click[0] = this._click[1] = e;
		}
		//invoke dojox.grid._Events.onCellDblClick()
		this._events.onCellDblClick.call(this, e);
	},
	onRowClick: function(e){
		// summary:
		//		Overwritten, see dojox.grid._Events.onRowClick()
		this.edit.rowClick(e);
		if(!e.cell || !this.plugin('indirectSelection')){
			this.selection.clickSelectEvent(e);
		}
	},
	onRowContextMenu: function(e){
		// summary:
		//		Overwritten, see dojox.grid._Events.onRowContextMenu()
		if(!this.edit.isEditing() && this.menus){
			this.showMenu(e);
		}
	},
	onSelectedRegionContextMenu: function(e){
		// summary:
		//		New - Event fired when a selected region context menu is accessed via mouse right click.
		// e: Event
		//		Decorated event object which contains reference to grid and info of selected
		//		regions(selection type - row|column, selected index - [...])
		if(this.selectedRegionMenu){
			this.selectedRegionMenu._openMyself({
				target: e.target,
				coords: e.keyCode !== keys.F10 && "pageX" in e ? {
					x: e.pageX,
					y: e.pageY
				} : null
			});
			event.stop(e);
		}
	},
	onHeaderCellMouseOut: function(e){
		// summary:
		//		Overwritten, see dojox.grid._Events.onHeaderCellMouseOut()
		if(e.cellNode){
			html.removeClass(e.cellNode, this.cellOverClass);
			html.removeClass(e.cellNode, this.headerCellActiveClass);
		}
	},
	onHeaderCellMouseDown: function(e){
		// summary:
		//		Overwritten, see dojox.grid._Events.onHeaderCellMouseDown()
		if(e.cellNode){//TBD - apply to selection region for nested sorting?
			html.addClass(e.cellNode, this.headerCellActiveClass);
		}
	},
	onHeaderCellMouseUp: function(e){
		// summary:
		//		New event
		if(e.cellNode){
			html.removeClass(e.cellNode, this.headerCellActiveClass);
		}
	},
	onHeaderCellClick: function(e){
		// summary:
		//		Overwritten, see dojox.grid._Events.onHeaderCellClick()
		
		//move focus to header.
		this.focus.currentArea("header");
		//invoke dojox.grid._Events.onHeaderCellClick()
		if(!e.cell.isRowSelector){
			this._events.onHeaderCellClick.call(this, e);
		}
		//move mouse events to the focus manager.
		this.focus.headerMouseEvent(e);
	},
	onRowSelectorMouseDown: function(e){
		this.focus.focusArea("rowHeader", e);
	},
	
	onRowSelectorMouseUp: function(e){},
	
	//triggered in _View, see Selector plugin
	onMouseUpRow: function(e){
		if(e.rowIndex != -1){
			this.onRowMouseUp(e);
		}
	},
	onRowMouseUp: function(e){}
});
});
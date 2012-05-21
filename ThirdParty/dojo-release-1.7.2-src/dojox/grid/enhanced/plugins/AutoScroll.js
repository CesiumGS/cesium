define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/_base/html",
	"dojo/_base/window",
	"../_Plugin",
	"../../_RowSelector",
	"../../EnhancedGrid"
], function(declare, array, lang, html, win, _Plugin, _RowSelector, EnhancedGrid){

var AutoScroll = declare("dojox.grid.enhanced.plugins.AutoScroll", _Plugin, {
	// summary:
	//		Provides horizontal and vertical auto-scroll for grid.
	
	// name: String
	//		Plugin name
	name: "autoScroll",
	
	// autoScrollInterval: Integer
	//		The time interval (in miliseconds) between 2 scrolling.
	autoScrollInterval: 1000,
	
	// autoScrollMargin: Integer
	//		The width (in pixel) of the margin area where autoscroll can be triggered.
	autoScrollMargin: 30,
	
	constructor: function(grid, args){
		this.grid = grid;
		this.readyForAutoScroll = false;
		this._scrolling = false;
		args = lang.isObject(args) ? args : {};
		if("interval" in args){
			this.autoScrollInterval = args.interval;
		}
		if("margin" in args){
			this.autoScrollMargin = args.margin;
		}
		this._initEvents();
		this._mixinGrid();
	},
	_initEvents: function(){
		var g = this.grid;
		this.connect(g, "onCellMouseDown", function(){
			this.readyForAutoScroll = true;
		});
		this.connect(g, "onHeaderCellMouseDown", function(){
			this.readyForAutoScroll = true;
		});
		this.connect(g, "onRowSelectorMouseDown", function(){
			this.readyForAutoScroll = true;
		});
		this.connect(win.doc, "onmouseup", function(evt){
			this._manageAutoScroll(true);
			this.readyForAutoScroll = false;
		});
		this.connect(win.doc, "onmousemove", function(evt){
			if(this.readyForAutoScroll){
				this._event = evt;
				var gridPos = html.position(g.domNode),
					hh = g._getHeaderHeight(),
					margin = this.autoScrollMargin,
					ey = evt.clientY, ex = evt.clientX,
					gy = gridPos.y, gx = gridPos.x,
					gh = gridPos.h, gw = gridPos.w;
				if(ex >= gx && ex <= gx + gw){
					if(ey >= gy + hh && ey < gy + hh + margin){
						this._manageAutoScroll(false, true, false);
						return;
					}else if(ey > gy + gh - margin && ey <= gy + gh){
						this._manageAutoScroll(false, true, true);
						return;
					}else if(ey >= gy && ey <= gy + gh){
						var withinSomeview = array.some(g.views.views, function(view, i){
							if(view instanceof _RowSelector){
								return false;
							}
							var viewPos = html.position(view.domNode);
							if(ex < viewPos.x + margin && ex >= viewPos.x){
								this._manageAutoScroll(false, false, false, view);
								return true;
							}else if(ex > viewPos.x + viewPos.w - margin && ex < viewPos.x + viewPos.w){
								this._manageAutoScroll(false, false, true, view);
								return true;
							}
							return false;
						}, this);
						if(withinSomeview){
							return;
						}
					}
				}
				//stop autoscroll.
				this._manageAutoScroll(true);
			}
		});
	},
	_mixinGrid: function(){
		var g = this.grid;
		g.onStartAutoScroll = function(/*isVertical, isForward*/){};
		g.onEndAutoScroll = function(/*isVertical, isForward, view, scrollToRowIndex, event*/){};
	},
	_fireEvent: function(eventName, args){
		var g = this.grid;
		switch(eventName){
			case "start":
				g.onStartAutoScroll.apply(g, args);
				break;
			case "end":
				g.onEndAutoScroll.apply(g, args);
				break;
		}
	},
	_manageAutoScroll: function(toStop, isVertical, isForward, view){
		if(toStop){
			this._scrolling = false;
			clearInterval(this._handler);
		}else if(!this._scrolling){
			this._scrolling = true;
			this._fireEvent("start", [isVertical, isForward, view]);
			this._autoScroll(isVertical, isForward, view);
			this._handler = setInterval(lang.hitch(this, "_autoScroll", isVertical, isForward, view), this.autoScrollInterval);
		}
	},
	_autoScroll: function(isVertical, isForward, view){
		var g = this.grid,
			target = null;
		if(isVertical){
			var targetRow = g.scroller.firstVisibleRow + (isForward ? 1 : -1);
			if(targetRow >= 0 && targetRow < g.rowCount){
				g.scrollToRow(targetRow);
				target = targetRow;
			}
		}else{
			target = this._scrollColumn(isForward, view);
		}
		if(target !== null){
			this._fireEvent("end", [isVertical, isForward, view, target, this._event]);
		}
	},
	_scrollColumn: function(isForward, view){
		var node = view.scrollboxNode,
			target = null;
		if(node.clientWidth < node.scrollWidth){
			var cells = array.filter(this.grid.layout.cells, function(cell){
				return !cell.hidden;
			});
			var viewPos = html.position(view.domNode);
			var limit, edge, headerPos, i;
			if(isForward){
				limit = node.clientWidth;
				for(i = 0; i < cells.length; ++i){
					headerPos = html.position(cells[i].getHeaderNode());
					edge = headerPos.x - viewPos.x + headerPos.w;
					if(edge > limit){
						target = cells[i].index;
						node.scrollLeft += edge - limit + 10;
						break;
					}
				}
			}else{
				limit = 0;
				for(i = cells.length - 1; i >= 0; --i){
					headerPos = html.position(cells[i].getHeaderNode());
					edge = headerPos.x - viewPos.x;
					if(edge < limit){
						target = cells[i].index;
						node.scrollLeft += edge - limit - 10;
						break;
					}
				}
			}
		}
		return target;
	}
});

EnhancedGrid.registerPlugin(AutoScroll);

return AutoScroll;
});

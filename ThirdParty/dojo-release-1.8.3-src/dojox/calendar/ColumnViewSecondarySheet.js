define(["./MatrixView", "dojo/text!./templates/ColumnViewSecondarySheet.html",
	"dojo/_base/html", "dojo/_base/declare", "dojo/_base/event", "dojo/_base/lang", 
	"dojo/_base/sniff", "dojo/dom", "dojo/dom-class", "dojo/dom-geometry", "dojo/dom-construct", 
	"dojo/date", "dojo/date/locale", "dojo/query", "dojox/html/metrics", "dojo/_base/fx", "dojo/on", 
	"dojo/i18n", "dojo/window"],
	
	function(MatrixView, template, html, declare, event, lang, has, dom, domClass, domGeometry, domConstruct, 
		date, locale, query, metrics, fx, on, i18n, win){
	
	return declare("dojox.calendar.ColumnViewSecondarySheet", MatrixView, {
		
		// summary:
		//		This class defines a matrix view designed to be embedded in a column view, 
		//		usually to display long or all day events on one row. 

		templateString: template,
	
		rowCount: 1,
		
		cellPaddingTop: 4,
		
		roundToDay: false,
		
		_defaultHeight: -1,
		
		layoutDuringResize: true,
		
		_defaultItemToRendererKindFunc: function(item){
			// tags:
			//		private
			return item.allDay ? "horizontal" : null;
		},
		
		_formatGridCellLabel: function(){return null;},
		
		_formatRowHeaderLabel: function(){return null;},
		
		
		// events redispatch
		__fixEvt:function(e){
			e.sheet = "secondary";
			e.source = this;
			return e;
		},
		
		_dispatchCalendarEvt: function(e, name){
			e = this.inherited(arguments);
			if(this.owner.owner){ // the calendar
				this.owner.owner[name](e);
			}
		},
		
		_layoutExpandRenderers: function(index, hasHiddenItems, hiddenItems){
			if(!this.expandRenderer){
				return;
			}
			var h = domGeometry.getMarginBox(this.domNode).h;
			if(this._defaultHeight == -1){
				this._defaultHeight = h;
			}
			if(this._defaultHeight != -1 && this._defaultHeight != h && h >= this._getExpandedHeight()){
				this._layoutExpandRendererImpl(0, this._expandedRowCol, null, true);
			}else{
				this.inherited(arguments);
			}
		},
	
		expandRendererClickHandler: function(e, renderer){
			// summary:
			//		Default action when an expand renderer is clicked.
			//		This method will expand the secondary sheet to show all the events.
			// e: Event
			//		The mouse event.
			// renderer: Object
			//		The renderer that was clicked.
			// tags:
			//		callback

			
			event.stop(e);
			var h = domGeometry.getMarginBox(this.domNode).h;			
			if(this._defaultHeight == h || h < this._getExpandedHeight()){
				this._expandedRowCol = renderer.columnIndex;
				this.owner.resizeSecondarySheet(this._getExpandedHeight());
			}else{
				this.owner.resizeSecondarySheet(this._defaultHeight);
			}
		},
		
		_getExpandedHeight: function(){
			// tags:
			//		private

			return this.naturalRowsHeight[0] + this.expandRendererHeight + this.verticalGap + this.verticalGap;
		},
		
		_layoutRenderers: function(renderData){
			if(!this._domReady){			
				return;
			}
			this.inherited(arguments);
		}

	});
});

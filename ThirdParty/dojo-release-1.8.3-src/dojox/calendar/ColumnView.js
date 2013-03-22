define([    
"dojo/_base/declare", 
"dojo/_base/event", 
"dojo/_base/lang", 
"dojo/_base/sniff", 
"dojo/_base/fx", 
"dojo/dom",
"dojo/dom-class",
"dojo/dom-style", 
"dojo/dom-geometry", 
"dojo/dom-construct", 
"dojo/on",
"dojo/date", 
"dojo/date/locale", 
"dojo/query",	
"dojox/html/metrics",
"./SimpleColumnView", 
"dojo/text!./templates/ColumnView.html", 
"./ColumnViewSecondarySheet"],

function(
	declare, 
	event, 
	lang, 
	has, 
	fx, 
	dom, 
	domClass, 
	domStyle,
	domGeometry, 
	domConstruct,
	on,
	date, 
	locale, 
	query, 
	metrics,
	SimpleColumnView, 
	template, 
	ColumnViewSecondarySheet){

	return declare("dojox.calendar.ColumnView", SimpleColumnView, {

		// summary:		
		//		This class defines a simple column view that also uses a secondary 
		//		sheet to display long or all day events. 
		//		By default an dojox.calendar.ColumnViewSecondarySheet instance is created.
		//		Set the secondarySheetClass property to define the class to instantiate,
		//		for example to mix the default class with Mouse, Keyboard or Touch plugins. 

		templateString: template,
	
		baseClass: "dojoxCalendarColumnView",
		
		// secondarySheetClass: Class
		//		The secondary sheet class, by default dojox.calendar.ColumnViewSecondarySheet.
		secondarySheetClass: ColumnViewSecondarySheet,
		
		// secondarySheetProps: Object
		//		Secondary sheet constructor parameters.
		secondarySheetProps: null,
		
		// headerPadding: Integer
		//	Padding between the header (composed of the secondary sheet and the column header) 
		//	and the primary sheet.
		headerPadding: 3,
		
		buildRendering: function(){
			this.inherited(arguments);
			if(this.secondarySheetNode){
				var args = lang.mixin({owner: this}, this.secondarySheetProps);
				this.secondarySheet = new this.secondarySheetClass(args, this.secondarySheetNode);				
				this.secondarySheetNode = this.secondarySheet.domNode;				
			}
		},
			
		destroy: function(preserveDom){
			if(this.secondarySheet){
				this.secondarySheet.destroy(preserveDom);
			}
			this.inherited(arguments);
		},
		
		_setVisibility: function(value){
			// tags:
			//		private

			this.inherited(arguments);
			if(this.secondarySheet){
				this.secondarySheet._setVisibility(value);
			}
		},
		
		invalidateLayout: function(){
			// tags:
			//		private

			this._layoutRenderers(this.renderData);
			if(this.secondarySheet){
				this.secondarySheet._layoutRenderers(this.secondarySheet.renderData);
			}
		},
		
		onRowHeaderClick: function(e){
			// summary:
			//		Event dispatched when the row header cell of the secondary sheet is clicked.
			// tags:
			//		callback

		},
		
		resizeSecondarySheet: function(height){
			// summary:
			//		Resizes the secondary sheet header and relayout the other sub components according this new height.
			//		Warning: this method is only available for the default template and default CSS.
			// height: Integer
			//		The new height in pixels.
			if(this.secondarySheetNode){
				var headerH = domGeometry.getMarginBox(this.header).h;
				domStyle.set(this.secondarySheetNode, "height", height+"px");
				this.secondarySheet._resizeHandler(null, true);
				var top = (height + headerH + this.headerPadding)+"px";
				domStyle.set(this.scrollContainer, "top", top);
				if(this.vScrollBar){
					domStyle.set(this.vScrollBar, "top", top);
				}
			}
		},
		
		updateRenderers: function(obj, stateOnly){
			this.inherited(arguments);
			if(this.secondarySheet){
				this.secondarySheet.updateRenderers(obj, stateOnly);
			}
		},
		
		_setItemsAttr: function(value){
			this.inherited(arguments);
			if(this.secondarySheet){
				this.secondarySheet.set("items", value);
			}
		},
		
		_setStartDateAttr: function(value){
			this.inherited(arguments);
			if(this.secondarySheet){
				this.secondarySheet.set("startDate", value);
			}
		},
		
		_setColumnCountAttr: function(value){
			this.inherited(arguments);
			if(this.secondarySheet){
				this.secondarySheet.set("columnCount", value);
			}
		},
		
		_setHorizontalRendererAttr: function(value){
			if(this.secondarySheet){
				this.secondarySheet.set("horizontalRenderer", value);
			}
		},
		
		_getHorizontalRendererAttr: function(value){
			if(this.secondarySheet){
				return this.secondarySheet.get("horizontalRenderer");
			}
		},
		
		_setExpandRendererAttr: function(value){
			if(this.secondarySheet){
				this.secondarySheet.set("expandRenderer", value);
			}
		},
		
		_getExpandRendererAttr: function(value){
			if(this.secondarySheet){
				return this.secondarySheet.get("expandRenderer");
			}
		},
					
		_setTextDirAttr: function(value){
			this.secondarySheet.set("textDir", value);
			this._set("textDir", value);
		},
		
		_defaultItemToRendererKindFunc: function(item){
			return item.allDay ? null : "vertical"; // String
		},
		
		getSecondarySheet: function(){
			// summary:
			//		Returns the secondary sheet
			// returns: dojox/calendar/MatrixView
			return this.secondarySheet;
		},
		
		_onGridTouchStart: function(e){
			this.inherited(arguments);
			this._doEndItemEditing(this.secondarySheet, "touch");
		},
		
		_onGridMouseDown: function(e){
			this.inherited(arguments);
			this._doEndItemEditing(this.secondarySheet, "mouse");
		},
		
		_configureScrollBar: function(renderData){


			this.inherited(arguments);
			if(this.secondarySheetNode){
				var atRight = this.isLeftToRight() ? true : this.scrollBarRTLPosition == "right";
				domStyle.set(this.secondarySheetNode, atRight ? "right" : "left", renderData.scrollbarWidth + "px");
				domStyle.set(this.secondarySheetNode, atRight ? "left" : "right", "0");
			}
		},
		
		_refreshItemsRendering: function(){
			this.inherited(arguments);
			if(this.secondarySheet){
				var rd = this.secondarySheet.renderData;
				this.secondarySheet._computeVisibleItems(rd);
				this.secondarySheet._layoutRenderers(rd);
			}			
		},
		
		_layoutRenderers: function(renderData){
			if(!this.secondarySheet._domReady){
				this.secondarySheet._domReady = true;
				this.secondarySheet._layoutRenderers(this.secondarySheet.renderData);
			}
			
			this.inherited(arguments);
		},
		
		invalidateRendering: function(){
			if(this.secondarySheet){
				this.secondarySheet.invalidateRendering();
			}
			this.inherited(arguments);
		}

	});
});

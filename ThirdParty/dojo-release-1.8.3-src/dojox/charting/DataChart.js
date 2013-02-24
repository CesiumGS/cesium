define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/declare", "dojo/_base/html", "dojo/_base/connect",
	 "dojo/_base/array", "./Chart2D", "./themes/PlotKit/blue", "dojo/dom"], 
	 function(kernel, lang, declare, html, hub, arr, Chart, blue, dom){
	// FIXME: This module drags in all Charting modules because of the Chart2D dependency...it is VERY heavy
	kernel.experimental("dojox.charting.DataChart");

	// Defaults for axes
	//	to be mixed in with xaxis/yaxis custom properties
	// see dojox.charting.axis2d.Default for details.
	var _yaxis = {
		vertical: true,
		min: 0,
		max: 10,
		majorTickStep: 5,
		minorTickStep: 1,
		natural:false,
		stroke: "black",
		majorTick: {stroke: "black", length: 8},
		minorTick: {stroke: "gray", length: 2},
		majorLabels:true
	};

	var _xaxis = {
		natural: true, 		// true - no fractions
		majorLabels: true, 	//show labels on major ticks
		includeZero: false, // do not change on upating chart
		majorTickStep: 1,
		majorTick: {stroke: "black", length: 8},
		fixUpper:"major",
		stroke: "black",
		htmlLabels: true,
		from:1
	};

	// default for chart elements
	var chartPlot = {
		markers: true,
		tension:2,
		gap:2
	};

	return declare("dojox.charting.DataChart", Chart, {
		// summary:
		//		Extension to the 2D chart that connects to a data store in
		//		a simple manner. Convenience methods have been added for
		//		connecting store item labels to the chart labels.
		// description:
		//		This code should be considered very experimental and the APIs subject
		//		to change. This is currently an alpha version and will need some testing
		//		and review.
		//
		//		The main reason for this extension is to create animated charts, generally
		//		available with scroll=true, and a property field that gets continually updated.
		//		The previous property settings are kept in memory and displayed until scrolled
		//		off the chart.
		//
		//		Although great effort was made to maintain the integrity of the current
		//		charting APIs, some things have been added or modified in order to get
		//		the store to connect and also to get the data to scroll/animate.
		//		"displayRange" in particular is used to force the xaxis to a specific
		//		size and keep the chart from stretching or squashing to fit the data.
		//
		//		Currently, plot lines can only be set at initialization. Setting
		//		a new store query will have no effect (although using setStore
		//		may work but its untested).
		// example:
		//	|	var chart = new dojox.charting.DataChart("myNode", {
		//	|		displayRange:8,
		//	|		store:dataStore,
		//	|		query:{symbol:"*"},
		//	|		fieldName:"price"
		//	|		type: dojox.charting.plot2d.Columns
		//	|	});

		// scroll: Boolean
		//		Whether live data updates and changes display, like columns moving
		//		up and down, or whether it scrolls to the left as data is added
		scroll:true,

		// comparative: Boolean
		//		If false, all items are each their own series.
		//		If true, the items are combined into one series
		//		so that their charted properties can be compared.
		comparative:false,

		// query: String
		//		Used for fetching items. Will vary depending upon store.
		query: "*",

		// queryOptions: String
		//		Option used for fetching items
		queryOptions: "",

		/*=====
			// start:Number
			//		first item to fetch from store
			// count:Number
			//		Total amount of items to fetch from store
			// sort:Object
			//		Parameters to sort the fetched items from store
		=====*/

		// fieldName: String
		//		The field in the store item that is getting charted
		fieldName: "value",

		// chartTheme: dojox.charting.themes.*
		//		The theme to style the chart. Defaults to PlotKit.blue.
		chartTheme: blue,

		// displayRange: Number
		//		The number of major ticks to show on the xaxis
		displayRange:0,

		// stretchToFit: Boolean
		//		If true, chart is sized to data. If false, chart is a
		//		fixed size. Note, is overridden by displayRange.
		//		TODO: Stretch for the y-axis?
		stretchToFit:true,

		// minWidth: Number
		//		The the smallest the chart width can be
		minWidth:200,

		// minHeight: Number
		//		The the smallest the chart height can be
		minHeight:100,

		// showing: Boolean
		//		Whether the chart is showing (default) on
		//		initialization or hidden.
		showing: true,

		// label: String
		//		The name field of the store item
		//		DO NOT SET: Set from store.labelAttribute
		label: "name",

		constructor: function(node, kwArgs){
			// summary:
			//		Set up properties and initialize chart build.
			// node: DomNode
			//		The node to attach the chart to.
			// kwArgs: Object
			//		- xaxis: Object: optional parameters for xaxis (see above)
			//		- yaxis: Object: optional parameters for yaxis (see above)
			//		- store: Object: dojo.data store (currently nly supports Persevere)
			//		- xaxis: Object: First query for store
			//		- grid: Object: Options for the grid plot
			//		- chartPlot: Object: Options for chart elements (lines, bars, etc)

			this.domNode = dom.byId(node);

			lang.mixin(this, kwArgs);

			this.xaxis = lang.mixin(lang.mixin({}, _xaxis), kwArgs.xaxis);
			if(this.xaxis.labelFunc == "seriesLabels"){
				this.xaxis.labelFunc = lang.hitch(this, "seriesLabels");
			}

			this.yaxis = lang.mixin(lang.mixin({}, _yaxis), kwArgs.yaxis);
			if(this.yaxis.labelFunc == "seriesLabels"){
				this.yaxis.labelFunc = lang.hitch(this, "seriesLabels");
			}

			// potential event's collector
			this._events = [];

			this.convertLabels(this.yaxis);
			this.convertLabels(this.xaxis);

			this.onSetItems = {};
			this.onSetInterval = 0;
			this.dataLength = 0;
			this.seriesData = {};
			this.seriesDataBk = {};
			this.firstRun =  true;

			this.dataOffset = 0;

			// FIXME: looks better with this, but it's custom
			this.chartTheme.plotarea.stroke = {color: "gray", width: 3};

			this.setTheme(this.chartTheme);

			// displayRange overrides stretchToFit
			if(this.displayRange){
				this.stretchToFit = false;
			}
			if(!this.stretchToFit){
				this.xaxis.to = this.displayRange;
			}
			// we don't want axis on Pie
			var cartesian = kwArgs.type && kwArgs.type != "Pie" && kwArgs.type.prototype.declaredClass != "dojox.charting.plot2d.Pie";
			if(cartesian){
				this.addAxis("x", this.xaxis);
				this.addAxis("y", this.yaxis);
			}
			chartPlot.type = kwArgs.type || "Markers";
			this.addPlot("default", lang.mixin(chartPlot, kwArgs.chartPlot));
			if(cartesian){
				this.addPlot("grid", lang.mixin(kwArgs.grid || {}, {type: "Grid", hMinorLines: true}));
			}
			
			if(this.showing){
				this.render();
			}

			if(kwArgs.store){
				this.setStore(kwArgs.store, kwArgs.query, kwArgs.fieldName, kwArgs.queryOptions);
			}
		},

		destroy: function(){
			arr.forEach(this._events, hub.disconnect);
			this.inherited(arguments);
		},

		setStore: function(/*Object*/store, /* ? String*/query, /* ? String*/fieldName, /* ? Object */queryOptions){
			// summary:
			//		Sets the chart store and query
			//		then does the first fetch and
			//		connects to subsequent changes.

			// TODO: Not handling resetting store

			this.firstRun = true;
			this.store = store || this.store;
			this.query = query || this.query;
			this.fieldName = fieldName || this.fieldName;
			this.label = this.store.getLabelAttributes();
			this.queryOptions = queryOptions || queryOptions;

			arr.forEach(this._events, hub.disconnect);
			this._events = [
				hub.connect(this.store, "onSet", this, "onSet"),
				hub.connect(this.store, "onError", this, "onError")
			];
			this.fetch();
		},

		show: function(){
			// summary:
			//		If chart is hidden, show it
			if(!this.showing){
				html.style(this.domNode, "display", "");
				this.showing = true;
				this.render();
			}
		},
		hide: function(){
			// summary:
			//		If chart is showing, hide it
			//		Prevents rendering while hidden
			if(this.showing){
				html.style(this.domNode, "display", "none");
				this.showing = false;
			}
		},

		onSet: function(/*storeObject*/item){
			// summary:
			//		Fired when a store item changes.
			//		Collects the item calls and when
			//		done (after 200ms), sends item
			//		array to onData().

			// FIXME: Using labels instead of IDs for item
			//	identifiers here and in the chart series. This
			//	is obviously short sighted, but currently used
			//	for seriesLabels. Workaround for potential bugs
			//	is to assign a label for which all items are unique.

			var nm = this.getProperty(item, this.label);

			// FIXME: why the check for if-in-runs?
			if(nm in this.runs || this.comparative){
				clearTimeout(this.onSetInterval);
				if(!this.onSetItems[nm]){
					this.onSetItems[nm] = item;
				}
				this.onSetInterval = setTimeout(lang.hitch(this, function(){
					clearTimeout(this.onSetInterval);
					var items = [];
					for(var nm in this.onSetItems){
						items.push(this.onSetItems[nm]);
					}
					this.onData(items);
					this.onSetItems = {};
				}),200);
			}
		},

		onError: function(/*Error*/err){
			// stub
			//	Fires on fetch error
			console.error("DataChart Error:", err);
		},

		onDataReceived: function(/*Array*/items){
			// summary:
			//		stub. Fires after data is received but
			//		before data is parsed and rendered
		},

		getProperty: function(/*storeObject*/item, prop){
			// summary:
			//		The main use of this function is to determine
			//		between a single value and an array of values.
			//		Other property types included for convenience.
			//
			if(prop==this.label){
				return this.store.getLabel(item);
			}
			if(prop=="id"){
				return this.store.getIdentity(item);
			}
			var value = this.store.getValues(item, prop);
			if(value.length < 2){
				value = this.store.getValue(item, prop);
			}
			return value;
		},
		onData: function(/*Array*/items){
			// summary:
			//		Called after a completed fetch
			//		or when store items change.
			//		On first run, sets the chart data,
			//		then updates chart and legends.

			//console.log("Store:", store);console.log("items: (", items.length+")", items);console.log("Chart:", this);
			if(!items || !items.length){ return; }

			if(this.items && this.items.length != items.length){
				arr.forEach(items, function(m){
					var id = this.getProperty(m, "id");
					arr.forEach(this.items, function(m2, i){
						if(this.getProperty(m2, "id") == id){
							this.items[i] = m2;
						}
					},this);
				}, this);
				items = this.items;
			}
			if(this.stretchToFit){
				this.displayRange = items.length;
			}
			this.onDataReceived(items);
			this.items = items;


			if(this.comparative){
				// all items are gathered together and used as one
				//	series so their properties can be compared.
				var nm = "default";

				this.seriesData[nm] = [];
				this.seriesDataBk[nm] = [];
				arr.forEach(items, function(m, i){
					var field = this.getProperty(m, this.fieldName);
					this.seriesData[nm].push(field);
				}, this);

			}else{

				// each item is a separate series.
				arr.forEach(items, function(m, i){
					var nm = this.store.getLabel(m);
					if(!this.seriesData[nm]){
						this.seriesData[nm] = [];
						this.seriesDataBk[nm] = [];
					}

					// the property in the item we are using
					var field = this.getProperty(m, this.fieldName);
					if(lang.isArray(field)){
						// Data is an array, so it's a snapshot, and not
						//	live, updating data
						//
						this.seriesData[nm] = field;

					}else{
						if(!this.scroll){
							// Data updates, and "moves in place". Columns and
							//	line markers go up and down
							//
							// create empty chart elements by starting an array
							//	with zeros until we reach our relevant data
							var ar = arr.map(new Array(i+1), function(){ return 0; });
							ar.push(Number(field));
							this.seriesData[nm] = ar;

						}else{
							// Data updates and scrolls to the left
							if(this.seriesDataBk[nm].length > this.seriesData[nm].length){
								this.seriesData[nm] = this.seriesDataBk[nm];
							}
							// Collecting and storing series data. The items come in
							//	only one at a time, but we need to display historical
							//	data, so it is kept in memory.
							this.seriesData[nm].push(Number(field));
						}
						this.seriesDataBk[nm].push(Number(field));
					}
				}, this);
			}

			// displayData is the segment of the data array that is within
			// the chart boundaries
			var displayData;
			if(this.firstRun){
				// First time around we need to add the series (chart lines)
				//	to the chart.
				this.firstRun = false;
				for(nm in this.seriesData){
					this.addSeries(nm, this.seriesData[nm]);
					displayData = this.seriesData[nm];
				}

			}else{

				// update existing series
				for(nm in this.seriesData){
					displayData = this.seriesData[nm];

					if(this.scroll && displayData.length > this.displayRange){
						// chart lines have gone beyond the right boundary.
						this.dataOffset = displayData.length-this.displayRange - 1;
						displayData = displayData.slice(displayData.length-this.displayRange, displayData.length);
					}
					this.updateSeries(nm, displayData);
				}
			}
			this.dataLength = displayData.length;

			if(this.showing){
				this.render();
			}

		},

		fetch: function(){
			// summary:
			//		Fetches initial data. Subsequent changes
			//		are received via onSet in data store.
			//
			if(!this.store){ return; }
			this.store.fetch({query:this.query, queryOptions:this.queryOptions, start:this.start, count:this.count, sort:this.sort,
				onComplete:lang.hitch(this, function(data){
					setTimeout(lang.hitch(this, function(){
						this.onData(data)
					}),0);
				}),
				onError:lang.hitch(this, "onError")
			});
		},

		convertLabels: function(axis){
			// summary:
			//		Convenience method to convert a label array of strings
			//		into an array of objects
			//
			if(!axis.labels || lang.isObject(axis.labels[0])){ return null; }

			axis.labels = arr.map(axis.labels, function(ele, i){
				return {value:i, text:ele};
			});
			return null; // null
		},

		seriesLabels: function(/*Number*/val){
			// summary:
			//		Convenience method that sets series labels based on item labels.
			val--;
			if(this.series.length<1 || (!this.comparative && val>this.series.length)){ return "-"; }
			if(this.comparative){
				return this.store.getLabel(this.items[val]);// String

			}else{
				// FIXME:
				// Here we are setting the label base on if there is data in the array slot.
				//	A typical series may look like: [0,0,3.1,0,0,0] which mean the data is populated in the
				//	3rd row or column. This works well and keeps the labels aligned but has a side effect
				//	of not showing the label is the data is zero. Work around is to not go lower than
				//	0.01 or something.
				for(var i=0;i<this.series.length; i++){
					if(this.series[i].data[val]>0){
						return this.series[i].name; // String
					}
				}
			}
			return "-"; // String

		},

		resizeChart: function(/*Object*/dim){
			// summary:
			//		Call this function to change the chart size.
			//		Can be connected to a layout widget that calls
			//		resize.

			var w = Math.max(dim.w, this.minWidth);
			var h = Math.max(dim.h, this.minHeight);
			this.resize(w, h);
		}
	});
});

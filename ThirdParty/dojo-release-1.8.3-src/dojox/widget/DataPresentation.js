dojo.provide("dojox.widget.DataPresentation");
dojo.experimental("dojox.widget.DataPresentation");

dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.charting.Chart2D");
dojo.require("dojox.charting.widget.Legend");
dojo.require("dojox.charting.action2d.Tooltip");
dojo.require("dojox.charting.action2d.Highlight");
dojo.require("dojo.colors");
dojo.require("dojo.data.ItemFileWriteStore");

(function(){
	
	// sort out the labels for the independent axis of the chart
	var getLabels = function(range, labelMod, charttype, domNode){
		
		// prepare labels for the independent axis
		var labels = [];
		// add empty label, hack
		labels[0] = {value: 0, text: ''};

		var nlabels = range.length;

		// auto-set labelMod for horizontal charts if the labels will otherwise collide
		if((charttype !== "ClusteredBars") && (charttype !== "StackedBars")){
    		var cwid = domNode.offsetWidth;
    		var tmp = ("" + range[0]).length * range.length * 7; // *assume* 7 pixels width per character ( was 9 )
    	  
    		if(labelMod == 1){
    			for(var z = 1; z < 500; ++z){
    				if((tmp / z) < cwid){
    					break;
    				}
    				++labelMod;
    			}
    		}
	    }

		// now set the labels
		for(var i = 0; i < nlabels; i++){
			//sparse labels
			labels.push({
				value: i + 1,
				text: (!labelMod || i % labelMod) ? "" : range[i]
			});
		}
		
		// add empty label again, hack
		labels.push({value: nlabels + 1, text:''});
		
		return labels;
	};
	
	// get the configuration of an independent axis for the chart
	var getIndependentAxisArgs = function(charttype, labels){

		var args = { vertical: false, labels: labels, min: 0, max: labels.length-1, majorTickStep: 1, minorTickStep: 1 };
		
		// clustered or stacked bars have a vertical independent axis
		if((charttype === "ClusteredBars") || (charttype === "StackedBars")){
			args.vertical = true;
		}
		
		// lines, areas and stacked areas don't need the extra slots at each end
		if((charttype === "Lines") || (charttype === "Areas") || (charttype === "StackedAreas")){
			args.min++;
			args.max--;
		}

		return args;
	};

	// get the configuration of a dependent axis for the chart
	var getDependentAxisArgs = function(charttype, axistype, minval, maxval){
		
		var args = { vertical: true, fixLower: "major", fixUpper: "major", natural: true };
		
		// secondary dependent axis is not left-bottom
		if(axistype === "secondary"){
			args.leftBottom = false;
		}

		// clustered or stacked bars have horizontal dependent axes
		if((charttype === "ClusteredBars") || (charttype === "StackedBars")){
			args.vertical = false;
		}
		
		// ensure axis does not "collapse" for flat series
		if(minval == maxval){
			args.min = minval - 1;
			args.max = maxval + 1;
		}
		
		return args;
	};
	
	// get the configuration of a plot for the chart
	var getPlotArgs = function(charttype, axistype, animate){
		
		var args = { type: charttype, hAxis: "independent", vAxis: "dependent-" + axistype, gap: 4, lines: false, areas: false, markers: false };
		
		// clustered or stacked bars have horizontal dependent axes
		if((charttype === "ClusteredBars") || (charttype === "StackedBars")){
			args.hAxis = args.vAxis;
			args.vAxis = "independent";
		}

		// turn on lines for Lines, Areas and StackedAreas
		if((charttype === "Lines") || (charttype === "Hybrid-Lines") || (charttype === "Areas") || (charttype === "StackedAreas")){
			args.lines = true;
		}
		
		// turn on areas for Areas and StackedAreas
		if((charttype === "Areas") || (charttype === "StackedAreas")){
			args.areas = true;
		}
		
		// turn on markers and shadow for Lines
		if(charttype === "Lines"){
			args.markers = true;
		}
		
		// turn on shadow for Hybrid-Lines
		// also, Hybrid-Lines is not a true chart type: use Lines for the actual plot
		if(charttype === "Hybrid-Lines"){
			args.shadows = {dx: 2, dy: 2, dw: 2};
			args.type = "Lines";
		}
		
		// also, Hybrid-ClusteredColumns is not a true chart type: use ClusteredColumns for the actual plot
		if(charttype === "Hybrid-ClusteredColumns"){
			args.type = "ClusteredColumns";
		}
		
		// enable animation on the plot if animation is requested
		if(animate){
			args.animate = animate;
		}
		
		return args;
	};

	// set up a chart presentation
	var setupChart = function(/*DomNode*/domNode, /*Object?*/chart, /*String*/type, /*Boolean*/reverse, /*Object*/animate, /*Integer*/labelMod, /*String*/theme, /*String*/tooltip, /*Object?*/store, /*String?*/query, /*String?*/queryOptions){
		var _chart = chart;
		
		if(!_chart){
			domNode.innerHTML = "";  // any other content in the node disrupts the chart rendering
			_chart = new dojox.charting.Chart2D(domNode);
		}
		
		// set the theme
		if(theme){

			// workaround for a theme bug: its _clone method
			// does not transfer the markers, so we repair
			// that omission here
			// FIXME this should be removed once the theme bug is fixed
	        theme._clone = function(){
			      var result = new dojox.charting.Theme({
			        chart: this.chart,
			        plotarea: this.plotarea,
			        axis: this.axis,
			        series: this.series,
			        marker: this.marker,
			        antiAlias: this.antiAlias,
			        assignColors: this.assignColors,
			        assignMarkers: this.assigneMarkers,
			        colors: dojo.delegate(this.colors)
			      });
			      
			      result.markers = this.markers;
			      result._buildMarkerArray();
			      
			      return result;
	        };
			
			_chart.setTheme(theme);
		}

		var range = store.series_data[0].slice(0);
		
		// reverse the labels if requested
		if(reverse){
			range.reverse();
		}
			
		var labels = getLabels(range, labelMod, type, domNode);

		// collect details of whether primary and/or secondary axes are required
		// and what plots we have instantiated using each type of axis
		var plots = {};
		
		// collect maximum and minimum data values
		var maxval = null;
		var minval = null;
		
		var seriestoremove = {};
		for(var sname in _chart.runs){
			seriestoremove[sname] = true;
		}

		// set x values & max data value
		var nseries = store.series_name.length;
		for(var i = 0; i < nseries; i++){
			// only include series with chart=true and with some data values in
			if(store.series_chart[i] && (store.series_data[i].length > 0)){

				var charttype = type;
				var axistype = store.series_axis[i];

				if(charttype == "Hybrid"){
					if(store.series_charttype[i] == 'line'){
						charttype = "Hybrid-Lines";
					}else{
						charttype = "Hybrid-ClusteredColumns";
					}
				}
				
				// ensure we have recorded that we are using this axis type
				if(!plots[axistype]){
					plots[axistype] = {};
				}
				
				// ensure we have the correct type of plot for this series
				if(!plots[axistype][charttype]){
					var axisname = axistype + "-" + charttype;
					
					// create the plot and enable tooltips
					_chart.addPlot(axisname, getPlotArgs(charttype, axistype, animate));

					var tooltipArgs = {};
					if(typeof tooltip == 'string'){
						tooltipArgs.text = function(o){
							var substitutions = [o.element, o.run.name, range[o.index], ((charttype === "ClusteredBars") || (charttype === "StackedBars")) ? o.x : o.y];
							return dojo.replace(tooltip, substitutions);  // from Dojo 1.4 onward
							//return tooltip.replace(/\{([^\}]+)\}/g, function(_, token){ return dojo.getObject(token, false, substitutions); });  // prior to Dojo 1.4
						}
					}else if(typeof tooltip == 'function'){
						tooltipArgs.text = tooltip;
					}
					new dojox.charting.action2d.Tooltip(_chart, axisname, tooltipArgs);
					
					// add highlighting, except for lines
					if(charttype !== "Lines" && charttype !== "Hybrid-Lines"){
						new dojox.charting.action2d.Highlight(_chart, axisname);
					}
					
					// record that this plot type is now created
					plots[axistype][charttype] = true;
				}
				
				// extract the series values
				var xvals = [];
				var valen = store.series_data[i].length;
				for(var j = 0; j < valen; j++){
					var val = store.series_data[i][j];
					xvals.push(val);
					if(maxval === null || val > maxval){
						maxval = val;
					}
					if(minval === null || val < minval){
						minval = val;
					}
				}
					
				// reverse the values if requested
				if(reverse){
					xvals.reverse();
				}

				var seriesargs = { plot: axistype + "-" + charttype };
				if(store.series_linestyle[i]){
					seriesargs.stroke = { style: store.series_linestyle[i] };
				}

				_chart.addSeries(store.series_name[i], xvals, seriesargs);
				delete seriestoremove[store.series_name[i]];
			}
		}
		
		// remove any series that are no longer needed
		for(sname in seriestoremove){
			_chart.removeSeries(sname);
		}

		// create axes
		_chart.addAxis("independent", getIndependentAxisArgs(type, labels));
		_chart.addAxis("dependent-primary", getDependentAxisArgs(type, "primary", minval, maxval));
		_chart.addAxis("dependent-secondary", getDependentAxisArgs(type, "secondary", minval, maxval));
		
		return _chart;
	};

	// set up a legend presentation
	var setupLegend = function(/*DomNode*/domNode, /*Legend*/legend, /*Chart2D*/chart, /*Boolean*/horizontal){
		// destroy any existing legend and recreate
		var _legend = legend;
		
		if(!_legend){
			_legend = new dojox.charting.widget.Legend({ chart: chart, horizontal: horizontal }, domNode);
		}else{
			_legend.refresh();
		}
		
		return _legend;
	};
	
	// set up a grid presentation
	var setupGrid = function(/*DomNode*/domNode, /*Object?*/grid, /*Object?*/store, /*String?*/query, /*String?*/queryOptions){
		var _grid = grid || new dojox.grid.DataGrid({}, domNode);
		_grid.startup();
		_grid.setStore(store, query, queryOptions);
		
		var structure = [];
		for(var ser = 0; ser < store.series_name.length; ser++){
			// only include series with grid=true and with some data values in
			if(store.series_grid[ser] && (store.series_data[ser].length > 0)){
				structure.push({ field: "data." + ser, name: store.series_name[ser], width: "auto", formatter: store.series_gridformatter[ser] });
			}
		}
		
		_grid.setStructure(structure);
		
		return _grid;
	};
	
	// set up a title presentation
	var setupTitle = function(/*DomNode*/domNode, /*object*/store){
		if(store.title){
			domNode.innerHTML = store.title;
		}
	};
	
	// set up a footer presentation
	var setupFooter = function(/*DomNode*/domNode, /*object*/store){
		if(store.footer){
			domNode.innerHTML = store.footer;
		}
	};
	
	// obtain a subfield from a field specifier which may contain
	// multiple levels (eg, "child.foo[36].manacle")
	var getSubfield = function(/*Object*/object, /*String*/field){
		var result = object;
		
		if(field){
			var fragments = field.split(/[.\[\]]+/);
			for(var frag = 0, l = fragments.length; frag < l; frag++){
				if(result){
					result = result[fragments[frag]];
				}
			}
		}
		
		return result;
	};
	
	dojo.declare("dojox.widget.DataPresentation", null, {
		// summary:
		//		A widget that connects to a data store in a simple manner,
		//		and also provides some additional convenience mechanisms
		//		for connecting to common data sources without needing to
		//		explicitly construct a Dojo data store. The widget can then
		//		present the data in several forms: as a graphical chart,
		//		as a tabular grid, or as display panels presenting meta-data
		//		(title, creation information, etc) from the data. The
		//		widget can also create and manage several of these forms
		//		in one simple construction.
		//
		//		Note: this is a first experimental draft and any/all details
		//		are subject to substantial change in later drafts.
		// example:
		// |	var pres = new dojox.data.DataPresentation("myChartNode", {
		// |		type: "chart",
		// |		url: "/data/mydata",
		// |		gridNode: "myGridNode"
		// |	});

		// store: Object
		//		Dojo data store used to supply data to be presented. This may
		//		be supplied on construction or created implicitly based on
		//		other construction parameters ('data', 'url').

		// query: String
		//		Query to apply to the Dojo data store used to supply data to
		//		be presented.

		// queryOptions: String
		//		Query options to apply to the Dojo data store used to supply
		//		data to be presented.

		// data: Object
		//		Data to be presented. If supplied on construction this property
		//		will override any value supplied for the 'store' property.

		// url: String
		//		URL to fetch data from in JSON format. If supplied on
		//		construction this property will override any values supplied
		//		for the 'store' and/or 'data' properties. Note that the data
		//		can also be comment-filtered JSON, although this will trigger
		//		a warning message in the console unless djConfig.useCommentedJson
		//		has been set to true.

		// urlContent: Object
		//		Content to be passed to the URL when fetching data. If a URL has
		//		not been supplied, this value is ignored.

		// urlError: function
		//		A function to be called if an error is encountered when fetching
		//		data from the supplied URL. This function will be supplied with
		//		two parameters exactly as the error function supplied to the
		//		dojo.xhrGet function. This function may be called multiple times
		//		if a refresh interval has been supplied.

		// refreshInterval: Number
		//		the time interval in milliseconds after which the data supplied
		//		via the 'data' property or fetched from a URL via the 'url'
		//		property should be regularly refreshed. This property is
		//		ignored if neither the 'data' nor 'url' property has been
		//		supplied. If the refresh interval is zero, no regular refresh is done.

		// refreshIntervalPending:
		//		the JavaScript set interval currently in progress, if any

		// series: Array
		//		an array of objects describing the data series to be included
		//		in the data presentation. Each object may contain the
		//		following fields:
		//
		//		- datapoints: the name of the field from the source data which
		//			contains an array of the data points for this data series.
		//			If not supplied, the source data is assumed to be an array
		//			of data points to be used.
		//		- field: the name of the field within each data point which
		//			contains the data for this data series. If not supplied,
		//			each data point is assumed to be the value for the series.
		//		- name: a name for the series, used in the legend and grid headings
		//		- namefield:
		//			the name of the field from the source data which
		//			contains the name the series, used in the legend and grid
		//			headings. If both name and namefield are supplied, name takes
		//		    precedence. If neither are supplied, a default name is used.
		//		- chart: true if the series should be included in a chart presentation (default: true)
		//		- charttype: the type of presentation of the series in the chart, which can be
		//			"range", "line", "bar" (default: "bar")
		//		- linestyle: the stroke style for lines (if applicable) (default: "Solid")
		//		- axis: the dependant axis to which the series will be attached in the chart,
		//		    which can be "primary" or "secondary"
		//		- grid: true if the series should be included in a data grid presentation (default: true)
		//		- gridformatter: an optional formatter to use for this series in the data grid
		//
		//		a call-back function may alternatively be supplied. The function takes
		//		a single parameter, which will be the data (from the 'data' field or
		//		loaded from the value in the 'url' field), and should return the array
		//		of objects describing the data series to be included in the data
		//		presentation. This enables the series structures to be built dynamically
		//		after data load, and rebuilt if necessary on data refresh. The call-back
		//		function will be called each time new data is set, loaded or refreshed.
		//		A call-back function cannot be used if the data is supplied directly
		//		from a Dojo data store.

		// type: String
		//		the type of presentation to be applied at the DOM attach point.
		//		This can be 'chart', 'legend', 'grid', 'title', 'footer'. The
		//		default type is 'chart'.
		type: "chart",

		// chartType: String
		//		the type of chart to display. This can be 'clusteredbars',
		//		'areas', 'stackedcolumns', 'stackedbars', 'stackedareas',
		//		'lines', 'hybrid'. The default type is 'bar'.
		chartType: "clusteredBars",

		// reverse: Boolean
		//		true if the chart independent axis should be reversed.
		reverse: false,

		// animate: Object
		//		if an object is supplied, then the chart bars or columns will animate
		//		into place. If the object contains a field 'duration' then the value
		//		supplied is the duration of the animation in milliseconds, otherwise
		//		a default duration is used. A boolean value true can alternatively be
		//		supplied to enable animation with the default duration.
		//		The default is null (no animation).
		animate: null,

		// labelMod: Integer
		//		the frequency of label annotations to be included on the
		//		independent axis. 1=every label. 0=no labels. The default is 1.
		labelMod: 1,

		// tooltip: String|Function
		//		a string pattern defining the tooltip text to be applied to chart
		//		data points, or a function which takes a single parameter and returns
		//		the tooltip text to be applied to chart data points. The string pattern
		//		will have the following substitutions applied:
		//
		//		- {0} - the type of chart element ('bar', 'surface', etc)
		//		- {1} - the name of the data series
		//		- {2} - the independent axis value at the tooltip data point
		//		- {3} - the series value at the tooltip data point point
		//
		//		The function, if supplied, will receive a single parameter exactly
		//		as per the dojox.charting.action2D.Tooltip class. The default value
		//		is to apply the default tooltip as defined by the
		//		dojox.charting.action2D.Tooltip class.

		// legendHorizontal: Boolean|Number
		//		true if the legend should be rendered horizontally, or a number if
		//		the legend should be rendered as horizontal rows with that number of
		//		items in each row, or false if the legend should be rendered
		//		vertically (same as specifying 1). The default is true (legend
		//		rendered horizontally).
		legendHorizontal: true,

		// theme: String|Theme
		//		a theme to use for the chart, or the name of a theme.

		// chartNode: String|DomNode
		//		an optional DOM node or the id of a DOM node to receive a
		//		chart presentation of the data. Supply only when a chart is
		//		required and the type is not 'chart'; when the type is
		//		'chart' this property will be set to the widget attach point.

		// legendNode: String|DomNode
		//		an optional DOM node or the id of a DOM node to receive a
		//		chart legend for the data. Supply only when a legend is
		//		required and the type is not 'legend'; when the type is
		//		'legend' this property will be set to the widget attach point.

		// gridNode: String|DomNode
		//		an optional DOM node or the id of a DOM node to receive a
		//		grid presentation of the data. Supply only when a grid is
		//		required and the type is not 'grid'; when the type is
		//		'grid' this property will be set to the widget attach point.

		// titleNode: String|DomNode
		//		an optional DOM node or the id of a DOM node to receive a
		//		title for the data. Supply only when a title is
		//		required and the type is not 'title'; when the type is
		//		'title' this property will be set to the widget attach point.

		// footerNode: String|DomNode
		//		an optional DOM node or the id of a DOM node to receive a
		//		footer presentation of the data. Supply only when a footer is
		//		required and the type is not 'footer'; when the type is
		//		'footer' this property will be set to the widget attach point.

		// chartWidget: Object
		//		the chart widget, if any

		// legendWidget: Object
		//		the legend widget, if any

		// gridWidget: Object
		//		the grid widget, if any
		
		constructor: function(node, args){
			// summary:
			//		Set up properties and initialize.
			// node: DomNode
			//		The node to attach the data presentation to.
			// args: Object
			//		(see above)
			
			// apply arguments directly
			dojo.mixin(this, args);

			// store our DOM attach point
			this.domNode = dojo.byId(node);
			
			// also apply the DOM attach point as the node for the presentation type
			this[this.type + "Node"] = this.domNode;
			
			// load the theme if provided by name
			if(typeof this.theme == 'string'){
				this.theme = dojo.getObject(this.theme);
			}
			
			// resolve any the nodes that were supplied as ids
			this.chartNode = dojo.byId(this.chartNode);
			this.legendNode = dojo.byId(this.legendNode);
			this.gridNode = dojo.byId(this.gridNode);
			this.titleNode = dojo.byId(this.titleNode);
			this.footerNode = dojo.byId(this.footerNode);
			
			// we used to support a 'legendVertical' so for now
			// at least maintain backward compatibility
			if(this.legendVertical){
				this.legendHorizontal = !this.legendVertical;
			}
			
			if(this.url){
				this.setURL(null, null, this.refreshInterval);
			}
			else{
				if(this.data){
					this.setData(null, this.refreshInterval);
				}
				else{
					this.setStore();
				}
			}
		},
		
		setURL: function(/*String?*/url, /*Object?*/ urlContent, /*Number?*/refreshInterval){
			// summary:
			//		Sets the URL to fetch data from, with optional content
			//		supplied with the request, and an optional
			//		refresh interval in milliseconds (0=no refresh)

			// if a refresh interval is supplied we will start a fresh
			// refresh after storing the supplied url
			if(refreshInterval){
				this.cancelRefresh();
			}
			
			this.url = url || this.url;
			this.urlContent = urlContent || this.urlContent;
			this.refreshInterval = refreshInterval || this.refreshInterval;
			
			var me = this;
			
			dojo.xhrGet({
				url: this.url,
				content: this.urlContent,
				handleAs: 'json-comment-optional',
				load: function(response, ioArgs){
					me.setData(response);
				},
				error: function(xhr, ioArgs){
					if(me.urlError && (typeof me.urlError == "function")){
						me.urlError(xhr, ioArgs);
					}
				}
			});
			
			if(refreshInterval && (this.refreshInterval > 0)){
				this.refreshIntervalPending = setInterval(function(){
					me.setURL();
				}, this.refreshInterval);
			}
		},
		
		setData: function(/*Object?*/data, /*Number?*/refreshInterval){
			// summary:
			//		Sets the data to be presented, and an optional
			//		refresh interval in milliseconds (0=no refresh)
			
			// if a refresh interval is supplied we will start a fresh
			// refresh after storing the supplied data reference
			if(refreshInterval){
				this.cancelRefresh();
			}
			
			this.data = data || this.data;
			this.refreshInterval = refreshInterval || this.refreshInterval;
			
			// TODO if no 'series' property was provided, build one intelligently here
			// (until that is done, a 'series' property must be supplied)
			
			var _series = (typeof this.series == 'function') ? this.series(this.data) : this.series;

			var datasets = [],
				series_data = [],
				series_name = [],
				series_chart = [],
				series_charttype = [],
				series_linestyle = [],
				series_axis = [],
				series_grid = [],
				series_gridformatter = [],
				maxlen = 0;
			
			// identify the dataset arrays in which series values can be found
			for(var ser = 0; ser < _series.length; ser++){
				datasets[ser] = getSubfield(this.data, _series[ser].datapoints);
				if(datasets[ser] && (datasets[ser].length > maxlen)){
					maxlen = datasets[ser].length;
				}
				
				series_data[ser] = [];
				// name can be specified in series structure, or by field in series structure, otherwise use a default
				series_name[ser] = _series[ser].name || (_series[ser].namefield ? getSubfield(this.data, _series[ser].namefield) : null) || ("series " + ser);
				series_chart[ser] = (_series[ser].chart !== false);
				series_charttype[ser] = _series[ser].charttype || "bar";
				series_linestyle[ser] = _series[ser].linestyle;
				series_axis[ser] = _series[ser].axis || "primary";
				series_grid[ser] = (_series[ser].grid !== false);
				series_gridformatter[ser] = _series[ser].gridformatter;
			}
		
			// create an array of data points by sampling the series
			// and an array of series arrays by collecting the series
			// each data point has an 'index' item containing a sequence number
			// and items named "data.0", "data.1", ... containing the series samples
			// and the first data point also has items named "name.0", "name.1", ... containing the series names
			// and items named "series.0", "series.1", ... containing arrays with the complete series in
			var point, datapoint, datavalue, fdatavalue;
			var datapoints = [];
			
			for(point = 0; point < maxlen; point++){
				datapoint = { index: point };
				for(ser = 0; ser < _series.length; ser++){
					if(datasets[ser] && (datasets[ser].length > point)){
						datavalue = getSubfield(datasets[ser][point], _series[ser].field);
						
						if(series_chart[ser]){
							// convert the data value to a float if possible
							fdatavalue = parseFloat(datavalue);
							if(!isNaN(fdatavalue)){
								datavalue = fdatavalue;
							}
						}
						
						datapoint["data." + ser] = datavalue;
						series_data[ser].push(datavalue);
					}
				}
				datapoints.push(datapoint);
			}

			if(maxlen <= 0){
				datapoints.push({index: 0});
			}
		
			// now build a prepared store from the data points we've constructed
			var store = new dojo.data.ItemFileWriteStore({ data: { identifier: 'index', items: datapoints }});
			if(this.data.title){
				store.title = this.data.title;
			}
			if(this.data.footer){
				store.footer = this.data.footer;
			}
			
			store.series_data = series_data;
			store.series_name = series_name;
			store.series_chart = series_chart;
			store.series_charttype = series_charttype;
			store.series_linestyle = series_linestyle;
			store.series_axis = series_axis;
			store.series_grid = series_grid;
			store.series_gridformatter = series_gridformatter;
			
			this.setPreparedStore(store);
			
			if(refreshInterval && (this.refreshInterval > 0)){
				var me = this;
				this.refreshIntervalPending = setInterval(function(){
					me.setData();
				}, this.refreshInterval);
			}
		},
		
		refresh: function(){
			// summary:
			//		If a URL or data has been supplied, refreshes the
			//		presented data from the URL or data. If a refresh
			//		interval is also set, the periodic refresh is
			//		restarted. If a URL or data was not supplied, this
			//		method has no effect.
			if(this.url){
				this.setURL(this.url, this.urlContent, this.refreshInterval);
			}else if(this.data){
				this.setData(this.data, this.refreshInterval);
			}
		},
		
		cancelRefresh: function(){
			// summary:
			//		Cancels any and all outstanding data refreshes
			if(this.refreshIntervalPending){
				// cancel existing refresh
				clearInterval(this.refreshIntervalPending);
				this.refreshIntervalPending = undefined;
			}
		},
	
		setStore: function(/*Object?*/store, /*String?*/query, /*Object?*/queryOptions){
			// FIXME build a prepared store properly -- this requires too tight a convention to be followed to be useful
			this.setPreparedStore(store, query, queryOptions);
		},
		
		setPreparedStore: function(/*Object?*/store, /*String?*/query, /*Object?*/queryOptions){
			// summary:
			//		Sets the store and query.

			this.preparedstore = store || this.store;
			this.query = query || this.query;
			this.queryOptions = queryOptions || this.queryOptions;
			
			if(this.preparedstore){
				if(this.chartNode){
					this.chartWidget = setupChart(this.chartNode, this.chartWidget, this.chartType, this.reverse, this.animate, this.labelMod, this.theme, this.tooltip, this.preparedstore, this.query, this,queryOptions);
					this.renderChartWidget();
				}
				if(this.legendNode){
					this.legendWidget = setupLegend(this.legendNode, this.legendWidget, this.chartWidget, this.legendHorizontal);
				}
				if(this.gridNode){
					this.gridWidget = setupGrid(this.gridNode, this.gridWidget, this.preparedstore, this.query, this.queryOptions);
					this.renderGridWidget();
				}
				if(this.titleNode){
					setupTitle(this.titleNode, this.preparedstore);
				}
				if(this.footerNode){
					setupFooter(this.footerNode, this.preparedstore);
				}
			}
		},
		
		renderChartWidget: function(){
			// summary:
			//		Renders the chart widget (if any). This method is
			//		called whenever a chart widget is created or
			//		configured, and may be connected to.
			if(this.chartWidget){
				this.chartWidget.render();
			}
		},
		
		renderGridWidget: function(){
			// summary:
			//		Renders the grid widget (if any). This method is
			//		called whenever a grid widget is created or
			//		configured, and may be connected to.
			if(this.gridWidget){
				this.gridWidget.render();
			}
		},
		
		getChartWidget: function(){
			// summary:
			//		Returns the chart widget (if any) created if the type
			//		is "chart" or the "chartNode" property was supplied.
			return this.chartWidget;
		},
		
		getGridWidget: function(){
			// summary:
			//		Returns the grid widget (if any) created if the type
			//		is "grid" or the "gridNode" property was supplied.
			return this.gridWidget;
		},
		
		destroy: function(){
			// summary:
			//		Destroys the widget and all components and resources.

			// cancel any outstanding refresh requests
			this.cancelRefresh();
			
			if(this.chartWidget){
				this.chartWidget.destroy();
				delete this.chartWidget;
			}
			
			if(this.legendWidget){
				// no legend.destroy()
				delete this.legendWidget;
			}

			if(this.gridWidget){
				// no grid.destroy()
				delete this.gridWidget;
			}
			
			if(this.chartNode){
				this.chartNode.innerHTML = "";
			}
			
			if(this.legendNode){
				this.legendNode.innerHTML = "";
			}
			
			if(this.gridNode){
				this.gridNode.innerHTML = "";
			}
			
			if(this.titleNode){
				this.titleNode.innerHTML = "";
			}
			
			if(this.footerNode){
				this.footerNode.innerHTML = "";
			}
		}
		
	});
		
})();

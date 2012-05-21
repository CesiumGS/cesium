dojo.require("dijit.dijit");
dojo.require("dojo.date.locale");
dojo.require("dojo.cookie");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Slider");
dojo.require("dijit.layout.TabContainer");
dojo.require("dijit.layout.AccordionContainer");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.Tooltip");
dojo.require("dijit.Tree");
dojo.require("dijit.tree.ForestStoreModel");
dojo.require("dojox.image.Gallery");
dojo.require("dojox.widget.PlaceholderMenuItem");
dojo.require("dojox.data.FileStore");
dojo.require("dojox.charting.widget.Chart2D");
dojo.require("dojox.charting.themes.Grasslands");
dojo.require("dojox.charting.themes.PlotKit.orange");
dojo.require("dojox.widget.Calendar");
dojo.require("dojox.widget.Portlet");
dojo.require("dojox.layout.GridContainer");
dojo.require("dojox.layout.TableContainer");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.data.HtmlStore");
dojo.require("dojox.data.FlickrRestStore");
dojo.require("dojox.fx.text");
dojo.require("dojox.layout.ExpandoPane");
dojo.require("dojox.charting.Chart3D");
dojo.require("dojox.charting.action2d.Highlight");
dojo.require("dojox.charting.action2d.MoveSlice");
dojo.require("dojox.charting.action2d.Tooltip");

//This must be included on the page for FeedPortlets that
//load local feeds.
dojo.require("dojox.data.AtomReadStore");

dojo.require("dojo.parser");

dojo.addOnLoad(function(){
	dojo.parser.parse();

	var chart = window.chart = new dojox.charting.Chart2D("zoomer");
	chart.setTheme(dojox.charting.themes.PlotKit.orange);
	chart.addAxis("x", {fixLower: "minor", natural: true, stroke: "grey",
		majorTick: {stroke: "black", length: 4}, minorTick: {stroke: "gray", length: 2}});
	chart.addAxis("y", {vertical: true, min: 0, max: 30, majorTickStep: 5, minorTickStep: 1, stroke: "grey",
		majorTick: {stroke: "black", length: 4}, minorTick: {stroke: "gray", length: 2}});
	chart.addPlot("default", {type: "Areas"});
	chart.addSeries("Series A", [0, 25, 5, 20, 10, 15, 5, 20, 0, 25]);
	chart.addAxis("x2", {fixLower: "minor", natural: true, leftBottom: false, stroke: "grey",
		majorTick: {stroke: "black", length: 4}, minorTick: {stroke: "gray", length: 2}});
	chart.addAxis("y2", {vertical: true, min: 0, max: 20, leftBottom: false, stroke: "grey",
		majorTick: {stroke: "black", length: 4}, minorTick: {stroke: "gray", length: 2}});
	chart.addPlot("plot2", {type: "Areas", hAxis: "x2", vAxis: "y2"});
	chart.addSeries("Series B", [15, 0, 15, 0, 15, 0, 15, 0, 15, 0, 15, 0, 15, 0, 15, 0, 15], {plot: "plot2"});
	chart.addPlot("grid", {type: "Grid", hMinorLines: true});
	chart.render();

	var show = setInterval(function(){
		var w = dijit.byId("gridContainer");
		if (w && w.domNode) {
			dojo.body().removeChild(dojo.byId("masker"));
			clearInterval(show);
		}
	}, 500);


	var scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0;
	dojo.connect(dijit.byId("scaleXSlider"), "onChange", function(value){
		scaleX = value;
		console.log("calling update");
		update();
	});

	function update() {
		chart.setWindow(scaleX, scaleY, offsetX, offsetY).render();
	}

	var _init = null;
	var onMouseDown = function(e){
		_init = {x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY};
		dojo.stopEvent(e);
	};

	var onMouseUp = function(e){
		if(_init){
			_init = null;
			dojo.stopEvent(e);
		}
	};

	var onMouseMove = function(e){
		if(_init){
			var dx = e.clientX - _init.x,
				dy = e.clientY - _init.y;
			offsetX = _init.ox - dx;
			offsetY = _init.oy + dy;
			chart.setWindow(scaleX, scaleY, offsetX, offsetY).render();
			dojo.stopEvent(e);
		}
	};

	dojo.connect(chart.node, "onmousedown", onMouseDown);
	dojo.connect(chart.node, "onmousemove", onMouseMove);
	dojo.connect(chart.node, "onmouseup",   onMouseUp);


	createProgrammaticPortlet();
});

function createProgrammaticPortlet() {
	var portlet = new dojox.widget.FeedPortlet({
		id: "ProgrammaticPortlet",
		dndType: "Portlet",
		title: "Programmatic FeedPortlet with multiple feeds"
	}, dojo.create("div", {
		innerHTML: "This portlet was created programmatically, and has mulitple feeds to select from."
				+ " Click the settings icon in the title bar to choose another feed."
	}));
	var settings = new dojox.widget.PortletFeedSettings({
		id: "ProgrammaticPortletSettings",
		urls: [
			{
				url: "http://news.google.com/news?hl=en&topic=t&output=atom",
				label: "Google News"
			},
			{
				url: "http://shaneosullivan.wordpress.com/category/dojo/feed/",
				label: "Dojo Blatherings"
			},
			{
				url: "http://www.dojotoolkit.org/aggregator/rss",
				label: "Planet Dojo"
			}
		]
	});
	portlet.addChild(settings);
	dijit.byId("gridContainer2").addService(portlet, 0, 0);
}

var count = 0;
function loadFeed(url, nodeId, emptyMsg, type) {

	var query = {
		url: url
	};
	var request = {query:query};

	var maxBufSize = 8;
	var outNode = dojo.byId(nodeId);

	var testStore = new dojox.data.GoogleFeedStore();

	function doAppend(items){
		console.log(items);
		if (items.length > 0) {
      if (type == "list") {
				dojo.addClass(outNode, "feedList");

	      var ul = dojo.create("ul", null, outNode);
				dojo.forEach(items, function(item){
					var li = dojo.create("li", {
						innerHTML: '<a href="' + testStore.getValue(item, 'link') + '">'
												+ testStore.getValue(item, 'title') + '</a>'
					},ul);

					dojo.connect(li, "onmouseover", function() {
						dijit.showTooltip(testStore.getValue(item, "content"), li);
					});
					dojo.connect(li, "onmouseout", function() {
						dijit.hideTooltip(li);
					});
				});
			}
			else {
				var accordion = new dijit.layout.AccordionContainer({});
				dojo.byId(nodeId).appendChild(accordion.domNode);

				dojo.forEach(items, function(item){
					var summary = testStore.getValue(item, "title");

					if (summary.length > 40) {
						summary = summary.substring(0, 50);
					}
					var contentPane = new dijit.layout.ContentPane({
						title: summary,
						content: testStore.getValue(item, "content")
					});
					dojo.style(contentPane.domNode, "width", "100%");
					accordion.addChild(contentPane);
					contentPane.startup();
				});

				var portlet = dijit.getEnclosingWidget(dojo.byId(nodeId));
				portlet.addChild(accordion);
			}
	  } else {
			dojo.byId(nodeId).innerHTML = emptyMsg || "No results";
		}
	}

	request.onBegin = function(numItems){};

	request.onComplete = doAppend;

	request.count = 4;

	testStore.fetch(request);
}

var layoutHtmlTable = [
	 [
		{name: 'First Name', field: 'First Name', width: '50%'},
		{name: 'Last Name', field: 'Last Name', width: '25%'},
		{name: 'DOB', field: 'DOB', width: '25%'}
		]
	];

var text_explode_2 = function(node){

	if(node.style.height){
		return;
	}
	var originalText = node.innerHTML;
	var properties = {
		node: node,
		words: true,
		distance: 1.5,
		duration: 1500,
		random: 0.5
	};
	properties.onEnd = function(){
		currentAnimation = dojox.fx.text.converge(dojo.mixin(properties,{
			onEnd: undefined,
			text: originalText
		}));
		currentAnimation.play();
	};
	currentAnimation = dojox.fx.text.explode(properties).play();
};

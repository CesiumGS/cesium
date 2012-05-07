define(["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "dojo/_base/html", "dojo/query", 
	"./Chart", "../themes/GreySkies", "../plot2d/Lines", "dojo/dom-prop"], 
	function(lang, arrayUtil, declare, html, query, Chart, GreySkies, Lines, domProp){
/*=====
var Chart = dojox.charting.widget.Chart;
=====*/

	declare("dojox.charting.widget.Sparkline", Chart, {
			theme: GreySkies,
			margins: { l: 0, r: 0, t: 0, b: 0 },
			type: "Lines",
			valueFn: "Number(x)",
			store: "",
			field: "",
			query: "",
			queryOptions: "",
			start: "0",
			count: "Infinity",
			sort: "",
			data: "",
			name: "default",
			buildRendering: function(){
				var n = this.srcNodeRef;
				if(	!n.childNodes.length || // shortcut the query
					!query("> .axis, > .plot, > .action, > .series", n).length){
					var plot = document.createElement("div");
					domProp.set(plot, {
						"class": "plot",
						"name": "default",
						"type": this.type
					});
					n.appendChild(plot);

					var series = document.createElement("div");
					domProp.set(series, {
						"class": "series",
						plot: "default",
						name: this.name,
						start: this.start,
						count: this.count,
						valueFn: this.valueFn
					});
					arrayUtil.forEach(
						["store", "field", "query", "queryOptions", "sort", "data"],
						function(i){
							if(this[i].length){
								domProp.set(series, i, this[i]);
							}
						},
						this
					);
					n.appendChild(series);
				}
				this.inherited(arguments);
			}
		}
	);
});

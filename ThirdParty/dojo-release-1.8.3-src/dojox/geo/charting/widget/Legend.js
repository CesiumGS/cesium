define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/html",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-class",
	"dojo/_base/window",
	"dijit/_Widget"
], function(dojo, lang, arr, declare, html,dom,domConstruct,domClass, win, Widget){

	return declare("dojox.geo.charting.widget.Legend",Widget, {
		// summary:
		//		A legend widget displaying association between colors and Feature value ranges.
		//
		// description:
		//		This widget basically is a table comprising (icon,string) pairs, describing the color scheme
		//		used for the map and its associated text descriptions.
		//

		// example:
		// |	var legend = new dojox.geo.charting.widget.Legend({
		// |		map: map
		// |	});
		horizontal:true,
		legendBody:null,
		swatchSize:18,
		map:null,
		postCreate: function(){
			if(!this.map){return;}
			this.series = this.map.series;
			if(!this.domNode.parentNode){
				// compatibility with older version : add to map domNode if not already attached to a parentNode.
				dom.byId(this.map.container).appendChild(this.domNode);
			}
			this.refresh();
		},
		buildRendering: function(){
			this.domNode = domConstruct.create("table",
						{role: "group", "class": "dojoxLegendNode"});
			this.legendBody = domConstruct.create("tbody", null, this.domNode);
			this.inherited(arguments);
		},

		refresh: function(){
			// summary:
			//		Refreshes this legend contents when Map series has changed.

			// cleanup
			while(this.legendBody.lastChild){
				domConstruct.destroy(this.legendBody.lastChild);
			}

			if(this.horizontal){
				domClass.add(this.domNode,"dojoxLegendHorizontal");
				this._tr = win.doc.createElement("tr");
				this.legendBody.appendChild(this._tr);
			}

			var s = this.series;
			if(s.length == 0){return;}

			arr.forEach(s,function(x){
				this._addLabel(x.color, x.name);
			},this);
		},
		_addLabel:function(color,label){
			var icon = win.doc.createElement("td");
			var text = win.doc.createElement("td");
			var div = win.doc.createElement("div");
			domClass.add(icon, "dojoxLegendIcon");
			domClass.add(text, "dojoxLegendText");
			div.style.width  = this.swatchSize + "px";
			div.style.height = this.swatchSize + "px";
			icon.appendChild(div);

			if(this.horizontal){
				this._tr.appendChild(icon);
				this._tr.appendChild(text);
			}else{
				var tr = win.doc.createElement("tr");
				this.legendBody.appendChild(tr);
				tr.appendChild(icon);
				tr.appendChild(text);
			}

			div.style.background = color;
			text.innerHTML = String(label);
		}
	});
});

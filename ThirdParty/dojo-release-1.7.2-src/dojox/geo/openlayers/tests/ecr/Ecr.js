define(["dojo/_base/kernel",
				"dojo/_base/declare",
				"dojo/_base/html",
				"dojo/_base/array",
				"dojo/_base/lang",
				"dojo/dom",
				"dojox/geo/openlayers/Map",
				"dojox/geo/openlayers/GfxLayer",
				"dojo/data/ItemFileReadStore",
				"dojox/geo/openlayers/tests/ecr/PortRenderer",
				"dojox/geo/openlayers/tests/ecr/LegsRenderer"], function(dojo, declare, html, arr, lang, dom, Map, GfxLayer,
																																	ItemFileReadStore, PortRenderer, LegsRenderer){

	return declare("dojox.geo.openlayers.tests.ecr.Ecr", null, {
		constructor : function(){

			var map = new Map("map");

			map.fitTo([-160, 70, 160, -70]);

			this._map = map;

			layer = new GfxLayer("legs");
			this._legLayer = layer;
			map.addLayer(layer);

			layer = new GfxLayer("ports");
			this._portLayer = layer;
			map.addLayer(layer);

			this.loadData("data/ecr.json");
		},

		fitTo : function(where){
			this._map.fitTo(where);
		},

		clearLayer : function(layer){
			var fa = layer.getFeatures();
			layer.removeFeature(fa);
		},

		clearEcr : function(event){
			var layer = this._portLayer;
			this.clearLayer(layer);
			layer = this._legLayer;
			this.clearLayer(layer);
			this.fillPortChooser(null);
		},

		setDataSet : function(name){
			var o = dom.byId(name);
			var ds = o.value;

			var layer = this._portLayer;
			this.clearLayer(layer);

			layer = this._legLayer;
			this.clearLayer(layer);

			this.loadData(ds);

		},

		log : function(o){
			console.log(o);
		},

		loadError : function(){
			this.log(arguments[0]);
		},

		_portStyle : [{
			type : "circle",
			depth : "{radius}",
			radius : function(ctx){
				var realValue = ctx.store.getValue(this, "offer");
				var ret = Math.max(1, Math.log(realValue));
				return 3 * ret;
			},
			stroke : {
				color : "#4c9a06",
				width : 1
			}
		}, {
			type : "circle",
			depth : "{radius}",
			radius : function(ctx){
				var realValue = ctx.store.getValue(this, "demand");
				return 3 * Math.max(1, Math.log(realValue));
			},
			stroke : {
				color : "#bb0000",
				width : 1
			}
		}],

		gotPorts : function(items, request){
			this.log("got ports " + items.length);
			var store = request.store;
			var ctx = {
				store : store
			};
			var renderer = new PortRenderer(this._portStyle, ctx);
			var layer = this._portLayer;

			arr.forEach(items, function(item, index, array){
				var f = renderer.render(item);
				if (f != null)
					layer.addFeature(f);
			});

			this.fillPortChooser(items);

			this.portChange('portChooser');

			layer.redraw();
		},

		_legsStyle : {
			type : "polyline",
			stroke : {
				color : [255, 165, 0]
			}
		},

		gotLegs : function(items, request){
			//      this.log("got legs " + items.length);
			var ctx = {
				store : request.store
			};
			var renderer = new LegsRenderer(this._legsStyle, ctx);
			renderer.setGeodetic(true);
			var layer = this._legLayer;
			arr.forEach(items, function(item, index, array){
				var f = renderer.render(item);
				if (f != null)
					layer.addFeature(f);
			});
			layer.redraw();
		},

		loadData : function(dataSet){
			//      this.log("load " + dataSet);
			var store = new ItemFileReadStore({
				url : dataSet,
				urlPreventCache : true
			});

			store.fetch({
				query : {
					type : "legs"
				},
				onComplete : lang.hitch(this, this.gotLegs),
				onError : lang.hitch(this, this.loadError),
				queryOptions : {
					deep : true
				}
			});

			store.fetch({
				query : {
					type : "port"
				},
				onComplete : lang.hitch(this, this.gotPorts),
				onError : lang.hitch(this, this.loadError)
			});

		},

		regionChange : function(event){
			this.fitTo(event.currentTarget.value);
		},

		portChange : function(name){
			var o = dom.byId(name);
			this.fitTo(o.value);
		},

		fillPortChooser : function(items){
			var ps = dom.byId("portChooser");
			var opts = ps.options;
			var ws = '{"position" : [0, 0], "extent" : 70}';
			if (items == null) {
				opts.length = 1;
				opts[0] = new Option("World", ws);
			} else {
				opts.length = items.length + 1;
				opts[0] = new Option("World", ws);
				var s = '{"position" : [%lo, %la], "extent" : 0.2}';
				for ( var i = 0; i < items.length; i++) {
					var item = items[i];
					var lon = parseFloat(item.longitude);
					var lat = parseFloat(item.latitude);
					var os = s.replace("%lo", lon).replace("%la", lat);
					opts[i + 1] = new Option(item.name, os);
				}
			}
		},

		toggleLayerVisibility : function(name){
			var cb = dom.byId(name);
			var a = this._map.getLayer('name', name);
			arr.forEach(a, function(item, index, array){
				item.olLayer.setVisibility(cb.checked);
			});
		}
	});
});

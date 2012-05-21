define(["dojo/_base/kernel",
				"dojo/_base/declare",
				"dojo/_base/html",
				"dojo/_base/lang",
				"dojo/date",
				"dojox/geo/openlayers/tests/sun/Sun",
				"dojox/geo/openlayers/widget/Map",
				"dojox/timing/_base",
				"dojox/geo/openlayers/GfxLayer",
				"dojox/geo/openlayers/GeometryFeature",
				"dojox/geo/openlayers/LineString",
				"dojox/geo/openlayers/Point",
				"dojox/geo/openlayers/JsonImport",
				"dojox/geo/openlayers/tests/sun/Cities",
				"dijit/Tooltip"], function(dojo, declare, html, lang, date, Sun, Map, timinig, GfxLayer, GeometryFeature, LineString,
																		Point, JsonImport, Cities){

	return declare("dojox.geo.openlayers.tests.sun.SunDemo", null, {
		now : true,
		map : null,
		cities : null,
		layer : null,
		sun : null,

		constructor : function(div){

			var options = {
				name : "TheMap",
				touchHandler : true
			};

			var map = new Map(options);
			html.place(map.domNode, div);
			map.startup();
			this.map = map;

			map.map.fitTo([-160, 70, 160, -70]);

			var cities = new Cities(this);
			dojo.connect(this, "updateFeatures", cities, "updateCities");
			this.cities = cities;

			this.sun = new Sun();
			var layer = new GfxLayer("sun");
			this.layer = layer;
			map.map.addLayer(layer);

			this.updateFeatures();

		},

		showGradients : function(grd){
			return this.cities.useGradients(grd);
		},

		showCircles : function(c){
			return this.cities.useCircles(c);
		},

		showTooltips : function(tt){
			var map = this.map.map;
			var ls = map.getLayer("name", "sun")[0];
			var lc = map.getLayer("name", "cities")[0];
			var is = map.layerIndex(ls);
			var ic = map.layerIndex(lc);
			var m = Math.min(is, ic);
			var M = Math.max(is, ic);
			if (tt) {
				map.layerIndex(ls, m);
				map.layerIndex(lc, M);
			} else {
				map.layerIndex(ls, M);
				map.layerIndex(lc, m);
			}
		},

		updateFeatures : function(){
			var l = this.layer;
			l.removeFeature(l.getFeatures());
			var f = this.twilightZone({
				x1 : -180,
				y1 : 85,
				x2 : 180,
				y2 : -85
			});
			l.addFeature(f);

			f = this.createStar();
			l.addFeature(f);

			f = this.createSun();
			l.addFeature(f);

			l.redraw();
		},

		getHour : function(d){
			if (!d)
				d = this.sun.getDate();
			return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
		},

		getDay : function(d){
			if (!d)
				d = this.sun.getDate();
			var start = new Date(d.getFullYear(), 0, 1);
			var oneDay = 1000 * 60 * 60 * 24;
			var day = Math.floor((d.getTime() - start.getTime()) / oneDay);
			return day;
		},

		setDay : function(day){
			var now = this.sun.getDate();
			var year = now.getFullYear();
			var hours = now.getHours();
			var minutes = now.getMinutes();
			var seconds = now.getSeconds();
			var milliSeconds = now.getMilliseconds();
			var start = new Date(year, 0, 1, hours, minutes, seconds, milliSeconds);
			start = date.add(start, "day", day);
			this.setDate(start);
		},

		setTime : function(t){
			var d = this.sun.getDate();

			var year = d.getFullYear();
			var month = d.getMonth();
			var day = d.getDate();
			var hours = Math.floor(t);
			t = 60 * (t - hours);
			var minutes = Math.floor(t);
			t = 60 * (t - minutes);
			var seconds = Math.floor(t);
			d = new Date(year, month, day, hours, minutes, seconds, 0);

			this.setDate(d);
		},

		setDate : function(d){
			this.now = !d;
			this.sun.setDate(d);
			this.updateFeatures();
		},

		advance : function(ms){
			var d = this.sun.getDate();
			d = date.add(d, "millisecond", ms);
			this.setDate(d);
		},

		getTZone : function(){
			return this.tZone;
		},

		twilightZone : function(clip){
			var tz = this.sun.twilightZone(clip);
			var g = new LineString(tz);
			var gf = new GeometryFeature(g);
			gf.setStroke([248, 236, 56]);
			gf.setFill([252, 251, 45, 0.3]);
			this.tZone = gf;
			return gf;
		},

		makeStarShape : function(r1, r2, b){
			var TPI = Math.PI * 2;
			var di = TPI / b;
			var s = null;
			var start = Math.PI;
			var end = start + TPI;
			for ( var i = start; i < end; i += di) {
				var c1 = Math.cos(i);
				var s1 = Math.sin(i);
				var i2 = i + di / 2;
				var c2 = Math.cos(i2);
				var s2 = Math.sin(i2);
				if (s == null) {
					s = "M" + (s1 * r1).toFixed(2) + "," + (c1 * r1).toFixed(2) + " ";
				} else {
					s += "L" + (s1 * r1).toFixed(2) + "," + (c1 * r1).toFixed(2) + " ";
				}
				s += "L" + (s2 * r2).toFixed(2) + "," + (c2 * r2).toFixed(2) + " ";
			}
			s += "z";
			return s;
		},

		createStar : function(){
			var s = this.sun.sun();
			var geom = new Point(s);
			var gf = new GeometryFeature(geom);

			gf.createShape = lang.hitch(this, function(/* Surface */s){
				var r1 = 30;
				var r2 = 10;
				var branches = 7;
				var star = this.makeStarShape(r1, r2, branches);
				var path = s.createPath();
				path.setShape({
					path : star
				});
				path.setStroke([0, 100, 0]);
				path.setFill([0, 100, 0]);
				//				g.add(path);
				//				return g;
				return path;
			});
			return gf;
		},

		makeCrossShape : function(r1, r2, b){
			var TPI = Math.PI * 2;
			var di = TPI / b;
			var s = "";
			for ( var i = 0; i < TPI; i += di) {
				var c1 = Math.cos(i);
				var s1 = Math.sin(i);
				var i2 = i + Math.PI;
				var c2 = Math.cos(i2);
				var s2 = Math.sin(i2);
				s += "M" + (s1 * r1).toFixed(2) + "," + (c1 * r1).toFixed(2) + " ";
				s += "L" + (s2 * r1).toFixed(2) + "," + (c2 * r1).toFixed(2) + " ";
			}

			return s;
		},

		createSun : function(){
			var s = this.sun.sun();
			var g = new Point({
				x : s.x,
				y : s.y
			});
			var gf = new GeometryFeature(g);
			var sunRadius = 20;
			gf.setShapeProperties({
				r : sunRadius
			});
			gf.setStroke("");
			gf.setFill({
				type : "radial",
				r : sunRadius,
				colors : [{
					offset : 0,
					color : [248, 236, 100]
				}, {
					offset : 1,
					color : [255, 127, 0]
				}]
			});
			/*
						gf.setFill({
							type : "radial",
							r : 15,
							colors : [{
								offset : 0,
								color : [248, 236, 100]
							}, {
								offset : 1,
								color : [255, 255, 255, 0.4]
							}]
						});
			*/
			return gf;
		},

		_timer : null,

		startTimer : function(checked, time){
			var t = this._timer;
			if (!this._timer) {
				if (!time)
					time = 1000;

				t = this._timer = new dojox.timing.Timer(time);
				t.onTick = lang.hitch(this, function(){
					if (this.now)
						this.setDate();
					else
						this.advance(time);
				});
				t.onStart = function(){

				};
				t.onStop = function(){

				};
			}
			if (checked)
				t.start();
			else
				t.stop();
		}

	});

});

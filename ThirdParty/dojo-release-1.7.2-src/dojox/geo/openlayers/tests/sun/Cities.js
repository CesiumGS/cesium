define(["dojo/_base/kernel",
				"dojo/_base/declare",
				"dojo/_base/lang",
				"dojo/_base/array",
				"dojo/_base/xhr",
				"dojox/geo/openlayers/GfxLayer",
				"dojox/geo/openlayers/Point",
				"dojox/geo/openlayers/GeometryFeature",
				"dojox/gfx",
				"dojox/gfx/move",
				"dojox/gfx/fx",
				"dojo/fx"], function(dojo, declare, lang, arr, xhr, GfxLayer, Point, GeometryFeature){

	dojox.gfx.Text.prototype.getBoundingBox = function(){
		if (dojo.isIE)
			return this.getShape();
		return this.rawNode.getBBox();
	};

	return declare("dojox.geo.openlayers.tests.sun.Cities", null, {

		constructor : function(sunDemo){
			this.sunDemo = sunDemo;
			this.pop = dojo.isIE ? 10000000 : 1000000;
			this.minPop = Math.pow(2, 30);
			this.maxPop = 0;
			this.readCSV("c.csv", lang.hitch(this, this.loaded));
			this._circles = false;
			this._gradients = false;
			var layer = new GfxLayer("cities");
			var map = this.sunDemo.map;
			map.map.addLayer(layer);
			this.layer = layer;
		},

		useGradients : function(u){
			if(u== undefined)
				return this._gradients; 
			this._gradients = u;
			this.updateCities();
			return u;
		},

		useCircles : function(u){
			if(u == undefined)
				return this._circles;
			this._circles = u;
			this.updateCities(true);
			return u;
		},

		loaded : function(res){
			var layer = this.layer;
			arr.forEach(res, function(o){
				var p = {
					x : parseFloat(o.longitude),
					y : parseFloat(o.latitude)
				};
				var pg = new Point(p);
				var f = new GeometryFeature(pg);
				// f.createShape = this.createShape;
				this.setCreateShape(f, o);
				var r = o.population;
				var dp = this.maxPop - this.minPop;
				if (dp != 0)
					r = (r - this.minPop + 100) * 20 / dp;
				else
					r = 20;
				if (this._circles)
					f.setShapeProperties({
						r : r
					});
				else
					f.setShapeProperties({
						x : -r / 2,
						y : -r / 2,
						width : r,
						height : r,
						r : 0
					});
				layer.addFeature(f);
				f.getShape();
				this.connectTooltip(pg, o.asciiname, r);
			}, this);
			layer.redraw();
			this.updateCities();
		},

		updateCities : function(redoGeometry){
			if (!this.layer)
				return; // ?? throw new Error();
			var features = this.layer.getFeatures();
			var gf = this.sunDemo.getTZone();
			var tz = gf._geometry.coordinates;

			var pointIn = function(p){
				var sides = tz.length;
				var j = sides - 1;
				var oddNodes = false;
				var x = p.x;
				var y = p.y;
				for ( var i = 0; i < sides; i++) {
					var o = tz[i];
					var xi = o.x;
					var yi = o.y;

					o = tz[j];
					var xj = o.x;
					var yj = o.y;

					if (yi < y && yj >= y || yj < y && yi >= y) {
						if (xi + (y - yi) / (yj - yi) * (xj - xi) < x) {
							oddNodes = !oddNodes;
						}
					}
					j = i;
					o = tz[j];
					xj = o.x;
					yj = o.y;
				}

				return oddNodes;
			};

			arr.forEach(features, function(f){
				var g = f._geometry.coordinates;

				var p = f.getShapeProperties();
				var r = p.r | p.width;
				if (redoGeometry) {
					f.remove();
					if (this._circles)
						f.setShapeProperties({
							r : r
						});
					else
						f.setShapeProperties({
							x : -r / 2,
							y : -r / 2,
							width : r,
							height : r,
							r : 0
						});
				}
				if (pointIn(g)) {
					f.setStroke("black");
					if (this._gradients)
						f.setFill({
							type : "radial",
							r : r,
							colors : [{
								offset : 0,
								color : [255, 255, 255]
							}, {
								offset : 1,
								color : [0, 0, 0]
							}]
						});
					else
						f.setFill([0, 0, 0, 0]);
				} else {
					f.setStroke([0, 128, 128]);
					if (this._gradients)
						f.setFill({
							type : "radial",
							r : r,
							colors : [{
								offset : 0,
								color : [255, 255, 255]
							}, {
								offset : 1,
								color : [255, 255, 0]
							}]
						});
					else
						f.setFill("yellow");
				}
			}, this);

			this.layer.redraw();
		},

		readCSV : function(url, cb){
			xhr.get({
				url : url,
				handleAs : "text",
				nocache : true,
				noCache : true,
				load : lang.hitch(this, function(data){

					var what = ['asciiname', 'longitude', 'latitude', 'population'];

					var res = this.parseCSV(data, what, lang.hitch(this, function(head, line){

						var index = arr.indexOf(head, 'population');
						var pop = line[index];
						pop = parseInt(pop);
						var ok = pop > this.pop;
						if (ok) {
							if (pop < this.minPop)
								this.minPop = pop;
							if (pop > this.maxPop)
								this.maxPop = pop;
						}
						return ok;
					}));
					cb(res);
				}),

				error : function(e){
					console.log(e.toString());
				},

				headers : {
					content : "text/html; charset=UTF-8"
				}
			});
		},

		parseCSV : function(s, what, condition){
			var res = [];
			var nl = "\n";
			var sep = "\t";
			var start = 0;

			var eol = s.indexOf(nl, start);
			var line = s.substring(start, eol);

			var head = line.split(sep);
			var re = /^\"(.*)\"$/;
			arr.forEach(head, function(h, index){
				var r = re.exec(h);
				if (r && r.length > 1) {
					head[index] = r[1];
				}
			});
			start = eol + 1;

			var count = 0;
			while ((eol = s.indexOf(nl, start)) != -1) {
				line = s.substring(start, eol);
				var split = line.split(sep);
				if (condition == undefined || condition(head, split)) {
					var o = {};
					arr.forEach(what, function(w, i){
						index = arr.indexOf(head, w);
						var splt = split[index];
						var r = re.exec(splt);
						if (r && r.length > 1)
							splt = r[1];
						o[w] = splt;
					});
					res.push(o);
					count++;
				}
				start = eol + 1;
			}
			return res;
		},

		setCreateShape : function(feature, object){

			var createShape = lang.hitch(this, function(/* Surface */surface){
				var shape;
				if (this._circles)
					shape = surface.createCircle();
				else
					shape = surface.createRect();

				return shape;
			});

			feature.createShape = createShape;
		},

		connectTooltip : function(g, content, size){
			var map = this.sunDemo.map.map;

			var localXY = function(p){
				var x = p.x;
				var y = p.y;
				var layer = map.olMap.baseLayer;
				var resolution = map.olMap.getResolution();
				var extent = layer.getExtent();
				var rx = (x / resolution + (-extent.left / resolution));
				var ry = ((extent.top / resolution) - y / resolution);
				return [rx, ry];
			};

			g.shape.connect("onmouseover", function(){
				var p = lang.mixin({}, g.coordinates);
				p = map.transform(p);
				var a = localXY(p);
				var r = {
					x : a[0],
					y : a[1],
					w : size,
					h : size
				};
				var s = g.shape;
				lang.mixin(s, r);
				dijit.showTooltip(content, s, ["after"]);
			});

			g.shape.connect("onmouseout", function(){
				dijit.hideTooltip(g.shape);
			});
		}
	});
});

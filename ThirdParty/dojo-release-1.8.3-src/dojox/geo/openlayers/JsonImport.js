define([
	"dojo/_base/declare",
	"dojo/_base/xhr",
	"dojo/_base/lang",
	"dojo/_base/array",
	"./LineString",
	"./Collection",
	"./GeometryFeature"
], function(declare, xhr, lang, array, LineString, Collection, GeometryFeature){

	/*=====
	dojox.geo.openlayers.__JsonImportArgs = {
		// summary:
		//		The keyword arguments that can be passed in a JsonImport constructor.
		// url: String
		//		The url pointing to the JSON file to load.
		// nextFeature: function
		//		The function called each time a feature is read. The function is called with a GeometryFeature as argument.
		// error: function
		//		Error callback called if something fails.
	};
	=====*/

	return declare("dojox.geo.openlayers.JsonImport", null, {
		// summary:
		//		Class to load JSON formated ShapeFile as output of the JSon Custom Map Converter.
		// description:
		//		This class loads JSON formated ShapeFile produced by the JSon Custom Map Converter.
		//		When loading the JSON file, it calls a iterator function each time a feature is read.
		//		This iterator function is provided as parameter to the constructor.
		//
		constructor : function(params){
			// summary:
			//		Construct a new JSON importer.
			// params: dojox.geo.openlayers.__JsonImportArgs
			//		The parameters to initialize this JsonImport instance.
			this._params = params;
		},

		loadData: function(){
			// summary:
			//		Triggers the loading.
			var p = this._params;
			xhr.get({
				url: p.url,
				handleAs: "json",
				sync: true,
				load: lang.hitch(this, this._gotData),
				error: lang.hitch(this, this._loadError)
			});
		},

		_gotData: function(/* Object */items){
			// summary:
			//		Called when loading is complete.
			// tags:
			//		private
			var nf = this._params.nextFeature;
			if(!lang.isFunction(nf)){
				return;
			}

			var extent = items.layerExtent;
			var ulx = extent[0];
			var uly = extent[1];
			var lrx = ulx + extent[2];
			var lry = uly + extent[3];

			var extentLL = items.layerExtentLL;
			var x1 = extentLL[0];
			var y1 = extentLL[1];
			var x2 = x1 + extentLL[2];
			var y2 = y1 + extentLL[3];

			var ulxLL = x1;
			var ulyLL = y2;
			var lrxLL = x2;
			var lryLL = y1;

			var features = items.features;

			for( var f in features){
				var o = features[f];
				var s = o["shape"];
				var gf = null;
				if(lang.isArray(s[0])){

					var a = new Array();
					array.forEach(s, function(item){
						var ls = this._makeGeometry(item, ulx, uly, lrx, lry, ulxLL, ulyLL, lrxLL, lryLL);
						a.push(ls);
					}, this);
					var g = new Collection(a);
					gf = new GeometryFeature(g);
					nf.call(this, gf);

				}else{
					gf = this._makeFeature(s, ulx, uly, lrx, lry, ulxLL, ulyLL, lrxLL, lryLL);
					nf.call(this, gf);
				}
			}
			var complete = this._params.complete;
			if(lang.isFunction(complete)){
				complete.call(this, complete);
			}
		},

		_makeGeometry: function(/* Array */s, /* Float */ulx, /* Float */uly, /* Float */lrx, /* Float */
		lry, /* Float */ulxLL, /* Float */ulyLL, /* Float */lrxLL, /* Float */lryLL){
			// summary:
			//		Make a geometry with the specified points.
			// tags:
			//		private
			var a = [];
			var k = 0.0;
			for( var i = 0; i < s.length - 1; i += 2){
				var x = s[i];
				var y = s[i + 1];

				k = (x - ulx) / (lrx - ulx);
				var px = k * (lrxLL - ulxLL) + ulxLL;

				k = (y - uly) / (lry - uly);
				var py = k * (lryLL - ulyLL) + ulyLL;

				a.push({
					x: px,
					y: py
				});

			}
			var ls = new LineString(a);
			return ls; // LineString
		},

		_makeFeature: function(/* Array */s, /* Float */ulx, /* Float */uly, /* Float */lrx, /* Float */
		lry, /* Float */ulxLL, /* Float */ulyLL, /* Float */lrxLL, /* Float */lryLL){
			// summary:
			//		Make a GeometryFeature with the specified points.
			// tags:
			//		private
			var ls = this._makeGeometry(s, ulx, uly, lrx, lry, ulxLL, ulyLL, lrxLL, lryLL);
			var gf = new GeometryFeature(ls);
			return gf;
		},

		_loadError: function(){
			// summary:
			//		Called when an error occurs. Calls the error function is provided in the parameters.
			// tags:
			//		private
			var f = this._params.error;
			if(lang.isFunction(f)){
				f.apply(this, parameters);
			}
		}
	});
});

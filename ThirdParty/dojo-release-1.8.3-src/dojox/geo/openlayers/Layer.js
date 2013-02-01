define([
	"dojo/_base/declare", 
	"dojo/_base/lang", 
	"dojo/_base/array", 
	"dojo/_base/sniff",
	"./Feature"
], function(declare, lang, array, sniff, Feature){

		return declare("dojox.geo.openlayers.Layer", null, {
			// summary:
			//		Base layer class for dojox.geo.openlayers.Map specific layers extending OpenLayers.Layer class.
			//		This layer class accepts Features which encapsulates graphic objects to be added to the map.
			//		This layer class encapsulates an OpenLayers.Layer.
			//		This class provides Feature management such as add, remove and feature access.
			constructor: function(name, options){
				// summary:
				//		Constructs a new Layer.
				// name: String
				//		The name of the layer.
				// options: Object
				//		Options passed to the underlying OpenLayers.Layer object.

				var ol = options ? options.olLayer : null;

				if(!ol){
					ol = lang.delegate(new OpenLayers.Layer(name, options));
				}

				this.olLayer = ol;
				this._features = null;
				this.olLayer.events.register("moveend", this, lang.hitch(this, this.moveTo));
			},

			renderFeature: function(/* Feature */f){
				// summary:
				//		Called when rendering a feature is necessary.
				// f: Feature
				//		The feature to draw.
				f.render();
			},

			getDojoMap: function(){
				return this.dojoMap;
			},

			addFeature: function(f){
				// summary:
				//		Add a feature or an array of features to the layer.
				// f: Feature|Feature[]
				//		The Feature or array of features to add.
				if(lang.isArray(f)){
					array.forEach(f, function(item){
						this.addFeature(item);
					}, this);
					return;
				}
				if(this._features == null){
					this._features = [];
				}
				this._features.push(f);
				f._setLayer(this);
			},

			removeFeature: function(f){
				// summary:
				//		Removes a feature or an array of features from the layer.
				// f: Feature|Feature[]
				//		The Feature or array of features to remove.
				var ft = this._features;
				if(ft == null){
					return;
				}
				if(f instanceof Array){
					f = f.slice(0);
					array.forEach(f, function(item){
						this.removeFeature(item);
					}, this);
					return;
				}
				var i = array.indexOf(ft, f);
				if(i != -1){
					ft.splice(i, 1);
				}
				f._setLayer(null);
				f.remove();
			},

			removeFeatureAt: function(index){
				// summary:
				//		Remove the feature at the specified index.
				// index: int
				//		The index of the feature to remove.
				var ft = this._features;
				var f = ft[index];
				if(!f){
					return;
				}
				ft.splice(index, 1);
				f._setLayer(null);
				f.remove();
			},

			getFeatures: function(){
				// summary:
				//		Returns the feature hold by this layer.
				// returns:
				//		The untouched array of features hold by this layer.
				return this._features; // Feature[]
			},

			getFeatureAt: function(i){
				// summary:
				//		Returns the i-th feature of this layer.
				// i: Number
				//		The index of the feature to return.
				// returns:
				//		The i-th feature of this layer.
				if(this._features == null){
					return undefined;
				}
				return this._features[i]; // Feature
			},

			getFeatureCount: function(){
				// summary:
				//		Returns the number of the features contained by this layer.
				// returns:
				//		The number of the features contained by this layer.
				if(this._features == null){
					return 0;
				}
				return this._features.length; // Number
			},

			clear: function(){
				// summary:
				//		Removes all the features from this layer.
				var fa = this.getFeatures();
				this.removeFeature(fa);
			},

			moveTo: function(event){
				// summary:
				//		Called when the layer is panned or zoomed.
				// event: MouseEvent
				//		The event
				if(event.zoomChanged){
					if(this._features == null){
						return;
					}
					array.forEach(this._features, function(f){
						this.renderFeature(f);
					}, this);
				}
			},

			redraw: function(){
				// summary:
				//		Redraws this layer
				if(sniff.isIE){
					setTimeout(lang.hitch(this, function(){
						this.olLayer.redraw();
					}, 0));
				}else{
					this.olLayer.redraw();
				}
			},

			added: function(){
				// summary:
				//		Called when the layer is added to the map
			}

		});
	});

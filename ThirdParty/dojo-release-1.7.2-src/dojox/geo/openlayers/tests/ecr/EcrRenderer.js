define(	[	"dojo/_base/kernel",
					"dojo/_base/declare",
					"dojo/_base/array",
					"dojo/_base/lang"], function(dojo, declare, arr, lang){

					return declare("dojox.geo.openlayers.tests.ecr.EcrRenderer", null, {

						constructor : function(opts, context){
							this._options = opts;
							this._context = context;
						},

						render : function(item){
							var o = this._options;
							return this._render(o, item);
						},

						_render : function(o, item){
							if (o instanceof Array) {
								var features = [];
								o.sort(function(i1, i2){
									var d1 = i1.depth;
									var d2 = i2.depth;
									if (d1 != undefined && d2 != undefined) {
										var id1 = parseInt(d1);
										var id2 = parseInt(d2);
										if (id1 == id2)
											return 0;
										if (id1 < id2)
											return -1;
										return 1;
									}
									return 0;
								});
								arr.forEach(o, function(oi, index, array){

									var co = lang.clone(oi);
									this._callFunctions(co, item);
									this._solveReferences(co, item);

									var f = this._render(co, item);

									if (f != null) {
										f.setStroke(co.stroke);
										f.setFill(co.fill);
										features.push(f);
									}
								}, this);
								return features;
							}

							var co = lang.clone(o);
							this._callFunctions(co, item);
							this._solveReferences(co, item);
							var gf = this._renderItem(co, item);
							if (gf != null) {
								gf.setStroke(co.stroke);
								gf.setFill(co.fill);
							}
							return gf;
						},

						_renderItem : function(o, item){
							// subclasses should render
							return null;
						},

						_callFunctions : function(o, item){
							for ( var prop in o) {
								if (o.hasOwnProperty(prop)) {
									var v = o[prop];
									if (typeof v == 'function') {
										o[prop] = v.call(item, this._context);
									} else if (typeof v == 'object') {
										this._callFunctions(v, item);
									}
								}
							}
						},

						getContext : function(){
							return this._context;
						},

						getContextValue : function(name){
							if (this._context)
								return this._context[name];
							return undefined;
						},

						getValue : function(item, property){
							var s = this.getContextValue('store');
							if ((s != undefined) && s.isItem(item)) {
								return s.getValue(item, property);
							}
							if (item.hasOwnProperty(property)) {
								return item[property];
							}
							return undefined;
						},

						_coords : [0, 0],

						getCoordinates : function(item){
							var lon = this.getValue(item, "longitude");
							var lat = this.getValue(item, "latitude");
							var flon = parseFloat(lon);
							var flat = parseFloat(lat);
							var a = this._coords;
							a[0] = flon;
							a[1] = flat;
							return a;
						},

						_findAttributeValue : function(o, a, item){
							var v = undefined;
							if (item != null)
								v = this.getValue(item, a);
							if (v != undefined)
								return v;
							v = o[a];
							if (v != undefined)
								return v;

							for ( var i in o) {
								var ov = o[i];
								if (typeof (ov) == 'object') {
									var vv = this._findAttributeValue(ov, a, null);
									if (vv != undefined)
										return vv;
								}
							}
							return undefined;
						},

						_solveReferences : function(o, item){
							this.__solveReferences(o, o, item);
						},

						__solveReferences : function(oo, o, item){
							for ( var a in o) {
								var v = o[a];
								if (typeof (v) == 'object') {
									this.__solveReferences(oo, v, item);
								}
								if (typeof (v) == 'string') {
									var re = /{(.*)}/;
									if (v.match(re)) {
										v = v.replace(re, "$1");
										var r = this._findAttributeValue(oo, v, item);
										if (r != undefined) {
											var ps = parseFloat(r);
											if (isNaN(ps))
												o[a] = r;
											else
												o[a] = ps;
										}
									}
								}
							}
						}
					});
				});

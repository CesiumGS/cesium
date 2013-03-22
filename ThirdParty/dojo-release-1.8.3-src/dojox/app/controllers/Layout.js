define(["dojo/_base/lang", "dojo/_base/declare", "dojo/sniff", "dojo/on", "dojo/_base/window", "dojo/_base/array", "dojo/_base/config",
	"dojo/topic", "dojo/query", "dojo/dom-style", "dojo/dom-attr", "dojo/dom-geometry", "dijit/registry", "../Controller", "../layout/utils"],
function(lang, declare, has, on, win, array, config, topic, query, domStyle, domAttr, domGeom, registry, Controller, layoutUtils){
	// module:
	//		dojox/app/controllers/Layout
	// summary:
	//		Bind "layout" and "select" events on dojox/app application's dojo/Evented instance.

	return declare("dojox.app.controllers.Layout", Controller, {

		constructor: function(app, events){
			// summary:
			//		bind "layout" and "select" events on application's domNode.
			//
			// app:
			//		dojox/app application instance.
			// events:
			//		{event : handler}
			this.events = {
				"layout": this.layout,
				"select": this.select
			};
			this.inherited(arguments);

			// if we are using dojo mobile & we are hiding adress bar we need to be bit smarter and listen to
			// dojo mobile events instead
			if(config.mblHideAddressBar){
				topic.subscribe("/dojox/mobile/afterResizeAll", lang.hitch(this, this.onResize));
			}else{
				// bind to browsers orientationchange event for ios otherwise bind to browsers resize
				this.bind(win.global, has("ios") ? "orientationchange" : "resize", lang.hitch(this, this.onResize));
			}
		},

		onResize: function(){
			this._doResize(this.app);
		},

		layout: function(event){
			// summary:
			//		Response to dojox/app "layout" event.
			//
			// example:
			//		Use trigger() to trigger "layout" event, and this function will response the event. For example:
			//		|	this.trigger("layout", {"view":view, "changeSize":changeSize, "resultSize":resultSize});
			//
			// event: Object
			// |	{"view":view, "changeSize":changeSize, "resultSize":resultSize}

			var view = event.view;
			var changeSize = event.changeSize || null;
			var resultSize = event.resultSize || null;
			this._doResize(view, changeSize, resultSize);
		},

		_doLayout: function(view){
			// summary:
			//		do view layout.
			//
			// view: Object
			//		view instance needs to do layout.

			if(!view){
				console.warn("layout empty view.");
				return;
			}

			var fullScreenScene, children;

			if(view.selectedChild && view.selectedChild.isFullScreen){
				console.warn("fullscreen sceen layout");
				/*
				 fullScreenScene=true;
				 children=[{domNode: this.selectedChild.domNode,region: "center"}];
				 query("> [region]",this.domNode).forEach(function(c){
				 if(this.selectedChild.domNode!==c.domNode){
				 dstyle(c.domNode,"display","none");
				 }
				 })
				 */
			}else{
				// TODO: remove non HTML5 "region" in future versions
				children = query("> [data-app-region], > [region]", view.domNode).map(function(node){
					var w = registry.getEnclosingWidget(node);
					if(w){
						w.region = domAttr.get(node, "data-app-region") || domAttr.get(node, "region");
						return w;
					}

					return {
						domNode: node,
						region: domAttr.get(node, "data-app-region") || domAttr.get(node, "region")
					};
				});
				if(view.selectedChild){
					children = array.filter(children, function(c){
						if((c.region == "center") && view.selectedChild && (view.selectedChild.domNode !== c.domNode)){
							domStyle.set(c.domNode, "zIndex", 25);
							domStyle.set(c.domNode, "display", "none");
							return false;
						}else if(c.region != "center"){
							domStyle.set(c.domNode, "display", "");
							domStyle.set(c.domNode, "zIndex", 100);
						}
						return c.domNode && c.region;
					}, view);
				}
			}
			// We don't need to layout children if this._contentBox is null for the operation will do nothing.
			if(view._contentBox){
				layoutUtils.layoutChildren(view.domNode, view._contentBox, children);
			}
		},

		_doResize: function(view, changeSize, resultSize){
			// summary:
			//		resize view.
			//
			// view: Object
			//		view instance needs to do layout.
			var node = view.domNode;
			// set margin box size, unless it wasn't specified, in which case use current size
			if(changeSize){
				domGeom.setMarginBox(node, changeSize);
				// set offset of the node
				if(changeSize.t){ node.style.top = changeSize.t + "px"; }
				if(changeSize.l){ node.style.left = changeSize.l + "px"; }
			}

			// If either height or width wasn't specified by the user, then query node for it.
			// But note that setting the margin box and then immediately querying dimensions may return
			// inaccurate results, so try not to depend on it.
			var mb = resultSize || {};
			lang.mixin(mb, changeSize || {});	// changeSize overrides resultSize
			if( !("h" in mb) || !("w" in mb) ){
				mb = lang.mixin(domGeom.getMarginBox(node), mb);	// just use dojo/_base/html.marginBox() to fill in missing values
			}

			// Compute and save the size of my border box and content box
			// (w/out calling dojo/_base/html.contentBox() since that may fail if size was recently set)
			if(view !== this.app){
				var cs = domStyle.getComputedStyle(node);
				var me = domGeom.getMarginExtents(node, cs);
				var be = domGeom.getBorderExtents(node, cs);
				var bb = (view._borderBox = {
					w: mb.w - (me.w + be.w),
					h: mb.h - (me.h + be.h)
				});
				var pe = domGeom.getPadExtents(node, cs);
				view._contentBox = {
					l: domStyle.toPixelValue(node, cs.paddingLeft),
					t: domStyle.toPixelValue(node, cs.paddingTop),
					w: bb.w - pe.w,
					h: bb.h - pe.h
				};
			}else{
				// if we are layouting the top level app the above code does not work when hiding address bar
				// so let's use similar code to dojo mobile.
				view._contentBox = {
					l: 0,
					t: 0,
					h: win.global.innerHeight || win.doc.documentElement.clientHeight,
					w: win.global.innerWidth || win.doc.documentElement.clientWidth
				};
			}

			this._doLayout(view);

			// do selectedChild layout
			if(view.selectedChild){
				this._doResize(view.selectedChild);
			}
		},

		select: function(event){
			// summary:
			//		Response to dojox/app "select" event.
			//
			// example:
			//		Use dojo/on.emit to trigger "select" event, and this function will response the event. For example:
			//		|	on.emit(this.app.evented, "select", view);
			//
			// event: Object
			// |		{"parent":parent, "view":view}

			var parent = event.parent || this.app;
			var view = event.view;

			if(!view){
				return;
			}

			if(view !== parent.selectedChild){
				if(parent.selectedChild){
					domStyle.set(parent.selectedChild.domNode, "zIndex", 25);
				}

				domStyle.set(view.domNode, "display", "");
				domStyle.set(view.domNode, "zIndex", 50);
				parent.selectedChild = view;
			}
			// do selected view layout
			this._doResize(parent);
		}
	});
});

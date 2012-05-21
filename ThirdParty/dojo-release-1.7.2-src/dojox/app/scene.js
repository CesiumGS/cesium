define(["dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/connect",
	"dojo/_base/array",
	"dojo/_base/Deferred",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/query",
	"dijit",
	"dojox",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojox/css3/transit", 
	"./animation",
	"./model", 
	"./view", 
	"./bind"], 
	function(dojo,declare,connect, array,deferred,dlang,has,dstyle,dgeometry,cls,dconstruct,dattr,query,dijit,dojox,WidgetBase,Templated,WidgetsInTemplate,transit, anim, model, baseView, bind){
	
	var marginBox2contentBox = function(/*DomNode*/ node, /*Object*/ mb){
		// summary:
		//		Given the margin-box size of a node, return its content box size.
		//		Functions like dojo.contentBox() but is more reliable since it doesn't have
		//		to wait for the browser to compute sizes.
		var cs = dstyle.getComputedStyle(node);
		var me = dgeometry.getMarginExtents(node, cs);
		var pb = dgeometry.getPadBorderExtents(node, cs);
		return {
			l: dstyle.toPixelValue(node, cs.paddingLeft),
			t: dstyle.toPixelValue(node, cs.paddingTop),
			w: mb.w - (me.w + pb.w),
			h: mb.h - (me.h + pb.h)
		};
	};

	var capitalize = function(word){
		return word.substring(0,1).toUpperCase() + word.substring(1);
	};

	var size = function(widget, dim){
		// size the child
		var newSize = widget.resize ? widget.resize(dim) : dgeometry.setMarginBox(widget.domNode, dim);
		// record child's size
		if(newSize){
			// if the child returned it's new size then use that
			dojo.mixin(widget, newSize);
		}else{
			// otherwise, call marginBox(), but favor our own numbers when we have them.
			// the browser lies sometimes
			dojo.mixin(widget, dgeometry.getMarginBox(widget.domNode));

			dojo.mixin(widget, dim);
		}
	};

	return declare("dojox.app.scene", [dijit._WidgetBase, dijit._TemplatedMixin, dijit._WidgetsInTemplateMixin], {
		isContainer: true,
		widgetsInTemplate: true,
		defaultView: "default",

		selectedChild: null,
		baseClass: "scene mblView",
		isFullScreen: false,
		defaultViewType: baseView,
		
		//Temporary work around for getting a null when calling getParent
		getParent: function(){return null;},


		constructor: function(params,node){
			this.children={};
			if(params.parent){
				this.parent=params.parent
			}
			if(params.app){
				this.app = params.app;
			}
		},

		buildRendering: function(){
			this.inherited(arguments);
			dstyle.set(this.domNode, {width: "100%", "height": "100%"});
			cls.add(this.domNode,"dijitContainer");
		},

		splitChildRef: function(childId){
			var id = childId.split(",");
			if (id.length>0){
				var to = id.shift();
			}else{
				console.warn("invalid child id passed to splitChildRef(): ", childId);
			}

			return {
				id:to || this.defaultView,
				next: id.join(',') 
			}
		},

		loadChild: function(childId,subIds){
			// if no childId, load the default view
            if (!childId) {
                var parts = this.defaultView ? this.defaultView.split(",") : "default";
                childId = parts.shift();
                subIds = parts.join(',');
            }

			var cid = this.id+"_" + childId;
			if (this.children[cid]){
				return this.children[cid];
			}

			if (this.views&& this.views[childId]){
				var conf = this.views[childId];
				if (!conf.dependencies){conf.dependencies=[];}
				var deps = conf.template? conf.dependencies.concat(["dojo/text!app/"+conf.template]) :
						conf.dependencies.concat([]);
			
				var def = new deferred();
				if (deps.length>0) {
					require(deps,function(){
						def.resolve.call(def, arguments);			
					});
				}else{
					def.resolve(true);
				}
		
			   var loadChildDeferred = new deferred();
			   var self = this;
				deferred.when(def, function(){
					var ctor;
					if (conf.type){
						ctor=dojo.getObject(conf.type);
					}else if (self.defaultViewType){
						ctor=self.defaultViewType;
					}else{
						throw Error("Unable to find appropriate ctor for the base child class");
					}

					var params = dojo.mixin({}, conf, {
						id: self.id + "_" + childId,
						templateString: conf.template?arguments[0][arguments[0].length-1]:"<div></div>",
						parent: self,
						app: self.app
					}) 
					if (subIds){
						params.defaultView=subIds;
					}
                    var child = new ctor(params);
                    //load child's model if it is not loaded before
                    if(!child.loadedModels){
                        child.loadedModels = model(conf.models, self.loadedModels)
                        //TODO need to find out a better way to get all bindable controls in a view
                        bind([child], child.loadedModels);
                    }
					var addResult = self.addChild(child);
					//publish /app/loadchild event
					//application can subscript this event to do user define operation like select TabBarButton, add dynamic script text etc.
					connect.publish("/app/loadchild", [child]);

                 var promise;

                 subIds = subIds.split(',');
                 if ((subIds[0].length > 0) && (subIds.length > 1)) {//TODO join subIds
                     promise = child.loadChild(subIds[0], subIds[1]);
                 }
                 else 
                     if (subIds[0].length > 0) {
                         promise = child.loadChild(subIds[0], "");
                     }
                 
                 dojo.when(promise, function(){
                     loadChildDeferred.resolve(addResult)
                 });
				});
              return loadChildDeferred;
			}
	
			throw Error("Child '" + childId + "' not found.");
		},

		resize: function(changeSize,resultSize){
			var node = this.domNode;

			// set margin box size, unless it wasn't specified, in which case use current size
			if(changeSize){
				dgeometry.setMarginBox(node, changeSize);

				// set offset of the node
				if(changeSize.t){ node.style.top = changeSize.t + "px"; }
				if(changeSize.l){ node.style.left = changeSize.l + "px"; }
			}

			// If either height or width wasn't specified by the user, then query node for it.
			// But note that setting the margin box and then immediately querying dimensions may return
			// inaccurate results, so try not to depend on it.
			var mb = resultSize || {};
			dojo.mixin(mb, changeSize || {});	// changeSize overrides resultSize
			if( !("h" in mb) || !("w" in mb) ){
				mb = dojo.mixin(dgeometry.getMarginBox(node), mb);	// just use dojo.marginBox() to fill in missing values
			}

			// Compute and save the size of my border box and content box
			// (w/out calling dojo.contentBox() since that may fail if size was recently set)
			var cs = dstyle.getComputedStyle(node);
			var me = dgeometry.getMarginExtents(node, cs);
			var be = dgeometry.getBorderExtents(node, cs);
			var bb = (this._borderBox = {
				w: mb.w - (me.w + be.w),
				h: mb.h - (me.h + be.h)
			});
			var pe = dgeometry.getPadExtents(node, cs);
			this._contentBox = {
				l: dstyle.toPixelValue(node, cs.paddingLeft),
				t: dstyle.toPixelValue(node, cs.paddingTop),
				w: bb.w - pe.w,
				h: bb.h - pe.h
			};

			// Callback for widget to adjust size of its children
			this.layout();
		},

		layout: function(){
			var fullScreenScene,children,hasCenter;
			//console.log("fullscreen: ", this.selectedChild && this.selectedChild.isFullScreen);
			if (this.selectedChild && this.selectedChild.isFullScreen) {
				console.warn("fullscreen sceen layout");
				/*
				fullScreenScene=true;		
				children=[{domNode: this.selectedChild.domNode,region: "center"}];
				dojo.query("> [region]",this.domNode).forEach(function(c){
					if(this.selectedChild.domNode!==c.domNode){
						dojo.style(c.domNode,"display","none");
					}
				})
				*/
			}else{
				children = query("> [region]", this.domNode).map(function(node){
					var w = dijit.getEnclosingWidget(node);
					if (w){return w;}

					return {		
						domNode: node,
						region: dattr.get(node,"region")
					}
						
				});
				if (this.selectedChild){
					children = array.filter(children, function(c){
						if (c.region=="center" && this.selectedChild && this.selectedChild.domNode!==c.domNode){
							dstyle.set(c.domNode,"zIndex",25);
							dstyle.set(c.domNode,'display','none');
							return false;
						}else if (c.region!="center"){
							dstyle.set(c.domNode,"display","");
							dstyle.set(c.domNode,"zIndex",100);
						}
					
						return c.domNode && c.region;
					},this);

				//	this.selectedChild.region="center";	
				//	dojo.attr(this.selectedChild.domNode,"region","center");
				//	dojo.style(this.selectedChild.domNode, "display","");
				//	dojo.style(this.selectedChild.domNode,"zIndex",50);

				//	children.push({domNode: this.selectedChild.domNode, region: "center"});	
				//	children.push(this.selectedChild);
				//	console.log("children: ", children);
				}else{
					array.forEach(children, function(c){
						if (c && c.domNode && c.region=="center"){
							dstyle.set(c.domNode,"zIndex",25);
							dstyle.set(c.domNode,'display','none');
						}	
					});
				}
			
			}	
			// We don't need to layout children if this._contentBox is null for the operation will do nothing.
			if (this._contentBox) {
				this.layoutChildren(this.domNode, this._contentBox, children);
			}
			array.forEach(this.getChildren(), function(child){ 
				if (!child._started && child.startup){
					child.startup(); 
				}

			});

		},


		layoutChildren: function(/*DomNode*/ container, /*Object*/ dim, /*Widget[]*/ children,
			/*String?*/ changedRegionId, /*Number?*/ changedRegionSize){
			// summary
			//		Layout a bunch of child dom nodes within a parent dom node
			// container:
			//		parent node
			// dim:
			//		{l, t, w, h} object specifying dimensions of container into which to place children
			// children:
			//		an array of Widgets or at least objects containing:
			//			* domNode: pointer to DOM node to position
			//			* region or layoutAlign: position to place DOM node
			//			* resize(): (optional) method to set size of node
			//			* id: (optional) Id of widgets, referenced from resize object, below.
			// changedRegionId:
			//		If specified, the slider for the region with the specified id has been dragged, and thus
			//		the region's height or width should be adjusted according to changedRegionSize
			// changedRegionSize:
			//		See changedRegionId.
	
			// copy dim because we are going to modify it
			dim = dojo.mixin({}, dim);
	
			cls.add(container, "dijitLayoutContainer");
	
			// Move "client" elements to the end of the array for layout.  a11y dictates that the author
			// needs to be able to put them in the document in tab-order, but this algorithm requires that
			// client be last.    TODO: move these lines to LayoutContainer?   Unneeded other places I think.
			children = array.filter(children, function(item){ return item.region != "center" && item.layoutAlign != "client"; })
				.concat(array.filter(children, function(item){ return item.region == "center" || item.layoutAlign == "client"; }));
	
			// set positions/sizes
			array.forEach(children, function(child){
				var elm = child.domNode,
					pos = (child.region || child.layoutAlign);
	
				// set elem to upper left corner of unused space; may move it later
				var elmStyle = elm.style;
				elmStyle.left = dim.l+"px";
				elmStyle.top = dim.t+"px";
				elmStyle.position = "absolute";
	
				cls.add(elm, "dijitAlign" + capitalize(pos));
	
				// Size adjustments to make to this child widget
				var sizeSetting = {};
	
				// Check for optional size adjustment due to splitter drag (height adjustment for top/bottom align
				// panes and width adjustment for left/right align panes.
				if(changedRegionId && changedRegionId == child.id){
					sizeSetting[child.region == "top" || child.region == "bottom" ? "h" : "w"] = changedRegionSize;
				}
	
				// set size && adjust record of remaining space.
				// note that setting the width of a <div> may affect its height.
				if(pos == "top" || pos == "bottom"){
					sizeSetting.w = dim.w;
					size(child, sizeSetting);
					dim.h -= child.h;
					if(pos == "top"){
						dim.t += child.h;
					}else{
						elmStyle.top = dim.t + dim.h + "px";
					}
				}else if(pos == "left" || pos == "right"){
					sizeSetting.h = dim.h;
					size(child, sizeSetting);
					dim.w -= child.w;
					if(pos == "left"){
						dim.l += child.w;
					}else{
						elmStyle.left = dim.l + dim.w + "px";
					}
				}else if(pos == "client" || pos == "center"){
					size(child, dim);
				}
			});
		},

		getChildren: function(){
			return this._supportingWidgets;
		},

		startup: function(){
			if(this._started){ return; }
			this._started=true;

			var parts = this.defaultView?this.defaultView.split(","):"default";
			var toId, subIds;
			toId= parts.shift();
			subIds = parts.join(',');

			if(this.views[this.defaultView] && this.views[this.defaultView]["defaultView"]){
				subIds =  this.views[this.defaultView]["defaultView"];
			}	
			
			if(this.models && !this.loadedModels){
				//if there is this.models config data and the models has not been loaded yet,
				//load models at here using the configuration data and load model logic in model.js
				this.loadedModels = model(this.models);
				bind(this.getChildren(), this.loadedModels);
			}
			
			//startup assumes all children are loaded into DOM before startup is called
			//startup will only start the current available children.
			var cid = this.id + "_" + toId;
            if (this.children[cid]) {
				var next = this.children[cid];

				this.set("selectedChild", next);
				
				// If I am a not being controlled by a parent layout widget...
				var parent = this.getParent && this.getParent();
				if (!(parent && parent.isLayoutContainer)) {
					// Do recursive sizing and layout of all my descendants
					// (passing in no argument to resize means that it has to glean the size itself)
					this.resize();
					
					// Since my parent isn't a layout container, and my style *may be* width=height=100%
					// or something similar (either set directly or via a CSS class),
					// monitor when my size changes so that I can re-layout.
					// For browsers where I can't directly monitor when my size changes,
					// monitor when the viewport changes size, which *may* indicate a size change for me.
					this.connect(has("ie") ? this.domNode : dojo.global, 'onresize', function(){
						// Using function(){} closure to ensure no arguments to resize.
						this.resize();
					});
					
				}
				
				array.forEach(this.getChildren(), function(child){
					child.startup();
				});

				//transition to _startView
              if (this._startView && (this._startView != this.defaultView)) {
                  this.transition(this._startView, {});
              }
			}
		},

		addChild: function(widget){
			cls.add(widget.domNode, this.baseClass + "_child");
			widget.region = "center";;
			dattr.set(widget.domNode,"region","center");
			this._supportingWidgets.push(widget);
			dconstruct.place(widget.domNode,this.domNode);
			this.children[widget.id] = widget;
			return widget;
		},

		removeChild: function(widget){
			// summary:
			//		Removes the passed widget instance from this widget but does
			//		not destroy it.  You can also pass in an integer indicating
			//		the index within the container to remove

			if(widget){
				var node = widget.domNode;
				if(node && node.parentNode){
					node.parentNode.removeChild(node); // detach but don't destroy
				}
				return widget;
			}
		},

		_setSelectedChildAttr: function(child,opts){
			if (child !== this.selectedChild) { 
				return deferred.when(child, dlang.hitch(this, function(child){
					if (this.selectedChild){
						if (this.selectedChild.deactivate){
							this.selectedChild.deactivate(); 
						}

						dstyle.set(this.selectedChild.domNode,"zIndex",25);
					}
		
					//dojo.style(child.domNode, {
					//	"display": "",
					//	"zIndex": 50,
					//	"overflow": "auto"
					//});
					this.selectedChild = child;
					dstyle.set(child.domNode, "display", "");
					dstyle.set(child.domNode,"zIndex",50);
					this.selectedChild=child;
					if (this._started) {	
						if (child.startup && !child._started){
							child.startup();
						}else if (child.activate){
							child.activate();
						}
		
					}
					this.layout();
				}));
			}
		},


		transition: function(transitionTo,opts){
			//summary: 
			//  transitions from the currently visible scene to the defined scene.
			//  it should determine what would be the best transition unless
			//  an override in opts tells it to use a specific transitioning methodology
			//  the transitionTo is a string in the form of [view]@[scene].  If
			//  view is left of, the current scene will be transitioned to the default
			//  view of the specified scene (eg @scene2), if the scene is left off
			//  the app controller will instruct the active scene to the view (eg view1).  If both
			//  are supplied (view1@scene2), then the application should transition to the scene,
			//  and instruct the scene to navigate to the view.
			var toId,subIds,next, current = this.selectedChild;
			console.log("scene", this.id, transitionTo);
			if (transitionTo){	
				var parts = transitionTo.split(",");
				toId= parts.shift();
				subIds = parts.join(',');

			}else{
				toId = this.defaultView;
				if(this.views[this.defaultView] && this.views[this.defaultView]["defaultView"]){
					subIds =  this.views[this.defaultView]["defaultView"];
				}	
			}
		
			next = this.loadChild(toId,subIds);

			if (!current){
				//assume this.set(...) will return a promise object if child is first loaded
				//return nothing if child is already in array of this.children
				return this.set("selectedChild",next);	
			}	

			var transitionDeferred  = new deferred();
			deferred.when(next, dlang.hitch(this, function(next){
			        var promise;
			    
				if (next!==current){
				    //TODO need to refactor here, when clicking fast, current will not be the 
				    //view we want to start transition. For example, during transition 1 -> 2
				    //if user click button to transition to 3 and then transition to 1. It will
				    //perform transition 2 -> 3 and 2 -> 1 because current is always point to 
				    //2 during 1 -> 2 transition.
				    
				    var waitingList = anim.getWaitingList([next.domNode, current.domNode]);
				    //update registry with deferred objects in animations of args.
				    var transitionDefs = {};
				    transitionDefs[current.domNode.id] = anim.playing[current.domNode.id] = new deferred();
				    transitionDefs[next.domNode.id] = anim.playing[current.domNode.id] = new deferred();
				                
				    deferred.when(waitingList, dojo.hitch(this, function(){
					//assume next is already loaded so that this.set(...) will not return
					//a promise object. this.set(...) will handles the this.selectedChild,
					//activate or deactivate views and refresh layout.
					this.set("selectedChild", next);
					
					//publish /app/transition event
					//application can subscript this event to do user define operation like select TabBarButton, etc.
					connect.publish("/app/transition", [next, toId]);
					transit(current.domNode,next.domNode,dojo.mixin({},opts,{transition: this.defaultTransition || "none", transitionDefs: transitionDefs})).then(dlang.hitch(this, function(){
						//dojo.style(current.domNode, "display", "none");
						if (subIds && next.transition){
							promise = next.transition(subIds,opts);
						}
						deferred.when(promise, function(){
		                                    transitionDeferred.resolve();
		                                });
					}));
				    }));
				    return;
				}

				//we didn't need to transition, but continue to propogate.
				if (subIds && next.transition){
					promise = next.transition(subIds,opts);
				}
				deferred.when(promise, function(){
				    transitionDeferred.resolve();
				});
			}));
			return transitionDeferred;
		},
		toString: function(){return this.id},

		activate: function(){},
		deactive: function(){}
	});
});

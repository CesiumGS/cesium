define([
	"dojo/_base/declare",
	"dojo/_base/kernel",
	"dojo/fx",
	"dijit/TitlePane",
	"./PortletSettings",
	"./PortletDialogSettings"
	], function(declare, kernel, fx, TitlePane, PortletSettings, PortletDialogSettings){
	
	kernel.experimental("dojox.widget.Portlet");
	
	return declare("dojox.widget.Portlet", [TitlePane, dijit._Container],{
		// summary:
		//		A container widget that is designed to be contained
		//		in a dojox.layout.GridContainer. Child widgets can insert
		//		an icon into the title bar of the Portlet, which when
		//		clicked, executes the "toggle" method of the child widget.
		//		A child widget must specify the attribute
		//		"portletIconClass", and the optional class
		//		"portletIconHoverClass", as well as the
		//		"toggle" function.

		// resizeChildren: Boolean
		//		If true, when the Portlet is resized, any child widgets
		//		with a 'resize' method have that method called.
		resizeChildren: true,

		// closable: Boolean
		//		If true, a close button is placed in the title bar,
		//		and the Portlet can be hidden. If false, the Portlet
		//		cannot be closed.
		closable: true,

		// _parents: Array
		//		 An array of all the StackContainer widgets that this Portlet
		//		is contained in.	These are used to determine if the portlet
		//		is visible or not.
		_parents: null,

		// _size: Object
		//		Cache of the previous size of the portlet, used to determine
		//		if the size has changed and if the child widgets should be
		//		resized.
		_size: null,

		// dragRestriction: Boolean
		//		To remove the drag capability.
		dragRestriction : false,

		buildRendering: function(){
			this.inherited(arguments);

			// Hide the portlet until it is fully constructed.
			dojo.style(this.domNode, "visibility", "hidden");
		},

		postCreate: function(){
			this.inherited(arguments);

			// Add the portlet classes
			dojo.addClass(this.domNode, "dojoxPortlet");
			dojo.removeClass(this.arrowNode, "dijitArrowNode");
			dojo.addClass(this.arrowNode, "dojoxPortletIcon dojoxArrowDown");
			dojo.addClass(this.titleBarNode, "dojoxPortletTitle");
			dojo.addClass(this.hideNode, "dojoxPortletContentOuter");

			// Choose the class to add depending on if the portlet is draggable or not.
			dojo.addClass(this.domNode, "dojoxPortlet-" + (!this.dragRestriction ? "movable" : "nonmovable"));

			var _this = this;
			if(this.resizeChildren){
				// If children should be resized	when the portlet size changes,
				// listen for items being dropped, when the window is resized,
				// or when another portlet's size changes.

				this.subscribe("/dnd/drop", function(){_this._updateSize();});

				this.subscribe("/Portlet/sizechange", function(widget){_this.onSizeChange(widget);});
				this.connect(window, "onresize", function(){_this._updateSize();});

				// Subscribe to all possible child-selection events that could affect this
				// portlet
				var doSelectSubscribe = dojo.hitch(this, function(id, lastId){
					var widget = dijit.byId(id);
					if(widget.selectChild){
						var s = this.subscribe(id + "-selectChild", function(child){
							var n = _this.domNode.parentNode;

							while(n){
								if(n == child.domNode){

									// Only fire this once, as the widget is now visible
									// at least once, so child measurements should be accurate.
									_this.unsubscribe(s);
									_this._updateSize();
									break;
								}
								n = n.parentNode;
							}
						});

						// Record the StackContainer and child widget that this portlet
						// is in, so it can figure out whether or not it is visible.
						// If it is not visible, it will not update it's size dynamically.
						var child = dijit.byId(lastId);
						if(widget && child){
							_this._parents.push({parent: widget, child: child});
						}
					}
				});
				var lastId;
				this._parents = [];

				// Find all parent widgets, and if they are StackContainers,
				// subscribe to their selectChild method calls.
				for(var p = this.domNode.parentNode; p != null; p = p.parentNode){
					var id = p.getAttribute ? p.getAttribute("widgetId") : null;
					if(id){
						doSelectSubscribe(id, lastId);
						lastId = id;
					}
				}
			}

			// Prevent clicks on icons from causing a drag to start.
			this.connect(this.titleBarNode, "onmousedown", function(evt){
				if (dojo.hasClass(evt.target, "dojoxPortletIcon")) {
					dojo.stopEvent(evt);
					return false;
				}
				return true;
			});

			// Inform all portlets that the size of this one has changed,
			// and therefore perhaps they have too
			this.connect(this._wipeOut, "onEnd", function(){_this._publish();});
			this.connect(this._wipeIn, "onEnd", function(){_this._publish();});

			if(this.closable){
				this.closeIcon = this._createIcon("dojoxCloseNode", "dojoxCloseNodeHover", dojo.hitch(this, "onClose"));
				dojo.style(this.closeIcon, "display", "");
			}
		},

		startup: function(){
			if(this._started){return;}

			var children = this.getChildren();
			this._placeSettingsWidgets();

			// Start up the children
			dojo.forEach(children, function(child){
				try{
					if(!child.started && !child._started){
						child.startup()
					}
				}
				catch(e){
					console.log(this.id + ":" + this.declaredClass, e);
				}
			});

			this.inherited(arguments);

			//this._updateSize();
			dojo.style(this.domNode, "visibility", "visible");
		},

		_placeSettingsWidgets: function(){
			// summary:
			//		Checks all the children to see if they are instances
			//		of dojox.widget.PortletSettings. If they are,
			//		create an icon for them in the title bar which when clicked,
			//		calls their toggle() method.

			dojo.forEach(this.getChildren(), dojo.hitch(this, function(child){
				if(child.portletIconClass && child.toggle && !child.get("portlet")){
					this._createIcon(child.portletIconClass, child.portletIconHoverClass, dojo.hitch(child, "toggle"));
					dojo.place(child.domNode, this.containerNode, "before");
					child.set("portlet", this);
					this._settingsWidget = child;
				}
			}));
		},

		_createIcon: function(clazz, hoverClazz, fn){
			// summary:
			//		creates an icon in the title bar.

			var icon = dojo.create("div",{
				"class": "dojoxPortletIcon " + clazz,
				"waiRole": "presentation"
			});
			dojo.place(icon, this.arrowNode, "before");

			this.connect(icon, "onclick", fn);

			if(hoverClazz){
				this.connect(icon, "onmouseover", function(){
					dojo.addClass(icon, hoverClazz);
				});
				this.connect(icon, "onmouseout", function(){
					dojo.removeClass(icon, hoverClazz);
				});
			}
			return icon;
		},

		onClose: function(evt){
			// summary:
			//		Hides the portlet. Note that it does not
			//		persist this, so it is up to the client to
			//		listen to this method and persist the closed state
			//		in their own way.
			dojo.style(this.domNode, "display", "none");
		},

		onSizeChange: function(widget){
			// summary:
			//		Updates the Portlet size if any other Portlet
			//		changes its size.
			if(widget == this){
				return;
			}
			this._updateSize();
		},

		_updateSize: function(){
			// summary:
			//		Updates the size of all child widgets.
			if(!this.open || !this._started || !this.resizeChildren){
				return;
			}

			if(this._timer){
				clearTimeout(this._timer);
			}
			// Delay applying the size change in case the size
			// changes very frequently, for performance reasons.
			this._timer = setTimeout(dojo.hitch(this, function(){
				var size ={
					w: dojo.style(this.domNode, "width"),
					h: dojo.style(this.domNode, "height")
				};

				// If the Portlet is in a StackWidget, and it is not
				// visible, do not update the size, as it could
				// make child widgets miscalculate.
				for(var i = 0; i < this._parents.length; i++){
					var p = this._parents[i];
					var sel = p.parent.selectedChildWidget
					if(sel && sel != p.child){
						return;
					}
				}

				if(this._size){
					// If the size of the portlet hasn't changed, don't
					// resize the children, as this can be expensive
					if(this._size.w == size.w && this._size.h == size.h){
						return;
					}
				}
				this._size = size;

				var fns = ["resize", "layout"];
				this._timer = null;
				var kids = this.getChildren();

				dojo.forEach(kids, function(child){
					for(var i = 0; i < fns.length; i++){
						if(dojo.isFunction(child[fns[i]])){
							try{
								child[fns[i]]();
							} catch(e){
								console.log(e);
							}
							break;
						}
					}
				});
				this.onUpdateSize();
			}), 100);
		},

		onUpdateSize: function(){
			// summary:
			//		Stub function called when the size is changed.
		},

		_publish: function(){
			// summary:
			//		Publishes an event that all other portlets listen to.
			//		This causes them to update their child widgets if their
			//		size has changed.
			dojo.publish("/Portlet/sizechange",[this]);
		},

		_onTitleClick: function(evt){
			if(evt.target == this.arrowNode){
				this.inherited(arguments);
			}
		},

		addChild: function(child){
			// summary:
			//		Adds a child widget to the portlet.
			this._size = null;
			this.inherited(arguments);

			if(this._started){
				this._placeSettingsWidgets();
				this._updateSize();
			}
			if(this._started && !child.started && !child._started){
				child.startup();
			}
		},

		destroyDescendants: function(/*Boolean*/ preserveDom){
			this.inherited(arguments);
			if(this._settingsWidget){
				this._settingsWidget.destroyRecursive(preserveDom);
			}
		},

		destroy: function(){
			if(this._timer){
				clearTimeout(this._timer);
			}
			this.inherited(arguments);
		},

		_setCss: function(){
			this.inherited(arguments);
			dojo.style(this.arrowNode, "display", this.toggleable ? "":"none");
		}
	});
});
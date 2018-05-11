define([
	"dojo/_base/array", // array.forEach array.indexOf array.map
	"dojo/_base/declare", // declare
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/keys", // keys
	"dojo/_base/lang", // lang.getObject
	"dojo/on",
	"dojo/topic",
	"../focus", // focus.focus()
	"../registry", // registry.byId
	"../_Widget",
	"../_TemplatedMixin",
	"../_Container",
	"../form/ToggleButton",
	"dojo/touch"	// for normalized click handling, see dojoClick property setting in postCreate()
], function(array, declare, domClass, domConstruct, keys, lang, on, topic,
			focus, registry, _Widget, _TemplatedMixin,_Container, ToggleButton){

	// module:
	//		dijit/layout/StackController

	var StackButton = declare("dijit.layout._StackButton", ToggleButton, {
		// summary:
		//		Internal widget used by StackContainer.
		// description:
		//		The button-like or tab-like object you click to select or delete a page
		// tags:
		//		private

		// Override _FormWidget.tabIndex.
		// StackContainer buttons are not in the tab order by default.
		// Probably we should be calling this.startupKeyNavChildren() instead.
		tabIndex: "-1",

		// closeButton: Boolean
		//		When true, display close button for this tab
		closeButton: false,

		_aria_attr: "aria-selected",

		buildRendering: function(/*Event*/ evt){
			this.inherited(arguments);
			(this.focusNode || this.domNode).setAttribute("role", "tab");
		}
	});


	var StackController = declare("dijit.layout.StackController", [_Widget, _TemplatedMixin, _Container], {
		// summary:
		//		Set of buttons to select a page in a `dijit/layout/StackContainer`
		// description:
		//		Monitors the specified StackContainer, and whenever a page is
		//		added, deleted, or selected, updates itself accordingly.

		baseClass: "dijitStackController",

		templateString: "<span role='tablist' data-dojo-attach-event='onkeydown'></span>",

		// containerId: [const] String
		//		The id of the page container that I point to
		containerId: "",

		// buttonWidget: [const] Constructor
		//		The button widget to create to correspond to each page
		buttonWidget: StackButton,

		// buttonWidgetCloseClass: String
		//		CSS class of [x] close icon, used by event delegation code to tell when close button was clicked
		buttonWidgetCloseClass: "dijitStackCloseButton",

		pane2button: function(/*String*/ id){
			// summary:
			//		Returns the button corresponding to the pane w/the given id.
			// tags:
			//		protected
			return registry.byId(this.id + "_" + id);
		},

		postCreate: function(){
			this.inherited(arguments);

			// Listen to notifications from StackContainer.  This is tricky because the StackContainer may not have
			// been created yet, so abstracting it through topics.
			// Note: for TabContainer we can do this through bubbled events instead of topics; maybe that's
			// all we support for 2.0?
			this.own(
				topic.subscribe(this.containerId + "-startup", lang.hitch(this, "onStartup")),
				topic.subscribe(this.containerId + "-addChild", lang.hitch(this, "onAddChild")),
				topic.subscribe(this.containerId + "-removeChild", lang.hitch(this, "onRemoveChild")),
				topic.subscribe(this.containerId + "-selectChild", lang.hitch(this, "onSelectChild")),
				topic.subscribe(this.containerId + "-containerKeyDown", lang.hitch(this, "onContainerKeyDown"))
			);

			// Listen for click events to select or close tabs.
			// No need to worry about ENTER/SPACE key handling: tabs are selected via left/right arrow keys,
			// and closed via shift-F10 (to show the close menu).
			// Also, add flag to use normalized click handling from dojo/touch
			this.containerNode.dojoClick = true;
			this.own(on(this.containerNode, 'click', lang.hitch(this, function(evt){
				var button = registry.getEnclosingWidget(evt.target);
				if(button != this.containerNode && !button.disabled && button.page){
					for(var target = evt.target; target !== this.containerNode; target = target.parentNode){
						if(domClass.contains(target, this.buttonWidgetCloseClass)){
							this.onCloseButtonClick(button.page);
							break;
						}else if(target == button.domNode){
							this.onButtonClick(button.page);
							break;
						}
					}
				}
			})));
		},

		onStartup: function(/*Object*/ info){
			// summary:
			//		Called after StackContainer has finished initializing
			// tags:
			//		private
			this.textDir = info.textDir;
			array.forEach(info.children, this.onAddChild, this);
			if(info.selected){
				// Show button corresponding to selected pane (unless selected
				// is null because there are no panes)
				this.onSelectChild(info.selected);
			}

			// Reflect events like page title changes to tab buttons
			var containerNode = registry.byId(this.containerId).containerNode,
				pane2button = lang.hitch(this, "pane2button"),
				paneToButtonAttr = {
					"title": "label",
					"showtitle": "showLabel",
					"iconclass": "iconClass",
					"closable": "closeButton",
					"tooltip": "title",
					"disabled": "disabled",
					"textdir": "textdir"
				},
				connectFunc = function(attr, buttonAttr){
					return on(containerNode, "attrmodified-" + attr, function(evt){
						var button = pane2button(evt.detail && evt.detail.widget && evt.detail.widget.id);
						if(button){
							button.set(buttonAttr, evt.detail.newValue);
						}
					});
				};
			for(var attr in paneToButtonAttr){
				this.own(connectFunc(attr, paneToButtonAttr[attr]));
			}
		},

		destroy: function(preserveDom){
			// Since the buttons are internal to the StackController widget, destroy() should remove them.
			// When #5796 is fixed for 2.0 can get rid of this function completely.
			this.destroyDescendants(preserveDom);
			this.inherited(arguments);
		},

		onAddChild: function(/*dijit/_WidgetBase*/ page, /*Integer?*/ insertIndex){
			// summary:
			//		Called whenever a page is added to the container.
			//		Create button corresponding to the page.
			// tags:
			//		private

			// create an instance of the button widget
			// (remove typeof buttonWidget == string support in 2.0)
			var Cls = lang.isString(this.buttonWidget) ? lang.getObject(this.buttonWidget) : this.buttonWidget;
			var button = new Cls({
				id: this.id + "_" + page.id,
				name: this.id + "_" + page.id, // note: must match id used in pane2button()
				label: page.title,
				disabled: page.disabled,
				ownerDocument: this.ownerDocument,
				dir: page.dir,
				lang: page.lang,
				textDir: page.textDir || this.textDir,
				showLabel: page.showTitle,
				iconClass: page.iconClass,
				closeButton: page.closable,
				title: page.tooltip,
				page: page
			});

			this.addChild(button, insertIndex);
			page.controlButton = button;	// this value might be overwritten if two tabs point to same container
			if(!this._currentChild){
				// If this is the first child then StackContainer will soon publish that it's selected,
				// but before that StackContainer calls layout(), and before layout() is called the
				// StackController needs to have the proper height... which means that the button needs
				// to be marked as selected now.   See test_TabContainer_CSS.html for test.
				this.onSelectChild(page);
			}

			// Add this StackController button to the list of things that labels that StackContainer pane.
			// Also, if there's an aria-labelledby parameter for the pane, then the aria-label parameter is unneeded.
			var labelledby = page._wrapper.getAttribute("aria-labelledby") ?
				page._wrapper.getAttribute("aria-labelledby") + " " + button.id : button.id;
			page._wrapper.removeAttribute("aria-label");
			page._wrapper.setAttribute("aria-labelledby", labelledby);
		},

		onRemoveChild: function(/*dijit/_WidgetBase*/ page){
			// summary:
			//		Called whenever a page is removed from the container.
			//		Remove the button corresponding to the page.
			// tags:
			//		private

			if(this._currentChild === page){
				this._currentChild = null;
			}

			var button = this.pane2button(page.id);
			if(button){
				this.removeChild(button);
				button.destroy();
			}
			delete page.controlButton;
		},

		onSelectChild: function(/*dijit/_WidgetBase*/ page){
			// summary:
			//		Called when a page has been selected in the StackContainer, either by me or by another StackController
			// tags:
			//		private

			if(!page){
				return;
			}

			if(this._currentChild){
				var oldButton = this.pane2button(this._currentChild.id);
				oldButton.set('checked', false);
				oldButton.focusNode.setAttribute("tabIndex", "-1");
			}

			var newButton = this.pane2button(page.id);
			newButton.set('checked', true);
			this._currentChild = page;
			newButton.focusNode.setAttribute("tabIndex", "0");
			var container = registry.byId(this.containerId);
		},

		onButtonClick: function(/*dijit/_WidgetBase*/ page){
			// summary:
			//		Called whenever one of my child buttons is pressed in an attempt to select a page
			// tags:
			//		private

			var button = this.pane2button(page.id);

			// For TabContainer where the tabs are <span>, need to set focus explicitly when left/right arrow
			focus.focus(button.focusNode);

			if(this._currentChild && this._currentChild.id === page.id){
				//In case the user clicked the checked button, keep it in the checked state because it remains to be the selected stack page.
				button.set('checked', true);
			}
			var container = registry.byId(this.containerId);
			container.selectChild(page);
		},

		onCloseButtonClick: function(/*dijit/_WidgetBase*/ page){
			// summary:
			//		Called whenever one of my child buttons [X] is pressed in an attempt to close a page
			// tags:
			//		private

			var container = registry.byId(this.containerId);
			container.closeChild(page);
			if(this._currentChild){
				var b = this.pane2button(this._currentChild.id);
				if(b){
					focus.focus(b.focusNode || b.domNode);
				}
			}
		},

		// TODO: this is a bit redundant with forward, back api in StackContainer
		adjacent: function(/*Boolean*/ forward){
			// summary:
			//		Helper for onkeydown to find next/previous button
			// tags:
			//		private

			if(!this.isLeftToRight() && (!this.tabPosition || /top|bottom/.test(this.tabPosition))){
				forward = !forward;
			}
			// find currently focused button in children array
			var children = this.getChildren();
			var idx = array.indexOf(children, this.pane2button(this._currentChild.id)),
				current = children[idx];

			// Pick next/previous non-disabled button to focus on.   If we get back to the original button it means
			// that all buttons must be disabled, so return current child to avoid an infinite loop.
			var child;
			do{
				idx = (idx + (forward ? 1 : children.length - 1)) % children.length;
				child = children[idx];
			}while(child.disabled && child != current);

			return child; // dijit/_WidgetBase
		},

		onkeydown: function(/*Event*/ e, /*Boolean?*/ fromContainer){
			// summary:
			//		Handle keystrokes on the page list, for advancing to next/previous button
			//		and closing the current page if the page is closable.
			// tags:
			//		private

			if(this.disabled || e.altKey){
				return;
			}
			var forward = null;
			if(e.ctrlKey || !e._djpage){
				switch(e.keyCode){
					case keys.LEFT_ARROW:
					case keys.UP_ARROW:
						if(!e._djpage){
							forward = false;
						}
						break;
					case keys.PAGE_UP:
						if(e.ctrlKey){
							forward = false;
						}
						break;
					case keys.RIGHT_ARROW:
					case keys.DOWN_ARROW:
						if(!e._djpage){
							forward = true;
						}
						break;
					case keys.PAGE_DOWN:
						if(e.ctrlKey){
							forward = true;
						}
						break;
					case keys.HOME:
						// Navigate to first non-disabled child
						var children = this.getChildren();
						for(var idx = 0; idx < children.length; idx++){
							var child = children[idx];
							if(!child.disabled){
								this.onButtonClick(child.page);
								break;
							}
						}
						e.stopPropagation();
						e.preventDefault();
						break;
					case keys.END:
						// Navigate to last non-disabled child
						var children = this.getChildren();
						for(var idx = children.length - 1; idx >= 0; idx--){
							var child = children[idx];
							if(!child.disabled){
								this.onButtonClick(child.page);
								break;
							}
						}
						e.stopPropagation();
						e.preventDefault();
						break;
					case keys.DELETE:
					case "W".charCodeAt(0):    // ctrl-W
						if(this._currentChild.closable &&
							(e.keyCode == keys.DELETE || e.ctrlKey)){
							this.onCloseButtonClick(this._currentChild);

							// avoid browser tab closing
							e.stopPropagation();
							e.preventDefault();
						}
						break;
					case keys.TAB:
						if(e.ctrlKey){
							this.onButtonClick(this.adjacent(!e.shiftKey).page);
							e.stopPropagation();
							e.preventDefault();
						}
						break;
				}
				// handle next/previous page navigation (left/right arrow, etc.)
				if(forward !== null){
					this.onButtonClick(this.adjacent(forward).page);
					e.stopPropagation();
					e.preventDefault();
				}
			}
		},

		onContainerKeyDown: function(/*Object*/ info){
			// summary:
			//		Called when there was a keydown on the container
			// tags:
			//		private
			info.e._djpage = info.page;
			this.onkeydown(info.e);
		}
	});

	StackController.StackButton = StackButton;	// for monkey patching

	return StackController;
});

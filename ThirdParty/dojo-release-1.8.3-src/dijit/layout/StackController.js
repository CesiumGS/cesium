define([
	"dojo/_base/array", // array.forEach array.indexOf array.map
	"dojo/_base/declare", // declare
	"dojo/dom-class",
	"dojo/_base/event", // event.stop
	"dojo/keys", // keys
	"dojo/_base/lang", // lang.getObject
	"dojo/on",
	"../focus",		// focus.focus()
	"../registry",	// registry.byId
	"../_Widget",
	"../_TemplatedMixin",
	"../_Container",
	"../form/ToggleButton",
	"dojo/i18n!../nls/common"
], function(array, declare, domClass, event, keys, lang, on,
			focus, registry, _Widget, _TemplatedMixin, _Container, ToggleButton){

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

		templateString: "<span role='tablist' data-dojo-attach-event='onkeypress'></span>",

		// containerId: [const] String
		//		The id of the page container that I point to
		containerId: "",

		// buttonWidget: [const] Constructor
		//		The button widget to create to correspond to each page
		buttonWidget: StackButton,

		// buttonWidgetCloseClass: String
		//		CSS class of [x] close icon, used by event delegation code to tell when close button was clicked
		buttonWidgetCloseClass: "dijitStackCloseButton",

		constructor: function(params /*===== , srcNodeRef =====*/){
			// summary:
			//		Create the widget.
			// params: Object|null
			//		Hash of initialization parameters for widget, including scalar values (like title, duration etc.)
			//		and functions, typically callbacks like onClick.
			//		The hash can contain any of the widget's properties, excluding read-only properties.
			// srcNodeRef: DOMNode|String?
			//		If a srcNodeRef (DOM node) is specified, replace srcNodeRef with my generated DOM tree

			this.pane2button = {};		// mapping from pane id to buttons
		},

		postCreate: function(){
			this.inherited(arguments);

			// Listen to notifications from StackContainer.
			// TODO: do this through bubbled events instead of topics
			this.subscribe(this.containerId+"-startup", "onStartup");
			this.subscribe(this.containerId+"-addChild", "onAddChild");
			this.subscribe(this.containerId+"-removeChild", "onRemoveChild");
			this.subscribe(this.containerId+"-selectChild", "onSelectChild");
			this.subscribe(this.containerId+"-containerKeyPress", "onContainerKeyPress");

			// Listen for click events to select or close tabs.
			// No need to worry about ENTER/SPACE key handling: tabs are selected via left/right arrow keys,
			// and closed via shift-F10 (to show the close menu).
			this.connect(this.containerNode, 'click', function(evt){
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
			});
		},

		onStartup: function(/*Object*/ info){
			// summary:
			//		Called after StackContainer has finished initializing
			// tags:
			//		private
			array.forEach(info.children, this.onAddChild, this);
			if(info.selected){
				// Show button corresponding to selected pane (unless selected
				// is null because there are no panes)
				this.onSelectChild(info.selected);
			}

			// Reflect events like page title changes to tab buttons
			var containerNode = registry.byId(this.containerId).containerNode,
				pane2button = this.pane2button,
				paneToButtonAttr = {
					"title": "label",
					"showtitle": "showLabel",
					"iconclass": "iconClass",
					"closable": "closeButton",
					"tooltip": "title",
					"disabled": "disabled"
				},
				connectFunc = function(attr, buttonAttr){
					return on(containerNode, "attrmodified-" + attr, function(evt){
						var button = pane2button[evt.detail && evt.detail.widget && evt.detail.widget.id];
						if(button){
							button.set(buttonAttr, evt.detail.newValue);
						}
					});
				};
			for(var attr in paneToButtonAttr){
				this.own(connectFunc(attr, paneToButtonAttr[attr]));
			}
		},

		destroy: function(){
			// Since the buttons are internal to the StackController widget, destroy() should remove them, which is
			// done by calling onRemoveChild().
			for(var pane in this.pane2button){
				this.onRemoveChild(registry.byId(pane));
			}

			// TODO: destroyRecursive() will call destroy() on each child button twice.   Once from the above code,
			// and once because _WidgetBase.destroyDescendants() deletes anything inside of this.containerNode.
			// Probably shouldn't attach that DOMNode as this.containerNode.

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
				name: this.id + "_" + page.id,
				label: page.title,
				disabled: page.disabled,
				ownerDocument: this.ownerDocument,
				dir: page.dir,
				lang: page.lang,
				textDir: page.textDir,
				showLabel: page.showTitle,
				iconClass: page.iconClass,
				closeButton: page.closable,
				title: page.tooltip,
				page: page
			});

			this.addChild(button, insertIndex);
			this.pane2button[page.id] = button;
			page.controlButton = button;	// this value might be overwritten if two tabs point to same container
			if(!this._currentChild){
				// If this is the first child then StackContainer will soon publish that it's selected,
				// but before that StackContainer calls layout(), and before layout() is called the
				// StackController needs to have the proper height... which means that the button needs
				// to be marked as selected now.   See test_TabContainer_CSS.html for test.
				this.onSelectChild(page);
			}
		},

		onRemoveChild: function(/*dijit/_WidgetBase*/ page){
			// summary:
			//		Called whenever a page is removed from the container.
			//		Remove the button corresponding to the page.
			// tags:
			//		private

			if(this._currentChild === page){ this._currentChild = null; }

			var button = this.pane2button[page.id];
			if(button){
				this.removeChild(button);
				delete this.pane2button[page.id];
				button.destroy();
			}
			delete page.controlButton;
		},

		onSelectChild: function(/*dijit/_WidgetBase*/ page){
			// summary:
			//		Called when a page has been selected in the StackContainer, either by me or by another StackController
			// tags:
			//		private

			if(!page){ return; }

			if(this._currentChild){
				var oldButton=this.pane2button[this._currentChild.id];
				oldButton.set('checked', false);
				oldButton.focusNode.setAttribute("tabIndex", "-1");
			}

			var newButton=this.pane2button[page.id];
			newButton.set('checked', true);
			this._currentChild = page;
			newButton.focusNode.setAttribute("tabIndex", "0");
			var container = registry.byId(this.containerId);
			container.containerNode.setAttribute("aria-labelledby", newButton.id);
		},

		onButtonClick: function(/*dijit/_WidgetBase*/ page){
			// summary:
			//		Called whenever one of my child buttons is pressed in an attempt to select a page
			// tags:
			//		private

			var button = this.pane2button[page.id];

			// For TabContainer where the tabs are <span>, need to set focus explicitly when left/right arrow
			focus.focus(button.focusNode);

			if(this._currentChild && this._currentChild.id === page.id) {
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
				var b = this.pane2button[this._currentChild.id];
				if(b){
					focus.focus(b.focusNode || b.domNode);
				}
			}
		},

		// TODO: this is a bit redundant with forward, back api in StackContainer
		adjacent: function(/*Boolean*/ forward){
			// summary:
			//		Helper for onkeypress to find next/previous button
			// tags:
			//		private

			if(!this.isLeftToRight() && (!this.tabPosition || /top|bottom/.test(this.tabPosition))){ forward = !forward; }
			// find currently focused button in children array
			var children = this.getChildren();
			var idx = array.indexOf(children, this.pane2button[this._currentChild.id]),
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

		onkeypress: function(/*Event*/ e){
			// summary:
			//		Handle keystrokes on the page list, for advancing to next/previous button
			//		and closing the current page if the page is closable.
			// tags:
			//		private

			if(this.disabled || e.altKey ){ return; }
			var forward = null;
			if(e.ctrlKey || !e._djpage){
				switch(e.charOrCode){
					case keys.LEFT_ARROW:
					case keys.UP_ARROW:
						if(!e._djpage){ forward = false; }
						break;
					case keys.PAGE_UP:
						if(e.ctrlKey){ forward = false; }
						break;
					case keys.RIGHT_ARROW:
					case keys.DOWN_ARROW:
						if(!e._djpage){ forward = true; }
						break;
					case keys.PAGE_DOWN:
						if(e.ctrlKey){ forward = true; }
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
						event.stop(e);
						break;
					case keys.END:
						// Navigate to last non-disabled child
						var children = this.getChildren();
						for(var idx = children.length-1; idx >= 0; idx--){
							var child = children[idx];
							if(!child.disabled){
								this.onButtonClick(child.page);
								break;
							}
						}
						event.stop(e);
						break;
					case keys.DELETE:
						if(this._currentChild.closable){
							this.onCloseButtonClick(this._currentChild);
						}
						event.stop(e);
						break;
					default:
						if(e.ctrlKey){
							if(e.charOrCode === keys.TAB){
								this.onButtonClick(this.adjacent(!e.shiftKey).page);
								event.stop(e);
							}else if(e.charOrCode == "w"){
								if(this._currentChild.closable){
									this.onCloseButtonClick(this._currentChild);
								}
								event.stop(e); // avoid browser tab closing.
							}
						}
				}
				// handle next/previous page navigation (left/right arrow, etc.)
				if(forward !== null){
					this.onButtonClick(this.adjacent(forward).page);
					event.stop(e);
				}
			}
		},

		onContainerKeyPress: function(/*Object*/ info){
			// summary:
			//		Called when there was a keypress on the container
			// tags:
			//		private
			info.e._djpage = info.page;
			this.onkeypress(info.e);
		}
	});

	StackController.StackButton = StackButton;	// for monkey patching

	return StackController;
});

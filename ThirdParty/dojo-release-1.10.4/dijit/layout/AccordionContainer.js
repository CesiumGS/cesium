define([
	"require",
	"dojo/_base/array", // array.forEach array.map
	"dojo/_base/declare", // declare
	"dojo/_base/fx", // fx.Animation
	"dojo/dom", // dom.setSelectable
	"dojo/dom-attr", // domAttr.attr
	"dojo/dom-class", // domClass.remove
	"dojo/dom-construct", // domConstruct.place
	"dojo/dom-geometry",
	"dojo/keys", // keys
	"dojo/_base/lang", // lang.getObject lang.hitch
	"dojo/sniff", // has("ie") has("dijit-legacy-requires")
	"dojo/topic", // publish
	"../focus", // focus.focus()
	"../_base/manager", // manager.defaultDuration
	"dojo/ready",
	"../_Widget",
	"../_Container",
	"../_TemplatedMixin",
	"../_CssStateMixin",
	"./StackContainer",
	"./ContentPane",
	"dojo/text!./templates/AccordionButton.html",
	"../a11yclick" // AccordionButton template uses ondijitclick; not for keyboard, but for responsive touch.
], function(require, array, declare, fx, dom, domAttr, domClass, domConstruct, domGeometry, keys, lang, has, topic,
			focus, manager, ready, _Widget, _Container, _TemplatedMixin, _CssStateMixin, StackContainer, ContentPane, template){

	// module:
	//		dijit/layout/AccordionContainer


	// Design notes:
	//
	// An AccordionContainer is a StackContainer, but each child (typically ContentPane)
	// is wrapped in a _AccordionInnerContainer.   This is hidden from the caller.
	//
	// The resulting markup will look like:
	//
	//	<div class=dijitAccordionContainer>
	//		<div class=dijitAccordionInnerContainer>	(one pane)
	//				<div class=dijitAccordionTitle>		(title bar) ... </div>
	//				<div class=dijtAccordionChildWrapper>   (content pane) </div>
	//		</div>
	//	</div>
	//
	// Normally the dijtAccordionChildWrapper is hidden for all but one child (the shown
	// child), so the space for the content pane is all the title bars + the one dijtAccordionChildWrapper,
	// which on claro has a 1px border plus a 2px bottom margin.
	//
	// During animation there are two dijtAccordionChildWrapper's shown, so we need
	// to compensate for that.

	var AccordionButton = declare("dijit.layout._AccordionButton", [_Widget, _TemplatedMixin, _CssStateMixin], {
		// summary:
		//		The title bar to click to open up an accordion pane.
		//		Internal widget used by AccordionContainer.
		// tags:
		//		private

		templateString: template,

		// label: String
		//		Title of the pane
		label: "",
		_setLabelAttr: {node: "titleTextNode", type: "innerHTML" },

		// title: String
		//		Tooltip that appears on hover
		title: "",
		_setTitleAttr: {node: "titleTextNode", type: "attribute", attribute: "title"},

		// iconClassAttr: String
		//		CSS class for icon to left of label
		iconClassAttr: "",
		_setIconClassAttr: { node: "iconNode", type: "class" },

		baseClass: "dijitAccordionTitle",

		getParent: function(){
			// summary:
			//		Returns the AccordionContainer parent.
			// tags:
			//		private
			return this.parent;
		},

		buildRendering: function(){
			this.inherited(arguments);
			var titleTextNodeId = this.id.replace(' ', '_');
			domAttr.set(this.titleTextNode, "id", titleTextNodeId + "_title");
			this.focusNode.setAttribute("aria-labelledby", domAttr.get(this.titleTextNode, "id"));
			dom.setSelectable(this.domNode, false);
		},

		getTitleHeight: function(){
			// summary:
			//		Returns the height of the title dom node.
			return domGeometry.getMarginSize(this.domNode).h;	// Integer
		},

		// TODO: maybe the parent should set these methods directly rather than forcing the code
		// into the button widget?
		_onTitleClick: function(){
			// summary:
			//		Callback when someone clicks my title.
			var parent = this.getParent();
			parent.selectChild(this.contentWidget, true);
			focus.focus(this.focusNode);
		},

		_onTitleKeyDown: function(/*Event*/ evt){
			return this.getParent()._onKeyDown(evt, this.contentWidget);
		},

		_setSelectedAttr: function(/*Boolean*/ isSelected){
			this._set("selected", isSelected);
			this.focusNode.setAttribute("aria-expanded", isSelected ? "true" : "false");
			this.focusNode.setAttribute("aria-selected", isSelected ? "true" : "false");
			this.focusNode.setAttribute("tabIndex", isSelected ? "0" : "-1");
		}
	});

	if(has("dojo-bidi")){
		AccordionButton.extend({
			_setLabelAttr: function(label){
				this._set("label", label);
				domAttr.set(this.titleTextNode, "innerHTML", label);
				this.applyTextDir(this.titleTextNode);
			},

			_setTitleAttr: function(title){
				this._set("title", title);
				domAttr.set(this.titleTextNode, "title", title);
				this.applyTextDir(this.titleTextNode);
			}
		});
	}

	var AccordionInnerContainer = declare("dijit.layout._AccordionInnerContainer" + (has("dojo-bidi") ? "_NoBidi" : ""), [_Widget, _CssStateMixin], {
		// summary:
		//		Internal widget placed as direct child of AccordionContainer.containerNode.
		//		When other widgets are added as children to an AccordionContainer they are wrapped in
		//		this widget.

		/*=====
		 // buttonWidget: Function|String
		 //		Class to use to instantiate title
		 //		(Wish we didn't have a separate widget for just the title but maintaining it
		 //		for backwards compatibility, is it worth it?)
		 buttonWidget: null,
		 =====*/

		/*=====
		 // contentWidget: dijit/_WidgetBase
		 //		Pointer to the real child widget
		 contentWidget: null,
		 =====*/

		baseClass: "dijitAccordionInnerContainer",

		// tell nested layout widget that we will take care of sizing
		isLayoutContainer: true,

		buildRendering: function(){
			// Builds a template like:
			//	<div class=dijitAccordionInnerContainer>
			//		Button
			//		<div class=dijitAccordionChildWrapper>
			//			ContentPane
			//		</div>
			//	</div>

			// Create wrapper div, placed where the child is now
			this.domNode = domConstruct.place("<div class='" + this.baseClass +
				"' role='presentation'>", this.contentWidget.domNode, "after");

			// wrapper div's first child is the button widget (ie, the title bar)
			var child = this.contentWidget,
				cls = lang.isString(this.buttonWidget) ? lang.getObject(this.buttonWidget) : this.buttonWidget;
			this.button = child._buttonWidget = (new cls({
				contentWidget: child,
				label: child.title,
				title: child.tooltip,
				dir: child.dir,
				lang: child.lang,
				textDir: child.textDir || this.textDir,
				iconClass: child.iconClass,
				id: child.id + "_button",
				parent: this.parent
			})).placeAt(this.domNode);

			// and then the actual content widget (changing it from prior-sibling to last-child),
			// wrapped by a <div class=dijitAccordionChildWrapper>
			this.containerNode = domConstruct.place("<div class='dijitAccordionChildWrapper' role='tabpanel' style='display:none'>", this.domNode);
			this.containerNode.setAttribute("aria-labelledby", this.button.id);

			domConstruct.place(this.contentWidget.domNode, this.containerNode);
		},

		postCreate: function(){
			this.inherited(arguments);

			// Map changes in content widget's title etc. to changes in the button
			var button = this.button,
				cw = this.contentWidget;
			this._contentWidgetWatches = [
				cw.watch('title', lang.hitch(this, function(name, oldValue, newValue){
					button.set("label", newValue);
				})),
				cw.watch('tooltip', lang.hitch(this, function(name, oldValue, newValue){
					button.set("title", newValue);
				})),
				cw.watch('iconClass', lang.hitch(this, function(name, oldValue, newValue){
					button.set("iconClass", newValue);
				}))
			];
		},

		_setSelectedAttr: function(/*Boolean*/ isSelected){
			this._set("selected", isSelected);
			this.button.set("selected", isSelected);
			if(isSelected){
				var cw = this.contentWidget;
				if(cw.onSelected){
					cw.onSelected();
				}
			}
		},

		startup: function(){
			// Called by _Container.addChild()
			this.contentWidget.startup();
		},

		destroy: function(){
			this.button.destroyRecursive();

			array.forEach(this._contentWidgetWatches || [], function(w){
				w.unwatch();
			});

			delete this.contentWidget._buttonWidget;
			delete this.contentWidget._wrapperWidget;

			this.inherited(arguments);
		},

		destroyDescendants: function(/*Boolean*/ preserveDom){
			// since getChildren isn't working for me, have to code this manually
			this.contentWidget.destroyRecursive(preserveDom);
		}
	});

	if(has("dojo-bidi")){
		AccordionInnerContainer = declare("dijit.layout._AccordionInnerContainer", AccordionInnerContainer, {
			postCreate: function(){
				this.inherited(arguments);

				// Map changes in content widget's textdir to changes in the button
				var button = this.button;
				this._contentWidgetWatches.push(
					this.contentWidget.watch("textDir", function(name, oldValue, newValue){
						button.set("textDir", newValue);
					})
				);
			}
		});
	}

	var AccordionContainer = declare("dijit.layout.AccordionContainer", StackContainer, {
		// summary:
		//		Holds a set of panes where every pane's title is visible, but only one pane's content is visible at a time,
		//		and switching between panes is visualized by sliding the other panes up/down.
		// example:
		//	|	<div data-dojo-type="dijit/layout/AccordionContainer">
		//	|		<div data-dojo-type="dijit/layout/ContentPane" title="pane 1">
		//	|		</div>
		//	|		<div data-dojo-type="dijit/layout/ContentPane" title="pane 2">
		//	|			<p>This is some text</p>
		//	|		</div>
		//	|	</div>

		// duration: Integer
		//		Amount of time (in ms) it takes to slide panes
		duration: manager.defaultDuration,

		// buttonWidget: [const] String
		//		The name of the widget used to display the title of each pane
		buttonWidget: AccordionButton,

		/*=====
		 // _verticalSpace: Number
		 //		Pixels of space available for the open pane
		 //		(my content box size minus the cumulative size of all the title bars)
		 _verticalSpace: 0,
		 =====*/
		baseClass: "dijitAccordionContainer",

		buildRendering: function(){
			this.inherited(arguments);
			this.domNode.style.overflow = "hidden";		// TODO: put this in dijit.css
			this.domNode.setAttribute("role", "tablist");
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			if(this.selectedChildWidget){
				this.selectedChildWidget._wrapperWidget.set("selected", true);
			}
		},

		layout: function(){
			// Implement _LayoutWidget.layout() virtual method.
			// Set the height of the open pane based on what room remains.

			var openPane = this.selectedChildWidget;

			if(!openPane){
				return;
			}

			// space taken up by title, plus wrapper div (with border/margin) for open pane
			var wrapperDomNode = openPane._wrapperWidget.domNode,
				wrapperDomNodeMargin = domGeometry.getMarginExtents(wrapperDomNode),
				wrapperDomNodePadBorder = domGeometry.getPadBorderExtents(wrapperDomNode),
				wrapperContainerNode = openPane._wrapperWidget.containerNode,
				wrapperContainerNodeMargin = domGeometry.getMarginExtents(wrapperContainerNode),
				wrapperContainerNodePadBorder = domGeometry.getPadBorderExtents(wrapperContainerNode),
				mySize = this._contentBox;

			// get cumulative height of all the unselected title bars
			var totalCollapsedHeight = 0;
			array.forEach(this.getChildren(), function(child){
				if(child != openPane){
					// Using domGeometry.getMarginSize() rather than domGeometry.position() since claro has 1px bottom margin
					// to separate accordion panes.  Not sure that works perfectly, it's probably putting a 1px
					// margin below the bottom pane (even though we don't want one).
					totalCollapsedHeight += domGeometry.getMarginSize(child._wrapperWidget.domNode).h;
				}
			});
			this._verticalSpace = mySize.h - totalCollapsedHeight - wrapperDomNodeMargin.h
				- wrapperDomNodePadBorder.h - wrapperContainerNodeMargin.h - wrapperContainerNodePadBorder.h
				- openPane._buttonWidget.getTitleHeight();

			// Memo size to make displayed child
			this._containerContentBox = {
				h: this._verticalSpace,
				w: this._contentBox.w - wrapperDomNodeMargin.w - wrapperDomNodePadBorder.w
					- wrapperContainerNodeMargin.w - wrapperContainerNodePadBorder.w
			};

			if(openPane){
				openPane.resize(this._containerContentBox);
			}
		},

		_setupChild: function(child){
			// Overrides _LayoutWidget._setupChild().
			// Put wrapper widget around the child widget, showing title

			child._wrapperWidget = AccordionInnerContainer({
				contentWidget: child,
				buttonWidget: this.buttonWidget,
				id: child.id + "_wrapper",
				dir: child.dir,
				lang: child.lang,
				textDir: child.textDir || this.textDir,
				parent: this
			});

			this.inherited(arguments);

			// Since we are wrapping children in AccordionInnerContainer, replace the default
			// wrapper that we created in StackContainer.
			domConstruct.place(child.domNode, child._wrapper, "replace");
		},

		removeChild: function(child){
			// Overrides _LayoutWidget.removeChild().

			// Destroy wrapper widget first, before StackContainer.getChildren() call.
			// Replace wrapper widget with true child widget (ContentPane etc.).
			// This step only happens if the AccordionContainer has been started; otherwise there's no wrapper.
			// (TODO: since StackContainer destroys child._wrapper, maybe it can do this step too?)
			if(child._wrapperWidget){
				domConstruct.place(child.domNode, child._wrapperWidget.domNode, "after");
				child._wrapperWidget.destroy();
				delete child._wrapperWidget;
			}

			domClass.remove(child.domNode, "dijitHidden");

			this.inherited(arguments);
		},

		getChildren: function(){
			// Overrides _Container.getChildren() to return content panes rather than internal AccordionInnerContainer panes
			return array.map(this.inherited(arguments), function(child){
				return child.declaredClass == "dijit.layout._AccordionInnerContainer" ? child.contentWidget : child;
			}, this);
		},

		destroy: function(){
			if(this._animation){
				this._animation.stop();
			}
			array.forEach(this.getChildren(), function(child){
				// If AccordionContainer has been started, then each child has a wrapper widget which
				// also needs to be destroyed.
				if(child._wrapperWidget){
					child._wrapperWidget.destroy();
				}else{
					child.destroyRecursive();
				}
			});
			this.inherited(arguments);
		},

		_showChild: function(child){
			// Override StackContainer._showChild() to set visibility of _wrapperWidget.containerNode
			child._wrapperWidget.containerNode.style.display = "block";
			return this.inherited(arguments);
		},

		_hideChild: function(child){
			// Override StackContainer._showChild() to set visibility of _wrapperWidget.containerNode
			child._wrapperWidget.containerNode.style.display = "none";
			this.inherited(arguments);
		},

		_transition: function(/*dijit/_WidgetBase?*/ newWidget, /*dijit/_WidgetBase?*/ oldWidget, /*Boolean*/ animate){
			// Overrides StackContainer._transition() to provide sliding of title bars etc.

			if(has("ie") < 8){
				// workaround animation bugs by not animating; not worth supporting animation for IE6 & 7
				animate = false;
			}

			if(this._animation){
				// there's an in-progress animation.  speedily end it so we can do the newly requested one
				this._animation.stop(true);
				delete this._animation;
			}

			var self = this;

			if(newWidget){
				newWidget._wrapperWidget.set("selected", true);

				var d = this._showChild(newWidget);	// prepare widget to be slid in

				// Size the new widget, in case this is the first time it's being shown,
				// or I have been resized since the last time it was shown.
				// Note that page must be visible for resizing to work.
				if(this.doLayout && newWidget.resize){
					newWidget.resize(this._containerContentBox);
				}
			}

			if(oldWidget){
				oldWidget._wrapperWidget.set("selected", false);
				if(!animate){
					this._hideChild(oldWidget);
				}
			}

			if(animate){
				var newContents = newWidget._wrapperWidget.containerNode,
					oldContents = oldWidget._wrapperWidget.containerNode;

				// During the animation we will be showing two dijitAccordionChildWrapper nodes at once,
				// which on claro takes up 4px extra space (compared to stable AccordionContainer).
				// Have to compensate for that by immediately shrinking the pane being closed.
				var wrapperContainerNode = newWidget._wrapperWidget.containerNode,
					wrapperContainerNodeMargin = domGeometry.getMarginExtents(wrapperContainerNode),
					wrapperContainerNodePadBorder = domGeometry.getPadBorderExtents(wrapperContainerNode),
					animationHeightOverhead = wrapperContainerNodeMargin.h + wrapperContainerNodePadBorder.h;

				oldContents.style.height = (self._verticalSpace - animationHeightOverhead) + "px";

				this._animation = new fx.Animation({
					node: newContents,
					duration: this.duration,
					curve: [1, this._verticalSpace - animationHeightOverhead - 1],
					onAnimate: function(value){
						value = Math.floor(value);	// avoid fractional values
						newContents.style.height = value + "px";
						oldContents.style.height = (self._verticalSpace - animationHeightOverhead - value) + "px";
					},
					onEnd: function(){
						delete self._animation;
						newContents.style.height = "auto";
						oldWidget._wrapperWidget.containerNode.style.display = "none";
						oldContents.style.height = "auto";
						self._hideChild(oldWidget);
					}
				});
				this._animation.onStop = this._animation.onEnd;
				this._animation.play();
			}

			return d;	// If child has an href, promise that fires when the widget has finished loading
		},

		// note: we are treating the container as controller here
		_onKeyDown: function(/*Event*/ e, /*dijit/_WidgetBase*/ fromTitle){
			// summary:
			//		Handle keydown events
			// description:
			//		This is called from a handler on AccordionContainer.domNode
			//		(setup in StackContainer), and is also called directly from
			//		the click handler for accordion labels
			if(this.disabled || e.altKey || !(fromTitle || e.ctrlKey)){
				return;
			}
			var c = e.keyCode;
			if((fromTitle && (c == keys.LEFT_ARROW || c == keys.UP_ARROW)) ||
				(e.ctrlKey && c == keys.PAGE_UP)){
				this._adjacent(false)._buttonWidget._onTitleClick();
				e.stopPropagation();
				e.preventDefault();
			}else if((fromTitle && (c == keys.RIGHT_ARROW || c == keys.DOWN_ARROW)) ||
				(e.ctrlKey && (c == keys.PAGE_DOWN || c == keys.TAB))){
				this._adjacent(true)._buttonWidget._onTitleClick();
				e.stopPropagation();
				e.preventDefault();
			}
		}
	});

	// Back compat w/1.6, remove for 2.0
	if(has("dijit-legacy-requires")){
		ready(0, function(){
			var requires = ["dijit/layout/AccordionPane"];
			require(requires);	// use indirection so modules not rolled into a build
		});
	}

	// For monkey patching
	AccordionContainer._InnerContainer = AccordionInnerContainer;
	AccordionContainer._Button = AccordionButton;

	return AccordionContainer;
});

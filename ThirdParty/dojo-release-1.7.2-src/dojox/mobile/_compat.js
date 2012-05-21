define([
	"dojo/_base/array",	// array.forEach
	"dojo/_base/config",
	"dojo/_base/connect",	// connect.connect
	"dojo/_base/fx",	// fx.fadeOut, fx.fadeIn
	"dojo/_base/lang",	// lang.extend, lang.isArray
	"dojo/_base/sniff",		// has("webkit"), has("ie")
	"dojo/_base/window",	// win.doc, win.body
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/fx",
	"dojo/fx/easing",
	"dojo/ready",
	"dojo/uacss",
	"dijit/registry",	// registry.byNode
	"dojox/fx",
	"dojox/fx/flip",
	"./EdgeToEdgeList",
	"./IconContainer",
	"./RoundRect",
	"./RoundRectList",
	"./ScrollableView",
	"./Switch",
	"./View",
	"require"
], function(array, config, connect, bfx, lang, has, win, domClass, domConstruct, domStyle, fx, easing, ready, uacss, registry, xfx, flip, EdgeToEdgeList, IconContainer, RoundRect, RoundRectList, ScrollableView, Switch, View, require){

/*=====
	var EdgeToEdgeList = dojox.mobile.EdgeToEdgeList;
	var IconContainer = dojox.mobile.IconContainer;
	var RoundRect = dojox.mobile.RoundRect;
	var RoundRectList = dojox.mobile.RoundRectList;
	var ScrollableView = dojox.mobile.ScrollableView;
	var Switch = dojox.mobile.Switch;
	var View = dojox.mobile.View;
=====*/

	// module:
	//		dojox/mobile/compat
	// summary:
	//		CSS3 compatibility module
	// description:
	//		This module provides support for some of the CSS3 features to dojox.mobile
	//		for non-CSS3 browsers, such as IE or Firefox.
	//		If you load this module, it directly replaces some of the methods of
	//		dojox.mobile instead of subclassing. This way, html pages remains the same
	//		regardless of whether this compatibility module is used or not.
	//		Recommended usage is as follows. the code below loads dojox.mobile.compat
	//		only when isWebKit is true.
	//
	//		dojo.require("dojox.mobile");
	//		dojo.requireIf(!has("webkit"), "dojox.mobile.compat");
	//
	//		This module also loads compatibility CSS files, which has -compat.css
	//		suffix. You can use either the <link> tag or @import to load theme
	//		CSS files. Then, this module searches for the loaded CSS files and loads
	//		compatibility CSS files. For example, if you load iphone.css in a page,
	//		this module automatically loads iphone-compat.css.
	//		If you explicitly load iphone-compat.css with <link> or @import,
	//		this module will not load the already loaded file.

	var dm = lang.getObject("dojox.mobile", true);
	/*=====
	dm = dojox.mobile
	=====*/

	if(!has("webkit")){
		lang.extend(View, {
			_doTransition: function(fromNode, toNode, transition, dir){
				var anim;
				this.wakeUp(toNode);
				if(!transition || transition == "none"){
					toNode.style.display = "";
					fromNode.style.display = "none";
					toNode.style.left = "0px";
					this.invokeCallback();
				}else if(transition == "slide" || transition == "cover" || transition == "reveal"){
					var w = fromNode.offsetWidth;
					var s1 = fx.slideTo({
						node: fromNode,
						duration: 400,
						left: -w*dir,
						top: domStyle.get(fromNode, "top")
					});
					var s2 = fx.slideTo({
						node: toNode,
						duration: 400,
						left: 0,
						top: domStyle.get(toNode, "top")
					});
					toNode.style.position = "absolute";
					toNode.style.left = w*dir + "px";
					toNode.style.display = "";
					anim = fx.combine([s1,s2]);
					connect.connect(anim, "onEnd", this, function(){
						fromNode.style.display = "none";
						fromNode.style.left = "0px";
						toNode.style.position = "relative";
						var toWidget = registry.byNode(toNode);
						if(toWidget && !domClass.contains(toWidget.domNode, "out")){
							// Reset the temporary padding
							toWidget.containerNode.style.paddingTop = "";
						}
						this.invokeCallback();
					});
					anim.play();
				}else if(transition == "slidev" || transition == "coverv" || transition == "reavealv"){
					var h = fromNode.offsetHeight;
					var s1 = fx.slideTo({
						node: fromNode,
						duration: 400,
						left: 0,
						top: -h*dir
					});
					var s2 = fx.slideTo({
						node: toNode,
						duration: 400,
						left: 0,
						top: 0
					});
					toNode.style.position = "absolute";
					toNode.style.top = h*dir + "px";
					toNode.style.left = "0px";
					toNode.style.display = "";
					anim = fx.combine([s1,s2]);
					connect.connect(anim, "onEnd", this, function(){
						fromNode.style.display = "none";
						toNode.style.position = "relative";
						this.invokeCallback();
					});
					anim.play();
				}else if(transition == "flip"){
					anim = xfx.flip({
						node: fromNode,
						dir: "right",
						depth: 0.5,
						duration: 400
					});
					toNode.style.position = "absolute";
					toNode.style.left = "0px";
					connect.connect(anim, "onEnd", this, function(){
						fromNode.style.display = "none";
						toNode.style.position = "relative";
						toNode.style.display = "";
						this.invokeCallback();
					});
					anim.play();
				}else {
					// other transitions - "fade", "dissolve", "swirl"
					anim = fx.chain([
						bfx.fadeOut({
							node: fromNode,
							duration: 600
						}),
						bfx.fadeIn({
							node: toNode,
							duration: 600
						})
					]);
					toNode.style.position = "absolute";
					toNode.style.left = "0px";
					toNode.style.display = "";
					domStyle.set(toNode, "opacity", 0);
					connect.connect(anim, "onEnd", this, function(){
						fromNode.style.display = "none";
						toNode.style.position = "relative";
						domStyle.set(fromNode, "opacity", 1);
						this.invokeCallback();
					});
					anim.play();
				}
				dm.currentView = registry.byNode(toNode);
			},
		
			wakeUp: function(/*DomNode*/node){
				// summary:
				//		Function to force IE to redraw a node since its layout
				//		code tends to misrender in partial draws.
				// node: DomNode
				//		The node to forcibly redraw.
				// tags:
				//		public
				if(has("ie") && !node._wokeup){
					node._wokeup = true;
					var disp = node.style.display;
					node.style.display = "";
					var nodes = node.getElementsByTagName("*");
					for(var i = 0, len = nodes.length; i < len; i++){
						var val = nodes[i].style.display;
						nodes[i].style.display = "none";
						nodes[i].style.display = "";
						nodes[i].style.display = val;
					}
					node.style.display = disp;
				}
			}
		});	

	
		lang.extend(Switch, {
			_changeState: function(/*String*/state, /*Boolean*/anim){
				// summary:
				//		Function to toggle the switch state on the switch
				// state:
				//		The state to toggle, switch 'on' or 'off'
				// anim:
				//		Whether to use animation or not
				// tags:
				//		private
				var on = (state === "on");
		
				var pos;
				if(!on){
					pos = -this.inner.firstChild.firstChild.offsetWidth;
				}else{
					pos = 0;
				}
		
				this.left.style.display = "";
				this.right.style.display = "";
		
				var _this = this;
				var f = function(){
					domClass.remove(_this.domNode, on ? "mblSwitchOff" : "mblSwitchOn");
					domClass.add(_this.domNode, on ? "mblSwitchOn" : "mblSwitchOff");
					_this.left.style.display = on ? "" : "none";
					_this.right.style.display = !on ? "" : "none";
				};
		
				if(anim){
					var a = fx.slideTo({
						node: this.inner,
						duration: 300,
						left: pos,
						onEnd: f
					});
					a.play();
				}else{
					if(on || pos){
						this.inner.style.left = pos + "px";
					}
					f();
				}
			}
		});	

	
		if(has("ie")){
			lang.extend(RoundRect, {
				buildRendering: function(){
					// summary:
					//		Function to simulate the borderRadius appearance on
					//		IE, since IE does not support this CSS style.
					// tags:
					//		protected
					dm.createRoundRect(this);
					this.domNode.className = "mblRoundRect";
				}
			});


			RoundRectList._addChild = RoundRectList.prototype.addChild;
			lang.extend(RoundRectList, {
				buildRendering: function(){
					// summary:
					//		Function to simulate the borderRadius appearance on
					//		IE, since IE does not support this CSS style.
					// tags:
					//		protected
					dm.createRoundRect(this, true);
					this.domNode.className = "mblRoundRectList";
				},
			
				postCreate: function(){
					this.redrawBorders();
				},
		
				addChild: function(widget, /*Number?*/insertIndex){
					RoundRectList._addChild.apply(this, arguments);
					this.redrawBorders();
					if(dm.applyPngFilter){
						dm.applyPngFilter(widget.domNode);
					}
				},
			
				redrawBorders: function(){
					// summary:
					//		Function to adjust the creation of RoundRectLists on IE.
					//		Removed undesired styles.
					// tags:
					//		public
			
					// Remove a border of the last ListItem.
					// This is for browsers that do not support the last-child CSS pseudo-class.

					if(this instanceof EdgeToEdgeList){ return; }
					var lastChildFound = false;
					for(var i = this.containerNode.childNodes.length - 1; i >= 0; i--){
						var c = this.containerNode.childNodes[i];
						if(c.tagName == "LI"){
							c.style.borderBottomStyle = lastChildFound ? "solid" : "none";
							lastChildFound = true;
						}
					}
				}
			});	


			lang.extend(EdgeToEdgeList, {
				buildRendering: function(){
				this.domNode = this.containerNode = this.srcNodeRef || win.doc.createElement("UL");
					this.domNode.className = "mblEdgeToEdgeList";
				}
			});


			IconContainer._addChild = IconContainer.prototype.addChild;
			lang.extend(IconContainer, {
				addChild: function(widget, /*Number?*/insertIndex){
					IconContainer._addChild.apply(this, arguments);
					if(dm.applyPngFilter){
						dm.applyPngFilter(widget.domNode);
					}
				}
			});


			lang.mixin(dm, {
				createRoundRect: function(_this, isList){
					// summary:
					//		Function to adjust the creation of rounded rectangles on IE.
					//		Deals with IE's lack of borderRadius support
					// tags:
					//		public
					var i, len;
					_this.domNode = win.doc.createElement("DIV");
					_this.domNode.style.padding = "0px";
					_this.domNode.style.backgroundColor = "transparent";
					_this.domNode.style.border = "none"; // borderStyle = "none"; doesn't work on IE9
					_this.containerNode = win.doc.createElement(isList?"UL":"DIV");
					_this.containerNode.className = "mblRoundRectContainer";
					if(_this.srcNodeRef){
						_this.srcNodeRef.parentNode.replaceChild(_this.domNode, _this.srcNodeRef);
						for(i = 0, len = _this.srcNodeRef.childNodes.length; i < len; i++){
							_this.containerNode.appendChild(_this.srcNodeRef.removeChild(_this.srcNodeRef.firstChild));
						}
						_this.srcNodeRef = null;
					}
					_this.domNode.appendChild(_this.containerNode);
		
					for(i = 0; i <= 5; i++){
						var top = domConstruct.create("DIV");
						top.className = "mblRoundCorner mblRoundCorner"+i+"T";
						_this.domNode.insertBefore(top, _this.containerNode);
		
						var bottom = domConstruct.create("DIV");
						bottom.className = "mblRoundCorner mblRoundCorner"+i+"B";
						_this.domNode.appendChild(bottom);
					}
				}
			});


			lang.extend(ScrollableView, {
				postCreate: function(){
					// On IE, margin-top of the first child does not seem to be effective,
					// probably because padding-top is specified for containerNode
					// to make room for a fixed header. This dummy node is a workaround for that.
					var dummy = domConstruct.create("DIV", {className:"mblDummyForIE", innerHTML:"&nbsp;"}, this.containerNode, "first");
					domStyle.set(dummy, {
						position: "relative",
						marginBottom: "-2px",
						fontSize: "1px"
					});
				}
			});
		} // if	(has("ie"))


		if(has("ie") <= 6){
			dm.applyPngFilter = function(root){
				root = root || win.body();
				var nodes = root.getElementsByTagName("IMG");
				var blank = require.toUrl("dojo/resources/blank.gif");
				for(var i = 0, len = nodes.length; i < len; i++){
					var img = nodes[i];
					var w = img.offsetWidth;
					var h = img.offsetHeight;
					if(w === 0 || h === 0){
						// The reason why the image has no width/height may be because
						// display is "none". If that is the case, let's change the
						// display to "" temporarily and see if the image returns them.
						if(domStyle.get(img, "display") != "none"){ continue; }
						img.style.display = "";
						w = img.offsetWidth;
						h = img.offsetHeight;
						img.style.display = "none";
						if(w === 0 || h === 0){ continue; }
					}
					var src = img.src;
					if(src.indexOf("resources/blank.gif") != -1){ continue; }
					img.src = blank;
					img.runtimeStyle.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + src+"')";
					img.style.width = w + "px";
					img.style.height = h + "px";
				}
			};

			if(!dm._disableBgFilter && dm.createDomButton){
				dm._createDomButton_orig = dm.createDomButton;
				dm.createDomButton = function(/*DomNode*/refNode, /*Object?*/style, /*DomNode?*/toNode){
					var node = dm._createDomButton_orig.apply(this, arguments);
					if(node && node.className && node.className.indexOf("mblDomButton") !== -1){
						var f = function(){
							if(node.currentStyle && node.currentStyle.backgroundImage.match(/url.*(mblDomButton.*\.png)/)){
								var img = RegExp.$1;
								var src = require.toUrl("dojox/mobile/themes/common/domButtons/compat/") + img;
								node.runtimeStyle.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + src+"',sizingMethod='crop')";
								node.style.background = "none";
							}
						};
						setTimeout(f, 1000);
						setTimeout(f, 5000);
					}
					return node;
				};
			}
		} // if(has("ie") <= 6)

		dm.loadCssFile = function(/*String*/file){
			// summary:
			//		Overrides dojox.mobile.loadCssFile() defined in
			//		deviceTheme.js.
			if(!dm.loadedCssFiles){ dm.loadedCssFiles = []; }
			if(win.doc.createStyleSheet){
				// for some reason, IE hangs when you try to load
				// multiple css files almost at once.
				setTimeout(function(file){
					return function(){
						var ss = win.doc.createStyleSheet(file);
						ss && dm.loadedCssFiles.push(ss.owningElement);
					};
				}(file), 0);
			}else{
				dm.loadedCssFiles.push(domConstruct.create("LINK", {
					href: file,
					type: "text/css",
					rel: "stylesheet"
				}, win.doc.getElementsByTagName('head')[0]));
			}
		};

		dm.loadCss = function(/*String|Array*/files){
			// summary:
			//		Function to load and register CSS files with the page
			// files: String|Array
			//		The CSS files to load and register with the page.
			// tags:
			//		private
			if(!dm._loadedCss){
				var obj = {};
				array.forEach(dm.getCssPaths(), function(path){
					obj[path] = true;
				});
				dm._loadedCss = obj;
			}
			if(!lang.isArray(files)){ files = [files]; }
			for(var i = 0; i < files.length; i++){
				var file = files[i];
				if(!dm._loadedCss[file]){
					dm._loadedCss[file] = true;
					dm.loadCssFile(file);
				}
			}
		};

		dm.getCssPaths = function(){
			var paths = [];
			var i, j, len;

			// find @import
			var s = win.doc.styleSheets;
			for(i = 0; i < s.length; i++){
				if(s[i].href){ continue; }
				var r = s[i].cssRules || s[i].imports;
				if(!r){ continue; }
				for(j = 0; j < r.length; j++){
					if(r[j].href){
						paths.push(r[j].href);
					}
				}
			}
		
			// find <link>
			var elems = win.doc.getElementsByTagName("link");
			for(i = 0, len = elems.length; i < len; i++){
				if(elems[i].href){
					paths.push(elems[i].href);
				}
			}
			return paths;
		};

		dm.loadCompatPattern = /\/mobile\/themes\/.*\.css$/;

		dm.loadCompatCssFiles = function(/*Boolean?*/force){
			// summary:
			//		Function to perform page-level adjustments on browsers such as
			//		IE and firefox.  It loads compat specific css files into the
			//		page header.
			if(has("ie") && !force){
				setTimeout(function(){ // IE needs setTimeout
					dm.loadCompatCssFiles(true);
				}, 0);
			}
			dm._loadedCss = undefined;
			var paths = dm.getCssPaths();
			for(var i = 0; i < paths.length; i++){
				var href = paths[i];
				if((href.match(dm.loadCompatPattern) || location.href.indexOf("mobile/tests/") !== -1) && href.indexOf("-compat.css") === -1){
					var compatCss = href.substring(0, href.length-4)+"-compat.css";
					dm.loadCss(compatCss);
				}
			}
		};
	
		dm.hideAddressBar = function(/*Event?*/evt, /*Boolean?*/doResize){
			if(doResize !== false){ dm.resizeAll(); }
		};

		ready(function(){
			if(config["mblLoadCompatCssFiles"] !== false){
				dm.loadCompatCssFiles();
			}
			if(dm.applyPngFilter){
				dm.applyPngFilter();
			}
		});

	} // end of if(!has("webkit")){

	return dm;
});

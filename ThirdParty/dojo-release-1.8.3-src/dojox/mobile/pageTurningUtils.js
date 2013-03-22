define([
	"dojo/_base/kernel",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/event",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style"
], function(kernel, array, connect, event, domClass, domConstruct, domStyle){
	// module:
	//		dojox/mobile/pageTurningUtils
	
	kernel.experimental("dojox.mobile.pageTurningUtils");

	return function(){
		// summary:
		//		Utilities to provide page turning effects just like turning a real book.
		// example:
		// |	require([
		// |		"dojo/ready",
		// |		"dojox/mobile/pageTurningUtils"
		// |	], function(ready, pageTurningUtils){
		// |		var utils = new pageTurningUtils();
		// |		ready(function(){
		// |			utils.init(300, 400); // Specify width and height by pixels
		// |			utils.initCatalog(document.getElementById("catalog"));
		// |		});
		// |	);
		// |	<div id="catalog">
		// |		<div id="page1">
		// |			<div id="front1"><img src="img1.png"></div>
		// |			<div id="back1"><img src="img2.png"></div>
		// |		</div>
		// |		<div id="page2">
		// |			<div id="front2"><img src="img3.png"></div>
		// |			<div id="back2"><img src="img4.png"></div>
		// |		</div>
		// |		<div id="page3">
		// |			<div id="front3"><img src="img5.png"></div>
		// |			<div id="back3"></div>
		// |		</div>
		// |	</div>

		this.w = 0;
		this.h = 0;
		this.turnfrom = "top";
		this.page = 1;
		this.dogear = 1.0;
		this.duration = 2;
		this.alwaysDogeared = false;

		/* Internal properties */
		this._styleParams = {};
		this._catalogNode = null;
		this._currentPageNode = null;
		this._transitionEndHandle = null;

		this.init = function(/*int*/w, /*int*/h, /*String?*/turnfrom, 
							/*int?*/page, /*Number?*/dogear, /*Number?*/duration,
							/*Boolean?*/alwaysDogeared){
			// summary:
			//		Sets property values necessary for calculating the style parameters
			//		for page positioning and page turning effects.
			// w: int
			//		The width of each page by pixels. You cannot specify it by percentage.
			// h: int
			//		The height of each page by pixels. You cannot specify it by percentage.
			// turnfrom: String?
			//		Specifies from which side/corner the page turning starts. 
			//		You can choose from "top", "bottom" or "left". Defaults to "top".
			//		If "top", each page is turned from top-right corner of the page.
			//		If "bottom", each page is turned from bottom-right corner of the page.
			//		And if "left", each page is turned from top-left corner of the page.
			//		The page is shown as dog-eared except the case of "bottom".
			// page: int?
			//		The number of pages shown in the screen at a time.
			//		This parameter should be either of 1 or 2. Defaults to 1.
			//		If 1, the only one side of two facing pages are shown. 
			//		If 2, the two facing pages are shown at a time.
			// dogear: Number?
			//		The ratio of actual dog-ear width to the maximum dog-ear width which is
			//		11 percent of the page width (= 0.11 * w).
			//		This parameter should be a float number between 0 and 1. Defaults to 1.
			//		The actual dog-ear width is calculated by the following formula:
			// |		0.11 * w * dogear.
			//		This parameter is ignored if "bottom" is specified to turnfrom parameter.
			// duration: Number?
			//		The duration of page turning animations by seconds. (ex. 1.5, 3, etc)
			//		Defaults to 2.
			// alwaysDogeared: Boolean?
			//		Specifies whether all pages are always dog-eared or not.
			//		If true, all pages are always dog-eared.
			//		If false, only the current page is dog-eared while the others are not.
			//		This parameter is ignored if "bottom" is specified to turnfrom parameter.
			
			// Set property values
			this.w = w;
			this.h = h;
			this.turnfrom = turnfrom ? turnfrom : this.turnfrom;
			this.page = page ? page : this.page;
			this.dogear = typeof dogear !== 'undefined' ? dogear : this.dogear;
			this.duration = typeof duration !== 'undefined' ? duration : this.duration;
			this.alwaysDogeared = typeof alwaysDogeared !== 'undefined' ? alwaysDogeared : this.alwaysDogeared
			
			if(this.turnfrom === "bottom"){ // dog-ear is not supported if using "bottom"
				this.alwaysDogeared = true;
			}
			// Calculate style parameters for page positioning and page turning effects
			this._calcStyleParams();
		};

		this._calcStyleParams = function(){
			// tags:
			//		private
			var tan58 = Math.tan(58 * Math.PI/180),
				cos32 = Math.cos(32 * Math.PI/180),
				sin32 = Math.sin(32 * Math.PI/180),
				tan32 = Math.tan(32 * Math.PI/180),
				w = this.w,
				h = this.h,
				page = this.page,
				turnfrom = this.turnfrom,
				params = this._styleParams;
			
			// Calculate each div size and position based on the page turning algorithm
			//	 fw: frontWidth, fh: frontHeight, dw: dogear, cx: posX, cy: posY,
			//	 dx: dogearX, dy: dogearY, fy:actualPagePos
			var Q = fold = w * tan58,
				fw = Q * sin32 + Q * cos32 * tan58,
				fh = fold + w + w/tan58,
				dw = w * 0.11 * this.dogear,
				pw = w - dw,
				base = pw * cos32,
				cx, cy, dx, dy, fy; // These params depend on the types of "turnfrom" parameter
			
			switch(this.turnfrom){ // TODO Should separate each case as a plugin?
			case "top":
				cx = fw - base;
				cy = base * tan58;
				dx = fw - dw;
				dy = cy + pw/tan58 - 7;
				fy = cy/cos32;
				
				params.init = {
					page: {
						top: -fy + "px",
						left: (-fw + (page === 2 ? w : 0)) + "px",
						width: fw + "px",
						height: fh + "px",
						webkitTransformOrigin: "100% 0%"
					},
					front: {
						width: w + "px",
						height: h + "px",
						webkitBoxShadow: "0 0"
					},
					back: {
						width: w + "px",
						height: h + "px",
						webkitBoxShadow: "0 0"
					},
					shadow: {
						display: "",
						left: fw + "px",
						height: h * 1.5 + "px"
					}
				};
				params.turnForward = {
					page: {
						webkitTransform: "rotate(0deg)"
					},
					front: {
						webkitTransform: "translate("+ fw + "px," + fy +"px) rotate(0deg)",
						webkitTransformOrigin: "-110px -18px"
					},
					back: {
						webkitTransform: "translate("+ (fw - w) + "px," + fy +"px) rotate(0deg)",
						webkitTransformOrigin: "0px 0px"
					}
				};
				params.turnBackward = {
					page: {
						webkitTransform: "rotate(-32deg)"
					},
					front: {
						webkitTransform: "translate("+ cx + "px," + cy +"px) rotate(32deg)",
						webkitTransformOrigin: "0px 0px"
					},
					back: {
						webkitTransform: "translate("+ dx + "px," + dy +"px) rotate(-32deg)",
						webkitTransformOrigin: "0px 0px"
					}
				};
				break;
				
			case "bottom":
				cx = fw - (h * sin32 + w * cos32) - 2;
				cy = fh - (h + w/tan32) * cos32;
				dx = fw;
				dy = fh - w/sin32 - h;
				fy = fh - w/tan32 - h;
				
				params.init = {
					page: {
						top: (-fy + 50) + "px",
						left: (-fw + (page === 2 ? w : 0)) + "px",
						width: fw + "px",
						height: fh + "px",
						webkitTransformOrigin: "100% 100%"
					},
					front: {
						width: w + "px",
						height: h + "px",
						webkitBoxShadow: "0 0"
					},
					back: {
						width: w + "px",
						height: h + "px",
						webkitBoxShadow: "0 0"
					},
					shadow: {
						display: "none"
					}
				};
				params.turnForward = {
					page: {
						webkitTransform: "rotate(0deg)"
					},
					front: {
						webkitTransform: "translate("+ fw + "px," + fy +"px) rotate(0deg)",
						webkitTransformOrigin: "-220px 35px"
					},
					back: {
						webkitTransform: "translate("+ (w * 2) + "px," + fy +"px) rotate(0deg)",
						webkitTransformOrigin: "0px 0px"
					}
				};
				params.turnBackward = {
					page: {
						webkitTransform: "rotate(32deg)"
					},
					front: {
						webkitTransform: "translate("+ cx + "px," + cy +"px) rotate(-32deg)",
						webkitTransformOrigin: "0px 0px"
					},
					back: {
						webkitTransform: "translate("+ dx + "px," + dy +"px) rotate(0deg)",
						webkitTransformOrigin: "0px 0px"
					}
				};
				break;
				
			case "left":
				cx = -w;
				cy = pw/tan32 - 2;
				dx = -pw;
				dy = fy = pw/sin32 + dw * sin32;
				
				params.init = {
					page: {
						top: -cy + "px",
						left: w + "px",
						width: fw + "px",
						height: fh + "px",
						webkitTransformOrigin: "0% 0%"
					},
					front: {
						width: w + "px",
						height: h + "px",
						webkitBoxShadow: "0 0"
					},
					back: {
						width: w + "px",
						height: h + "px",
						webkitBoxShadow: "0 0"
					},
					shadow: {
						display: "",
						left: "-4px",
						height: ((page === 2 ? h * 1.5 : h) + 50) + "px"
					}
				};
				params.turnForward = {
					page: {
						webkitTransform: "rotate(0deg)"
					},
					front: {
						webkitTransform: "translate("+ cx + "px," + cy +"px) rotate(0deg)",
						webkitTransformOrigin: "160px 68px"
					},
					back: {
						webkitTransform: "translate(0px," + cy +"px) rotate(0deg)",
						webkitTransformOrigin: "0px 0px"
					}
				};
				params.turnBackward = {
					page: {
						webkitTransform: "rotate(32deg)"
					},
					front: {
						webkitTransform: "translate("+ (-dw) + "px," + dy +"px) rotate(-32deg)",
						webkitTransformOrigin: "0px 0px"
					},
					back: {
						webkitTransform: "translate("+ dx + "px," + dy +"px) rotate(32deg)",
						webkitTransformOrigin: "top right"
					}
				};
				break;
			}
			
			params.init.catalog = { // catalogNode
				width: (page === 2 ? w * 2 : w) + "px",
				height: ((page === 2 ? h * 1.5 : h) + (turnfrom == "top" ? 0 : 50)) + "px"
			};
		};

		this.getChildren = function(/*DomNode*/node){
			return array.filter(node.childNodes, function(n){ return n.nodeType === 1; });
		};

		this.getPages = function(){
			// summary:
			//		Get the array of all page nodes.
			return this._catalogNode ? this.getChildren(this._catalogNode) : null;
		};

		this.getCurrentPage = function(){
			// summary:
			//		Get the current page node.
			return this._currentPageNode;
		};

		this.getIndexOfPage = function(/*DomNode*/pageNode, /*DomNode[]?*/pages){
			if(!pages){
				pages = this.getPages();
			}
			for(var i=0; i<pages.length; i++){
				if(pageNode === pages[i]){ return i; }
			}
			return -1;
		};

		this.getNextPage = function(/*DomNode*/pageNode){
			for(var n = pageNode.nextSibling; n; n = n.nextSibling){
				if(n.nodeType === 1){ return n; }
			}
			return null;
		};

		this.getPreviousPage = function(/*DomNode*/pageNode){
			for(var n = pageNode.previousSibling; n; n = n.previousSibling){
				if(n.nodeType === 1){ return n; }
			}
			return null;
		};

		this.isPageTurned = function(/*DomNode*/pageNode){
			return pageNode.style.webkitTransform == "rotate(0deg)";
		};

		this._onPageTurned = function(e){
			event.stop(e);
			if(domClass.contains(e.target, "mblPageTurningPage")){
				this.onPageTurned(e.target);
			}
		};

		this.onPageTurned = function(/*DomNode*/ /*===== pageNode =====*/){
			// summary:
			//		Stub function to which your application connects 
			//		to handle the event when each page is tured 
			// description:
			//		Called just after each page is turned.
		};

		this.initCatalog = function(/*DomNode*/catalogNode){
			// summary:
			//		Initializes the specified catalog/book.
			// description:
			//		Apply style class and other various styles to the specified catalog node
			//		for initialization.
			//		This function must be called every time when property values
			//		are changed by calling this.init(...) function.
			// catalogNode: DOMNode
			//		The catalog node to be initialized.
			
			if(this._catalogNode != catalogNode){
				if(this._transitionEndHandle){
					connect.disconnect(this._transitionEndHandle);
				}
				this._transitionEndHandle = connect.connect(catalogNode, "webkitTransitionEnd", this, "_onPageTurned")
				this._catalogNode = catalogNode;
			}
			
			// Initialize catalog node
			domClass.add(catalogNode, "mblPageTurningCatalog");
			domStyle.set(catalogNode, this._styleParams.init.catalog);
			
			// Initialize child pages
			var pages = this.getPages();
			array.forEach(pages, function(pageNode){
				this.initPage(pageNode);
			}, this);
			
			this.resetCatalog();
		};

		this._getBaseZIndex = function(){
			// Check z-index of catalogNode
			return this._catalogNode.style.zIndex || 0;
		};

		this.resetCatalog = function(){
			// summary:
			//		Resets the catalog by adjust the state of child pages.
			// description:
			//		Adjust z-index and dog-ear show/hide state of each child page.
			//		This function must be called when you add a new page 
			//		or remove some page after initialization.
			
			// Adjust z-index and dog-ear of child pages
			var pages = this.getPages(),
				len = pages.length,
				base = this._getBaseZIndex();
			for(var i = len - 1; i>=0; i--){
				var pageNode = pages[i];
				this.showDogear(pageNode);
				if(this.isPageTurned(pageNode)){
					pageNode.style.zIndex = base + len + 1;
				}else{
					pageNode.style.zIndex = base + len - i;
					!this.alwaysDogeared && this.hideDogear(pageNode);
					this._currentPageNode = pageNode;
				}
			}
			if(!this.alwaysDogeared && this._currentPageNode != pages[len - 1]){
				this.showDogear(this._currentPageNode);
			}
		};

		this.initPage = function(/*DomNode*/pageNode, /*int?*/dir){
			// summary:
			//		Initializes the specified page.
			// description:
			//		Apply style class and other various styles to the specified page node
			//		for initialization.
			//		This function must be called when you add a new page after initialization.
			// pageNode: DOMNode
			//		The page node to be initialized.
			// dir: int?
			//		Specified whether the page is turned or not at initialization.
			//		This parameter should be either of 1 or -1.
			//		If 1, the page is turned at initialization. If -1, it is not turned.
			
			// Create shadow node if not exist
			var childNodes = this.getChildren(pageNode);
			while(childNodes.length < 3){
				pageNode.appendChild(domConstruct.create("div", null));
				childNodes = this.getChildren(pageNode);
			}
			
			// Check if it is the first time to initialize this page node or not
			var isFirst = !domClass.contains(pageNode, "mblPageTurningPage");
			
			// Apply style class
			domClass.add(pageNode, "mblPageTurningPage");
			domClass.add(childNodes[0], "mblPageTurningFront"); // frontNode
			domClass.add(childNodes[1], "mblPageTurningBack"); // backNode
			domClass.add(childNodes[2], "mblPageTurningShadow"); // shadowNode
			
			// Apply styles
			var p = this._styleParams.init;
			domStyle.set(pageNode, p.page);
			domStyle.set(childNodes[0], p.front); // frontNode
			domStyle.set(childNodes[1], p.back); // backNode
			p.shadow && domStyle.set(childNodes[2], p.shadow); // shadowNode
			
			if(!dir){
				// Determine whether to turn this page or not
				if(isFirst && this._currentPageNode){
					var pages = this.getPages();
					dir = this.getIndexOfPage(pageNode) < this.getIndexOfPage(this._currentPageNode) ? 1 : -1;
				}else{
					dir = this.isPageTurned(pageNode) ? 1 : -1;
				}
			}
			this._turnPage(pageNode, dir, 0);
		};

		this.turnToNext = function(/*Number?*/duration){
			// summary:
			//		Turns a page forward.
			// description:
			//		The current page is turned forward if it is not the last page of the book.
			// duration: Number?
			//		The duration of page turning animations by seconds. (ex. 1.5, 3, etc)
			//		If this parameter is omitted, this.duration property value is used.
			var nextPage = this.getNextPage(this._currentPageNode);
			if(nextPage){
				this._turnPage(this._currentPageNode, 1, duration);
				this._currentPageNode = nextPage;
			}
		};

		this.turnToPrev = function(/*Number?*/duration){
			// summary:
			//		Turns a page backward.
			// description:
			//		The current page is turned backward if it is not the first page of the book.
			// duration: Number?
			//		The duration of page turning animations by seconds. (ex. 1.5, 3, etc)
			//		If this parameter is omitted, this.duration property value is used.
			var prevPage = this.getPreviousPage(this._currentPageNode);
			if(prevPage){
				this._turnPage(prevPage, -1, duration);
				this._currentPageNode = prevPage;
			}
		};

		this.goTo = function(/*int*/index){
			// summary:
			//		Jumps to the specified page without page turning animations.
			// index: int
			//		The index of the page you want to jump to.
			var pages = this.getPages();
			if(this._currentPageNode === pages[index] || pages.length <= index) { return; }
			
			var goBackward = index < this.getIndexOfPage(this._currentPageNode, pages);
			while(this._currentPageNode !== pages[index]) {
				goBackward ? this.turnToPrev(0) : this.turnToNext(0);
			}
		};

		this._turnPage = function(/*DomNode*/pageNode, /*int*/dir, /*Number?*/duration){
			// tags:
			//		private
			var childNodes = this.getChildren(pageNode),
				d = ((typeof duration !== 'undefined') ? duration : this.duration) + "s",
				p = (dir === 1) ? this._styleParams.turnForward : this._styleParams.turnBackward;
			
			// Apply styles for page turning animations
			p.page.webkitTransitionDuration = d;
			domStyle.set(pageNode, p.page);
			
			p.front.webkitTransitionDuration = d;
			domStyle.set(childNodes[0], p.front); // frontNode
			
			p.back.webkitTransitionDuration = d;
			domStyle.set(childNodes[1], p.back); // backNode
			
			// Adjust z-index and dog-ear
			var pages = this.getPages(),
				nextPage = this.getNextPage(pageNode),
				len = pages.length,
				base = this._getBaseZIndex();
			if(dir === 1){
				pageNode.style.zIndex = base + len + 1;
				if(!this.alwaysDogeared && nextPage && this.getNextPage(nextPage)){
					this.showDogear(nextPage);
				}
			}else{
				if(nextPage){
					nextPage.style.zIndex = base + len - this.getIndexOfPage(nextPage, pages);
					!this.alwaysDogeared && this.hideDogear(nextPage);
				}
			}
		};

		this.showDogear = function(/*DomNode*/pageNode){
			// summary:
			//		Shows the dog-ear.
			var childNodes = this.getChildren(pageNode);;
			domStyle.set(pageNode, "overflow", "");
			childNodes[1] && domStyle.set(childNodes[1], "display", ""); // backNode
			childNodes[2] && domStyle.set(childNodes[2], "display", this.turnfrom === "bottom" ? "none" : ""); // shadowNode
		};

		this.hideDogear = function(/*DomNode*/pageNode){
			// summary:
			//		Hides the dog-ear.
			if(this.turnfrom === "bottom"){ return; }
			
			var childNodes = this.getChildren(pageNode);
			domStyle.set(pageNode, "overflow", "visible");
			childNodes[1] && domStyle.set(childNodes[1], "display", "none"); // backNode
			childNodes[2] && domStyle.set(childNodes[2], "display", "none"); // shadowNode
		};
	};
});

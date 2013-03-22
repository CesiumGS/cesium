define(["dojo/aspect", "dojo/_base/array", "dojo/_base/declare", "dojo/dom", "dojo/dom-attr", "dojo/dom-class", "dojo/dom-construct", "dojo/dom-geometry", "dojo/dom-style", "dojo/fx", "dojo/_base/kernel", "dojo/keys",
	"dojo/_base/lang", "dojo/on", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "./PagerItem", "dojo/text!./Pager/Pager.html"],
	function(aspect, array, declare, dom, attr, domClass, domConstruct, geometry, style, fx, kernel, keys, lang, on, _WidgetBase, _TemplatedMixin, PagerItem, template){

kernel.experimental("dojox.widget.Pager");

return declare("dojox.widget.Pager",
	[_WidgetBase, _TemplatedMixin],
	{
	// summary:
	//		A Pager, displaying a list of sized nodes


	templateString: template,


	// iconPrevious: String?
	//		The url of the previous page icon
	iconPrevious: "",

	// iconNext: String?
	//		The url of the next page icon
	iconNext: "",

	iconPage: require.toUrl("dojox/widget/Pager/images/pageInactive.png"),
	iconPageActive: require.toUrl("dojox/widget/Pager/images/pageActive.png"),

	// store: Object
	//		A dojo.data Data store
	store: null, // data store for items

	// orientation: String
	//		Either "horizontal or "vertical" to define the direction the pages will slide
	orientation: "horizontal", // or vertical

	// statusPos: String
	//		A string describing where to put the Pager "current page" indicator. Options are
	//		"leading" or "trailing". In the case of horiztonal orientation, "leading" indicates
	//		positioned above the PageItems. In the case of vertical, "leading" indicates "before".
	statusPos: "leading",

	// pagerPos: String
	//		TODOC
	pagerPos: "center",

	// duration: Integer
	//		Time in milliseconds to transition the pages
	duration: 500,

	// itemSpace: Integer
	//		Spacing between items? TODOC
	itemSpace: 2,

	// resizeChildren: Boolean
	//		TODOC
	resizeChildren: true,

	// itemClass: String|Widget
	//		The full dotted named of a Class or Widget constructor to use for the internal Pager Items.
	itemClass: PagerItem,

	// itemsPage: Integer
	//		The numbers of items to display in each "Page"
	itemsPage: 3,

	postMixInProperties: function(){
		var h = (this.orientation == "horizontal");
		lang.mixin(this,{
			_totalPages:0,
			_currentPage:1,
			dirClass: "pager" + (h ? "Horizontal" : "Vertical"),
			iconNext: require.toUrl("dojox/widget/Pager/images/" + (h ? "h" : "v") + "Next.png"),
			iconPrevious: require.toUrl("dojox/widget/Pager/images/" + (h ? "h" : "v") + "Previous.png")
		});
	},

	postCreate: function(){
		this.inherited(arguments);
		this.store.fetch({
			onComplete: lang.hitch(this, "_init")
		});

	},

	_a11yStyle: function(e){
		// summary:
		//		top level onfocus/onblur listen to set a class "pagerFocus" on some node
		//		and remove it onblur
		domClass.toggle(e.target, "pagerFocus", (e.type == "focus"));
	},

	_handleKey: function(e){
		// summary:
		//		Handle keyboard navigation internally

		var key = (e.charCode == keys.SPACE ? keys.SPACE : e.keyCode);
		switch(key){

			case keys.UP_ARROW:
			case keys.RIGHT_ARROW:
			case 110:
			case 78: // key "n"
				e.preventDefault();
				this._pagerNext();
				break;

			case keys.DOWN_ARROW:
			case keys.LEFT_ARROW:
			case 112:
			case 80: // key "p"
				e.preventDefault();
				this._pagerPrevious();
				break;

			case keys.ENTER:
				switch(e.target){
					case this.pagerNext : this._pagerNext(); break;
					case this.pagerPrevious : this._pagerPrevious(); break;
				}
				break;
		}
	},

	_init: function(items) {
		this.items = items;
		this._renderPages();
		this._renderStatus();
		this._renderPager();
	},

	generatePagerItem: function(/*item */ item, /* Number */ cnt){
		// summary:
		//		this method instantiates pagerItems to be used by the pager, it is overridable to allow
		//		customizing these items

		// only use getObject if its not the default _PagerItem value
		var itemClass = this.itemClass,
			pagerItem = (typeof itemClass == "string" ? lang.getObject(itemClass) : itemClass);

		var contentContainer = domConstruct.create('div', {
				innerHTML: item.content
			});

		return new pagerItem({
			  id: this.id + '-item-' + (cnt + 1)
		  }, contentContainer);
	},

	_renderPages: function(){
		var pcv = this.pagerContainerView,
			_h = (this.orientation == "horizontal");

		if(_h){
			var pagerH = geometry.getMarginBox(this.pagerContainerPager).h,
				statusH = geometry.getMarginBox(this.pagerContainerStatus).h;

			if (this.pagerPos != 'center'){
				var addonHeight = pagerH+statusH;
			}else{
				var addonHeight = statusH;

				var	widthSub = this.pagerIconNext.width,
					containerWidth = style.get(pcv, 'width'),
					newWidth = containerWidth-(2*widthSub);

				style.set(pcv, {
					width: newWidth+'px',
					marginLeft: this.pagerIconNext.width+'px',
					marginRight: this.pagerIconNext.width+'px'
				});
			}
			var totalH = style.get(this.pagerContainer, 'height') - addonHeight;
			style.set(this.pagerContainerView, 'height', totalH+'px');

			var itemSpace = Math.floor(style.get(pcv, 'width') / this.itemsPage);
			if(this.statusPos == 'trailing'){
				if(this.pagerPos != 'center'){
					style.set(pcv, 'marginTop', pagerH+'px');
				}
				style.set(pcv, 'marginBottom', statusH+'px');
			}else{
				style.set(pcv, 'marginTop', statusH+'px');
				if (this.pagerPos != 'center'){
					style.set(pcv, 'marginTop', pagerH+'px');
				}
			}
		}else{
			var pagerW = geometry.getMarginBox(this.pagerContainerPager).w,
				statusW = geometry.getMarginBox(this.pagerContainerStatus).w,
				containerW = style.get(this.pagerContainer, 'width');

			if(this.pagerPos != 'center'){
				var addonWidth = pagerW + statusW;
			}else{
				var addonWidth = statusW,
					heightSub = this.pagerIconNext.height,
					containerHeight = style.get(pcv, 'height'),
					newHeight = containerHeight - (2 * heightSub);

				style.set(pcv,{
					height: newHeight+'px',
					marginTop: this.pagerIconNext.height+'px',
					marginBottom: this.pagerIconNext.height+'px'
				});
			}
			var totalW = style.get(this.pagerContainer, 'width') - addonWidth;
			style.set(pcv, 'width', totalW+'px');

			var itemSpace = Math.floor(style.get(pcv, 'height') / this.itemsPage);
			if(this.statusPos == 'trailing'){
				if (this.pagerPos != 'center'){
					style.set(pcv, 'marginLeft', pagerW + 'px');
				}
				style.set(pcv, 'marginRight', statusW + 'px');
			}else{
				style.set(pcv, 'marginLeft', statusW + 'px');
				if(this.pagerPos != 'center'){
					style.set(pcv, 'marginRight', pagerW+'px');
				}
			}
		}
		var paddingLead = "padding" + (_h ? "Left" : "Top"),
			paddingTrail = "padding" + (_h ? "Right" : "Bottom");

		array.forEach(this.items, function(item, cnt){
			var pagerItem = this.generatePagerItem(item, cnt),
				containerProps = {};

			this.pagerItems.appendChild(pagerItem.domNode);

			containerProps[(_h ? "width" : "height")] = (itemSpace - this.itemSpace) + "px";
			var p = (_h ? "height" : "width");
			containerProps[p] = style.get(pcv, p) + "px";
			style.set(pagerItem.containerNode, containerProps);

			if(this.resizeChildren){
				pagerItem.resizeChildren();
			}
			pagerItem.parseChildren();

			// only display amount of items as defined in itemsPage
			style.set(pagerItem.domNode, "position", "absolute");

			if (cnt < this.itemsPage){
				var pos = (cnt) * itemSpace,
					trailingDir = (_h ? "left" : "top"),
					dir = (_h ? "top" : "left");

				style.set(pagerItem.domNode, dir, "0px");
				style.set(pagerItem.domNode, trailingDir, pos+"px");
			}else{
				style.set(pagerItem.domNode, "top", "-1000px");
				style.set(pagerItem.domNode, "left", "-1000px");
			}

			style.set(pagerItem.domNode, paddingTrail, (this.itemSpace/2)+"px");
			style.set(pagerItem.domNode, paddingLead, (this.itemSpace/2)+"px");

		}, this);
	},

	_renderPager: function() {
		var tcp = this.pagerContainerPager,
			zero = "0px",
			_h = (this.orientation == "horizontal");

		if(_h){

			if(this.statusPos == 'center'){

			}else if (this.statusPos == 'trailing'){
				style.set(tcp, 'top', zero);
			}else{
				style.set(tcp, 'bottom', zero);
			}
			style.set(this.pagerNext, 'right', zero);
			style.set(this.pagerPrevious, 'left', zero);

		}else{

			if (this.statusPos == 'trailing'){
				style.set(tcp, 'left', zero);
			}else{
				style.set(tcp, 'right', zero);
			}
			style.set(this.pagerNext, 'bottom', zero);
			style.set(this.pagerPrevious, 'top', zero);
		}

	},

	_renderStatus: function() {
		this._totalPages = Math.ceil(this.items.length / this.itemsPage);
		// FIXME!!
		this.iconWidth = 0;
		this.iconHeight = 0;
		this.iconsLoaded = 0;
		this._iconConnects = [];

		for (var i = 1; i <= this._totalPages; i++){
			var icon = new Image();

			var pointer = i;
			on(icon, 'click', lang.hitch(this, "_pagerSkip", pointer));

			this._iconConnects[pointer] = on(icon, 'load', lang.hitch(this, function(pointer){
				this.iconWidth += icon.width;
				this.iconHeight += icon.height;
				this.iconsLoaded++;

				if (this._totalPages == this.iconsLoaded){
					if (this.orientation == "horizontal"){
						if (this.statusPos == 'trailing'){
							if (this.pagerPos == 'center'){
								var containerHeight = style.get(this.pagerContainer, 'height'),
									statusHeight = style.get(this.pagerContainerStatus, 'height');

								style.set(this.pagerContainerPager, 'top', ((containerHeight/2)-(statusHeight/2))+'px');
							}
							style.set(this.pagerContainerStatus, 'bottom', '0px');
						}else{
							if (this.pagerPos == 'center'){
								var containerHeight = style.get(this.pagerContainer, 'height'),
									statusHeight = style.get(this.pagerContainerStatus, 'height');

								style.set(this.pagerContainerPager, 'bottom', ((containerHeight/2)-(statusHeight/2))+'px');
							}
							style.set(this.pagerContainerStatus, 'top', '0px');
						}

						var position = (style.get(this.pagerContainer, 'width')/2)-(this.iconWidth/2);
						style.set(this.pagerContainerStatus, 'paddingLeft', position+'px');
					}else{
						if (this.statusPos == 'trailing'){
							if (this.pagerPos == 'center'){
								var containerWidth = style.get(this.pagerContainer, 'width'),
									statusWidth = style.get(this.pagerContainerStatus, 'width');

								style.set(this.pagerContainerPager, 'left', ((containerWidth/2)-(statusWidth/2))+'px');
							}
							style.set(this.pagerContainerStatus, 'right', '0px');
						}else{
							if (this.pagerPos == 'center'){
								var containerWidth = style.get(this.pagerContainer, 'width'),
									statusWidth = style.get(this.pagerContainerStatus, 'width');

								style.set(this.pagerContainerPager, 'right', ((containerWidth/2)-(statusWidth/2))+'px');
							}
							style.set(this.pagerContainerStatus, 'left', '0px');
						}
						var position = (style.get(this.pagerContainer, 'height')/2)-(this.iconHeight/2);
						style.set(this.pagerContainerStatus, 'paddingTop', position+'px');
					}
				}
				this._iconConnects[pointer].remove();
			}, pointer));

			if (i==this._currentPage){
				icon.src=this.iconPageActive;
			}else{
				icon.src=this.iconPage;
			}
			var pointer = i;

			domClass.add(icon, this.orientation+'PagerIcon');
			attr.set(icon, 'id', this.id+'-status-'+i);
			this.pagerContainerStatus.appendChild(icon);

			if (this.orientation == "vertical"){
				style.set(icon, 'display', 'block');
			}
		}
	},

	_pagerSkip: function(page){
		if (this._currentPage == page){
			return;
		}else{
			// calculate whether to go left or right, take shortest way
			var distanceP; var distanceN;
			if (page < this._currentPage){
				distanceP = this._currentPage - page;
				distanceN = (this._totalPages + page) - this._currentPage;
			}else{
				distanceP = (this._totalPages + this._currentPage) - page;
				distanceN = page - this._currentPage;
			}

			var b = (distanceN > distanceP);
			this._toScroll = (b ? distanceP : distanceN);
			var cmd = (b ? "_pagerPrevious" : "_pagerNext"),
				handle = aspect.after(this, "onScrollEnd", lang.hitch(this, function(){
					this._toScroll--;
					if(this._toScroll < 1){
						handle.remove();
					}else{
						this[cmd]();
					}
				}), true);

			this[cmd]();
		}
	},

	_pagerNext: function(){
		if(this._anim) return;

		/**
		 * fade slide out current items
		 * make sure that next items are ligned up nicely before sliding them in
		 */
		var _anims = [];
		for (var i = this._currentPage * this.itemsPage; i > (this._currentPage - 1) * this.itemsPage; i--){
			if (!dom.byId(this.id+'-item-'+i)) continue;

			var currentItem = dom.byId(this.id+'-item-'+i);
			var marginBox = geometry.getMarginBox(currentItem);
			if (this.orientation == "horizontal") {
				var move = marginBox.l - (this.itemsPage * marginBox.w);
				_anims.push(fx.slideTo({node: currentItem, left: move, duration: this.duration}));
			}else{
				var move = marginBox.t - (this.itemsPage * marginBox.h);
				_anims.push(fx.slideTo({node: currentItem, top: move, duration: this.duration}));
			}

		}
		var previousPage = this._currentPage;
		if (this._currentPage == this._totalPages){
			this._currentPage = 1;
		}else{
			this._currentPage++;
		}

		var cnt = this.itemsPage;
		for (var i=this._currentPage*this.itemsPage; i>(this._currentPage-1)*this.itemsPage; i--){
			if (dom.byId(this.id+'-item-'+i)){
				var currentItem = dom.byId(this.id+'-item-'+i);
				var marginBox = geometry.getMarginBox(currentItem);
				if (this.orientation == "horizontal") {
					var newPos = (style.get(this.pagerContainerView, 'width')+((cnt-1)*marginBox.w))-1;
					style.set(currentItem, 'left', newPos+'px');
					style.set(currentItem, 'top', '0px');

					var move = newPos-(this.itemsPage*marginBox.w);
					_anims.push(fx.slideTo({node: currentItem, left: move, duration: this.duration}));
				}else{
					newPos = (style.get(this.pagerContainerView, 'height')+((cnt-1)*marginBox.h))-1;
					style.set(currentItem, 'top', newPos+'px');
					style.set(currentItem, 'left', '0px');

					var move = newPos-(this.itemsPage*marginBox.h);
					_anims.push(fx.slideTo({ node: currentItem, top: move, duration: this.duration}));
				}
			}
			cnt--;
		}

		this._anim = fx.combine(_anims);
		var animHandle = aspect.after(this._anim, "onEnd", lang.hitch(this, function(){
			delete this._anim;
			this.onScrollEnd();
			animHandle.remove();
		}), true);

		this._anim.play();

		// set pager icons
		dom.byId(this.id+'-status-'+previousPage).src = this.iconPage;
		dom.byId(this.id+'-status-'+this._currentPage).src = this.iconPageActive;
	},

	_pagerPrevious: function(){
		if(this._anim) return;

		var _anims = [];
		for (var i=this._currentPage*this.itemsPage; i>(this._currentPage-1)*this.itemsPage; i--){
				if (!dom.byId(this.id+'-item-'+i)) continue;

				var currentItem = dom.byId(this.id+'-item-'+i);
				var marginBox = geometry.getMarginBox(currentItem);
				if (this.orientation == "horizontal") {
						var move = style.get(currentItem, 'left')+(this.itemsPage*marginBox.w);
						_anims.push(fx.slideTo({node: currentItem, left: move, duration: this.duration}));
				}else{
						var move = style.get(currentItem, 'top')+(this.itemsPage*marginBox.h);
						_anims.push(fx.slideTo({node: currentItem, top: move, duration: this.duration}));
				}
		}

		var previousPage = this._currentPage;
		if (this._currentPage == 1){
				this._currentPage = this._totalPages;
		}else{
				this._currentPage--;
		}

		var cnt = this.itemsPage;
		var j=1;
		for (var i=this._currentPage*this.itemsPage; i>(this._currentPage-1)*this.itemsPage; i--){
			if(dom.byId(this.id+'-item-'+i)){
				var currentItem = dom.byId(this.id+'-item-'+i),
					marginBox = geometry.getMarginBox(currentItem);

				if (this.orientation == "horizontal") {
					var newPos = -(j * marginBox.w) + 1;
					style.set(currentItem, 'left', newPos+'px');
					style.set(currentItem, 'top', '0px');

					var move = ((cnt - 1) * marginBox.w);
					_anims.push(fx.slideTo({node: currentItem, left: move, duration: this.duration}));

					var move = newPos+(this.itemsPage * marginBox.w);
					_anims.push(fx.slideTo({node: currentItem, left: move, duration: this.duration}));
				}else{
					newPos = -((j * marginBox.h) + 1);
					style.set(currentItem, 'top', newPos+'px');
					style.set(currentItem, 'left', '0px');

					var move = ((cnt - 1) * marginBox.h);
					_anims.push(fx.slideTo({node: currentItem, top: move, duration: this.duration}));
				}

			}
			cnt--;
			j++;
		}

		this._anim = fx.combine(_anims);
		var animHandle = aspect.after(this._anim, "onEnd", lang.hitch(this, function(){
			delete this._anim;
			this.onScrollEnd();
			animHandle.remove();
		}), true);

		this._anim.play();

		// set pager icons
		dom.byId(this.id + '-status-' + previousPage).src = this.iconPage;
		dom.byId(this.id + '-status-' + this._currentPage).src = this.iconPageActive;

	},

	onScrollEnd: function(){
		// summary:
		//		Stub Function. Fired after the slide is complete. Override or connect.
	}

});

});

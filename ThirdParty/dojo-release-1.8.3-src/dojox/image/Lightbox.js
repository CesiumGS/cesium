define(["dojo", "dijit", "dojox", "dojo/text!./resources/Lightbox.html", "dijit/Dialog", "dojox/fx/_base"], function(dojo, dijit, dojox, template){

	dojo.experimental("dojox.image.Lightbox");
	dojo.getObject("image", true, dojox);

	dojo.declare("dojox.image.Lightbox", dijit._Widget, {
		// summary:
		//		A dojo-based Lightbox implementation.
		// description:
		//		An Elegant, keyboard accessible, markup and store capable Lightbox widget to show images
		//		in a modal dialog-esque format. Can show individual images as Modal dialog, or can group
		//		images with multiple entry points, all using a single "master" Dialog for visualization
		//
		//		key controls:
		//
		//		- ESC - close
		//		- Down Arrow / Rt Arrow / N - Next Image
		//		- Up Arrow / Lf Arrow / P - Previous Image
		// example:
		// |	<a href="image1.jpg" dojoType="dojox.image.Lightbox">show lightbox</a>
		// example:
		// |	<a href="image2.jpg" dojoType="dojox.image.Lightbox" group="one">show group lightbox</a>
		// |	<a href="image3.jpg" dojoType="dojox.image.Lightbox" group="one">show group lightbox</a>
		// example:
		// |	not implemented fully yet, though works with basic datastore access. need to manually call
		// |	widget._attachedDialog.addImage(item,"fromStore") for each item in a store result set.
		// |	<div dojoType="dojox.image.Lightbox" group="fromStore" store="storeName"></div>

		// group: String
		//		Grouping images in a page with similar tags will provide a 'slideshow' like grouping of images
		group: "",

		// title: String
		//		A string of text to be shown in the Lightbox beneath the image (empty if using a store)
		title: "",

		// href; String
		//		Link to image to use for this Lightbox node (empty if using a store).
		href: "",

		// duration: Integer
		//		Generic time in MS to adjust the feel of widget. could possibly add various
		//		durations for the various actions (dialog fadein, sizeing, img fadein ...)
		duration: 500,

		// modal: Boolean
		//		If true, this Dialog instance will be truly modal and prevent closing until
		//		explicitly told to by calling hide() or clicking the (x) - Defaults to false
		//		to preserve previous behaviors. (aka: enable click-to-close on the underlay)
		modal: false,

		// _allowPassthru: Boolean
		//		Privately set this to disable/enable natural link of anchor tags
		_allowPassthru: false,

		// _attachedDialog: dojox.image._LightboxDialog
		//		The pointer to the global lightbox dialog for this widget
		_attachedDialog: null, // try to share a single underlay per page?

		startup: function(){
			this.inherited(arguments);
			// setup an attachment to the masterDialog (or create the masterDialog)
			var tmp = dijit.byId('dojoxLightboxDialog');
			if(tmp){
				this._attachedDialog = tmp;
			}else{
				// this is the first instance to start, so we make the masterDialog
				this._attachedDialog = new dojox.image.LightboxDialog({ id: "dojoxLightboxDialog" });
				this._attachedDialog.startup();
			}
			if(!this.store){
				// FIXME: full store support lacking, have to manually call this._attachedDialog.addImage(imgage,group) as it stands
				this._addSelf();
				this.connect(this.domNode, "onclick", "_handleClick");
			}

		},

		_addSelf: function(){
			// summary:
			//		Add this instance to the master LightBoxDialog
			this._attachedDialog.addImage({
				href: this.href,
				title: this.title
			}, this.group || null);
		},

		_handleClick: function(/* Event */e){
			// summary:
			//		Handle the click on the link
			if(!this._allowPassthru){ e.preventDefault(); }
			else{ return; }
			this.show();
		},

		show: function(){
			// summary:
			//		Show the Lightbox with this instance as the starting point
			this._attachedDialog.show(this);
		},

		hide: function(){
			// summary:
			//		Hide the Lightbox currently showing
			this._attachedDialog.hide();
		},

		// FIXME: switch to .attr, deprecate eventually.
		disable: function(){
			// summary:
			//		Disables event clobbering and dialog, and follows natural link
			this._allowPassthru = true;
		},

		enable: function(){
			// summary:
			//		Enables the dialog (prevents default link)
			this._allowPassthru = false;
		},

		onClick: function(){
			// summary:
			//		Stub fired when the image in the lightbox is clicked.
		},

		destroy: function(){
			this._attachedDialog.removeImage(this);
			this.inherited(arguments);
		}

	});

	dojo.declare("dojox.image.LightboxDialog",
		dijit.Dialog, {
		// summary:
		//		The "dialog" shared	 between any Lightbox instances on the page, publically available
		//		for programmatic manipulation.
		// description:
		//		A widget that intercepts anchor links (typically around images)
		//		and displays a modal Dialog. this is the actual Dialog, which you can
		//		create and populate manually, though should use simple Lightbox's
		//		unless you need the direct access.
		//
		//		There should only be one of these on a page, so all dojox.image.Lightbox's will us it
		//		(the first instance of a Lightbox to be show()'n will create me If i do not exist)
		// example:
		//	|	// show a single image from a url
		//	|	var url = "http://dojotoolkit.org/logo.png";
		//	|	var dialog = new dojox.image.LightboxDialog().startup();
		//	|	dialog.show({ href: url, title:"My Remote Image"});

		// title: String
		//		The current title, read from object passed to show()
		title: "",

		// FIXME: implement titleTemplate

		// inGroup: Array
		//		Array of objects. this is populated by from the JSON object _groups, and
		//		should not be populate manually. it is a placeholder for the currently
		//		showing group of images in this master dialog
		inGroup: null,

		// imgUrl: String
		//		The src="" attribute of our imageNode (can be null at statup)
		imgUrl: dijit._Widget.prototype._blankGif,

		// errorMessage: String
		//		The text to display when an unreachable image is linked
		errorMessage: "Image not found.",

		// adjust: Boolean
		//		If true, ensure the image always stays within the viewport
		//		more difficult than necessary to disable, but enabled by default
		//		seems sane in most use cases.
		adjust: true,

		// modal: Boolean
		//		If true, this Dialog instance will be truly modal and prevent closing until
		//		explicitly told to by calling hide() or clicking the (x) - Defaults to false
		//		to preserve previous behaviors. (aka: enable click-to-close on the underlay)
		modal: false,
		
		// imageClass: String
		//		The classname to apply to the image node in the dialog (for extra styling)
		imageClass: "dojoxLightboxImage",

	/*=====
		// _groups: Object
		//		an object of arrays, each array (of objects) being a unique 'group'
		_groups: { XnoGroupX: [] },

	=====*/

		// errorImg: Url
		//		Path to the image used when a 404 is encountered
		errorImg: dojo.moduleUrl("dojox.image","resources/images/warning.png"),

		templateString: template, 
		
		constructor: function(args){
			this._groups = this._groups || (args && args._groups) || { XnoGroupX:[] };
		},

		startup: function(){
			// summary:
			//		Add some extra event handlers, and startup our superclass.
			// returns: dijit._Widget
			//		Perhaps the only `dijit._Widget` that returns itself to allow
			//		'chaining' or var referencing with .startup()

			this.inherited(arguments);

			this._animConnects = [];
			this.connect(this.nextButtonNode, "onclick", "_nextImage");
			this.connect(this.prevButtonNode, "onclick", "_prevImage");
			this.connect(this.closeButtonNode, "onclick", "hide");
			this._makeAnims();
			this._vp = dojo.window.getBox();
			return this;
		},

		show: function(/* Object */groupData){
			// summary:
			//		Show the Master Dialog. Starts the chain of events to show
			//		an image in the dialog, including showing the dialog if it is
			//		not already visible
			// groupData: Object
			//		needs href and title attributes. the values for this image.

			var _t = this; // size
			this._lastGroup = groupData;

			// we only need to call dijit.Dialog.show() if we're not already open.
			if(!_t.open){
				_t.inherited(arguments);
				_t._modalconnects.push(
					dojo.connect(dojo.global, "onscroll", this, "_position"),
					dojo.connect(dojo.global, "onresize", this, "_position"),
					dojo.connect(dojo.body(), "onkeypress", this, "_handleKey")
				);
				if(!groupData.modal){
					_t._modalconnects.push(
						dojo.connect(dijit._underlay.domNode, "onclick", this, "onCancel")
					);
				}
			}

			if(this._wasStyled){
				// ugly fix for IE being stupid. place the new image relative to the old
				// image to allow for overriden templates to adjust the location of the
				// titlebar. DOM will remain "unchanged" between views.
				var tmpImg = dojo.create("img", {
					className: _t.imageClass
				}, _t.imgNode, "after");
				dojo.destroy(_t.imgNode);
				_t.imgNode = tmpImg;
				_t._makeAnims();
				_t._wasStyled = false;
			}

			dojo.style(_t.imgNode,"opacity","0");
			dojo.style(_t.titleNode,"opacity","0");

			var src = groupData.href;

			if((groupData.group && groupData !== "XnoGroupX") || _t.inGroup){
				if(!_t.inGroup){
					_t.inGroup = _t._groups[(groupData.group)];
					// determine where we were or are in the show
					dojo.forEach(_t.inGroup, function(g, i){
						if(g.href == groupData.href){
							_t._index = i;
							//return false;
						}
						//return true;
					});
				}
				if(!_t._index){
					_t._index = 0;
					var sr = _t.inGroup[_t._index];
					src = (sr && sr.href) || _t.errorImg;
				}
				// FIXME: implement titleTemplate
				_t.groupCount.innerHTML = " (" + (_t._index + 1) + " of " + Math.max(1, _t.inGroup.length) + ")";
				_t.prevButtonNode.style.visibility = "visible";
				_t.nextButtonNode.style.visibility = "visible";
			}else{
				// single images don't have buttons, or counters:
				_t.groupCount.innerHTML = "";
				_t.prevButtonNode.style.visibility = "hidden";
				_t.nextButtonNode.style.visibility = "hidden";
			}
			if(!groupData.leaveTitle){
				_t.textNode.innerHTML = groupData.title;
			}
			_t._ready(src);
		},

		_ready: function(src){
			// summary:
			//		A function to trigger all 'real' showing of some src

			var _t = this;

			// listen for 404's:
			_t._imgError = dojo.connect(_t.imgNode, "error", _t, function(){
				dojo.disconnect(_t._imgError);
				// trigger the above onload with a new src:
				_t.imgNode.src = _t.errorImg;
				_t.textNode.innerHTML = _t.errorMessage;
			});

			// connect to the onload of the image
			_t._imgConnect = dojo.connect(_t.imgNode, "load", _t, function(e){
				_t.resizeTo({
					w: _t.imgNode.width,
					h: _t.imgNode.height,
					duration:_t.duration
				});
				// cleanup
				dojo.disconnect(_t._imgConnect);
				if(_t._imgError){
					dojo.disconnect(_t._imgError);
				}
			});

			_t.imgNode.src = src;
		},

		_nextImage: function(){
			// summary:
			//		Load next image in group
			if(!this.inGroup){ return; }
			if(this._index + 1 < this.inGroup.length){
				this._index++;
			}else{
				this._index = 0;
			}
			this._loadImage();
		},

		_prevImage: function(){
			// summary:
			//		Load previous image in group
			if(this.inGroup){
				if(this._index == 0){
					this._index = this.inGroup.length - 1;
				}else{
					this._index--;
				}
				this._loadImage();
			}
		},

		_loadImage: function(){
			// summary:
			//		Do the prep work before we can show another image
			this._loadingAnim.play(1);
		},

		_prepNodes: function(){
			// summary:
			//		A localized hook to accompany _loadImage
			this._imageReady = false;
			if(this.inGroup && this.inGroup[this._index]){
				this.show({
					href: this.inGroup[this._index].href,
					title: this.inGroup[this._index].title
				});
			}else{
				this.show({
					title: this.errorMessage,
					href: this.errorImg
				});
			}

		},

		_calcTitleSize: function(){
			var sizes = dojo.map(dojo.query("> *", this.titleNode).position(), function(s){ return s.h; });
			return { h: Math.max.apply(Math, sizes) };
		},

		resizeTo: function(/* Object */size, forceTitle){
			// summary:
			//		Resize our dialog container, and fire _showImage

			var adjustSize = dojo.boxModel == "border-box" ?
				dojo._getBorderExtents(this.domNode).w : 0,
				titleSize = forceTitle || this._calcTitleSize()
			;

			this._lastTitleSize = titleSize;

			if(this.adjust &&
				(size.h + titleSize.h + adjustSize + 80 > this._vp.h ||
				 size.w + adjustSize + 60 > this._vp.w
				)
			){
				this._lastSize = size;
				size = this._scaleToFit(size);
			}
			this._currentSize = size;

			var _sizeAnim = dojox.fx.sizeTo({
				node: this.containerNode,
				duration: size.duration||this.duration,
				width: size.w + adjustSize,
				height: size.h + titleSize.h + adjustSize
			});
			this.connect(_sizeAnim, "onEnd", "_showImage");
			_sizeAnim.play(15);
		},

		_scaleToFit: function(/* Object */size){
			// summary:
			//		resize an image to fit within the bounds of the viewport
			// size: Object
			//		The 'size' object passed around for this image

			var ns = {},   // New size
				nvp = {
					w: this._vp.w - 80,
					h: this._vp.h - 60 - this._lastTitleSize.h
				};	// New viewport

			// Calculate aspect ratio
			var viewportAspect = nvp.w / nvp.h,
				imageAspect = size.w / size.h;

			// Calculate new image size
			if(imageAspect >= viewportAspect){
				ns.h = nvp.w / imageAspect;
				ns.w = nvp.w;
			}else{
				ns.w = imageAspect * nvp.h;
				ns.h = nvp.h;
			}

			// we actually have to style this image, it's too big
			this._wasStyled = true;
			this._setImageSize(ns);

			ns.duration = size.duration;
			return ns; // Object
		},

		_setImageSize: function(size){
			// summary:
			//		Reset the image size to some actual size.
			var s = this.imgNode;
			s.height = size.h;
			s.width = size.w;
		},

		// clobber inherited function, it is useless.
		_size: function(){},

		_position: function(/* Event */e){
			// summary:
			//		we want to know the viewport size any time it changes
			this._vp = dojo.window.getBox();
			this.inherited(arguments);

			// determine if we need to scale up or down, if at all.
			if(e && e.type == "resize"){
				if(this._wasStyled){
					this._setImageSize(this._lastSize);
					this.resizeTo(this._lastSize);
				}else{
					if(this.imgNode.height + 80 > this._vp.h || this.imgNode.width + 60 > this._vp.h){
						this.resizeTo({
							w: this.imgNode.width, h: this.imgNode.height
						});
					}
				}
			}
		},

		_showImage: function(){
			// summary:
			//		Fade in the image, and fire showNav
			this._showImageAnim.play(1);
		},

		_showNav: function(){
			// summary:
			//		Fade in the footer, and setup our connections.
			var titleSizeNow = dojo.marginBox(this.titleNode);
			if(titleSizeNow.h > this._lastTitleSize.h){
				this.resizeTo(this._wasStyled ? this._lastSize : this._currentSize, titleSizeNow);
			}else{
				this._showNavAnim.play(1);
			}
		},

		hide: function(){
			// summary:
			//		Hide the Master Lightbox
			dojo.fadeOut({
				node: this.titleNode,
				duration: 200,
				// #5112 - if you _don't_ change the .src, safari will
				// _never_ fire onload for this image
				onEnd: dojo.hitch(this, function(){
					this.imgNode.src = this._blankGif;
				})
			}).play(5);

			this.inherited(arguments);

			this.inGroup = null;
			this._index = null;
		},

		addImage: function(child, group){
			// summary:
			//		Add an image to this Master Lightbox
			// child: Object
			//		The image information to add.
			//
			//		- href: String - link to image (required)
			//		- title: String - title to display
			// group: String?
			//		attach to group of similar tag or null for individual image instance

			var g = group;
			if(!child.href){ return; }
			if(g){
				if(!this._groups[g]){
					this._groups[g] = [];
				}
				this._groups[g].push(child);
			}else{ this._groups["XnoGroupX"].push(child); }
		},

		removeImage: function(/* Widget */child){
			// summary:
			//		Remove an image instance from this LightboxDialog.
			// child: Object
			//		A reference to the Lightbox child that was added (or an object literal)
			//		only the .href member is compared for uniqueness. The object may contain
			//		a .group member as well.

			var g = child.group || "XnoGroupX";
			dojo.every(this._groups[g], function(item, i, ar){
				if(item.href == child.href){
					ar.splice(i, 1);
					return false;
				}
				return true;
			});
		},

		removeGroup: function(group){
			// summary:
			//		Remove all images in a passed group
			if(this._groups[group]){ this._groups[group] = []; }
		},

		_handleKey: function(/* Event */e){
			// summary:
			//		Handle keyboard navigation internally
			if(!this.open){ return; }

			var dk = dojo.keys;
			switch(e.charOrCode){

				case dk.ESCAPE:
					this.hide();
					break;

				case dk.DOWN_ARROW:
				case dk.RIGHT_ARROW:
				case 78: // key "n"
					this._nextImage();
					break;

				case dk.UP_ARROW:
				case dk.LEFT_ARROW:
				case 80: // key "p"
					this._prevImage();
					break;
			}
		},

		_makeAnims: function(){
			// summary:
			//		make and cleanup animation and animation connections

			dojo.forEach(this._animConnects, dojo.disconnect);
			this._animConnects = [];
			this._showImageAnim = dojo.fadeIn({
					node: this.imgNode,
					duration: this.duration
				});
			this._animConnects.push(dojo.connect(this._showImageAnim, "onEnd", this, "_showNav"));
			this._loadingAnim = dojo.fx.combine([
					dojo.fadeOut({ node:this.imgNode, duration:175 }),
					dojo.fadeOut({ node:this.titleNode, duration:175 })
				]);
			this._animConnects.push(dojo.connect(this._loadingAnim, "onEnd", this, "_prepNodes"));
			this._showNavAnim = dojo.fadeIn({ node: this.titleNode, duration:225 });
		},

		onClick: function(groupData){
			// summary:
			//		a stub function, called with the currently displayed image as the only argument
		},

		_onImageClick: function(e){
			if(e && e.target == this.imgNode){
				this.onClick(this._lastGroup);
				// also fire the onclick for the Lightbox widget which triggered, if you
				// aren't working directly with the LBDialog
				if(this._lastGroup.declaredClass){
					this._lastGroup.onClick(this._lastGroup);
				}
			}
		}
	});
	

	return dojox.image.Lightbox;

});


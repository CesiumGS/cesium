dojo.provide("dojox.widget.FeedPortlet");
dojo.require("dojox.widget.Portlet");
dojo.require("dijit.Tooltip");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Button");
dojo.require("dojox.data.GoogleFeedStore");

dojo.declare("dojox.widget.FeedPortlet", dojox.widget.Portlet, {
	// summary:
	//		A Portlet that loads a XML feed.
	// description:
	//		The feed is displayed as
	//		an unordered list of links.	When a link is hovered over
	//		by the mouse, it displays a summary in a tooltip.

	// local: Boolean
	//		Specifies whether the feed is to be loaded from the same domain as the
	//		page, or a remote domain.	If local is true, then the feed must be an
	//		Atom feed.	If it is false, it can be an Atom or RSS feed.
	local: false,

	// maxResults: Number
	//		The number of results to display from the feed.
	maxResults: 5,

	// url: String
	//		The URL of the feed to load.	If this is different to the domain
	//		of the HTML page, local should be set to false.
	url: "",

	// openNew: Boolean
	//		If true, when a link is clicked it will open in a new window.
	//		If false, it will not.
	openNew: true,

	// useFeedTitle: Boolean
	//		If true, the title of the loaded feed is displayed in the title bar of the portlet.
	//		If false, the title remains unchanged.
	showFeedTitle: true,

	postCreate: function(){
		this.inherited(arguments);
		if(this.local && !dojox.data.AtomReadStore){
			throw Error(this.declaredClass + ": To use local feeds, you must include dojox.data.AtomReadStore on the page.");
		}
	},

	onFeedError: function(){
		// summary:
		//		Called when a feed fails to load successfully.
		this.containerNode.innerHTML = "Error accessing the feed."
	},

	addChild: function(child){
		this.inherited(arguments);
		var url = child.attr("feedPortletUrl");
		if(url){
			this.set("url", url);
		}
	},

	_getTitle: function(item){
		// summary:
		//		Gets the title of a feed item.
		var t = this.store.getValue(item, "title");
		return this.local ? t.text : t;
	},

	_getLink: function(item){
		// summary:
		//		Gets the href link of a feed item.
		var l = this.store.getValue(item, "link");
		return this.local ? l.href : l;
	},

	_getContent: function(item){
		// summary:
		//		Gets the summary of a feed item.
		var c = this.store.getValue(item, "summary");
		if(!c){
			return null;
		}
		if(this.local){
			c = c.text;
		}
		// Filter out any sneaky scripts in the code
		c = c.split("<script").join("<!--").split("</script>").join("-->");
		c = c.split("<iframe").join("<!--").split("</iframe>").join("-->");
		return c;

	},

	_setUrlAttr: function(url){
		// summary:
		//		Sets the URL to load.
		this.url = url;
		if(this._started){
			this.load();
		}
	},

	startup: function(){
		// summary:
		//		Loads the widget.
		if(this.started || this._started){return;}

		this.inherited(arguments);

		if(!this.url || this.url == ""){
			throw new Error(this.id + ": A URL must be specified for the feed portlet");
		}
		if(this.url && this.url != ""){
			this.load();
		}
	},

	load: function(){
		// summary:
		//		Loads the feed.
		if(this._resultList){
			dojo.destroy(this._resultList);
		}
		var store, query;

		// If the feed is on the same domain, use the AtomReadStore,
		// as we cannot be guaranteed that it will be available to
		// Google services.
		if(this.local){
			store = new dojox.data.AtomReadStore({
				url: this.url
			});
			query = {};

		}else{
			store = new dojox.data.GoogleFeedStore();
			query = {url: this.url};
		}
		var request = {
			query: query,
			count: this.maxResults,
			onComplete: dojo.hitch(this, function(items){
				if (this.showFeedTitle && store.getFeedValue) {
					var title = this.store.getFeedValue("title");
					if(title){
						this.set("title", title.text ? title.text : title);
					}
				}
				this.generateResults(items);
			}),
			onError: dojo.hitch(this, "onFeedError")
		};

		this.store = store;
		store.fetch(request);
	},

	generateResults: function (items){
		// summary:
		//		Generates a list of hyperlinks and displays a tooltip
		//		containing a summary when the mouse hovers over them.
		var store = this.store;
		var timer;
		var ul = (this._resultList =
			dojo.create("ul", {"class" : "dojoxFeedPortletList"}, this.containerNode));

		dojo.forEach(items, dojo.hitch(this, function(item){
			var li = dojo.create("li", {
				innerHTML: '<a href="'
					+ this._getLink(item)
					+ '"'
					+ (this.openNew ? ' target="_blank"' : '')
					+'>'
					+ this._getTitle(item) + '</a>'
			},ul);

			dojo.connect(li, "onmouseover", dojo.hitch(this, function(evt){
				if(timer){
					clearTimeout(timer);
				}

				// Show the tooltip after the mouse has been hovering
				// for a short time.
				timer = setTimeout(dojo.hitch(this, function(){
					timer = null;
					var summary = this._getContent(item);
					if(!summary){return;}
					var content = '<div class="dojoxFeedPortletPreview">'
						+ summary + '</div>'

					dojo.query("li", ul).forEach(function(item){
						if(item != evt.target){
							dijit.hideTooltip(item);
						}
					});

					// Hover the tooltip over the anchor tag
					dijit.showTooltip(content, li.firstChild, !this.isLeftToRight());
				}), 500);


			}));

			// Hide the tooltip when the mouse leaves a list item.
			dojo.connect(li, "onmouseout", function(){
				if(timer){
					clearTimeout(timer);
					timer = null;
				}
				dijit.hideTooltip(li.firstChild);
			});
		}));

		this.resize();
	}
});

dojo.declare("dojox.widget.ExpandableFeedPortlet", dojox.widget.FeedPortlet, {
	// summary:
	//		A FeedPortlet that uses an list of expandable links to display
	//		a feed.	An icon is placed to the left of each item
	//		which, when clicked, toggles the visible state
	//		of the item summary.

	// onlyOpenOne: Boolean
	//		If true, only a single item can be expanded at any given time.
	onlyOpenOne: false,

	generateResults: function(items){
		// summary:
		//		Generates a list of items, and places an icon beside them that
		//		can be used to show or hide a summary of that item.

		var store = this.store;
		var iconCls = "dojoxPortletToggleIcon";
		var collapsedCls = "dojoxPortletItemCollapsed";
		var expandedCls = "dojoxPortletItemOpen";

		var timer;
		var ul = (this._resultList = dojo.create("ul", {
			"class": "dojoxFeedPortletExpandableList"
		}, this.containerNode));

		// Create the LI elements.	Each LI has two DIV elements, the
		// top DIV contains the toggle icon and title, and the bottom
		// div contains the extended summary.
		dojo.forEach(items, dojo.hitch(this, dojo.hitch(this, function(item){
			var li = dojo.create("li", {"class": collapsedCls}, ul);
			var upper = dojo.create("div", {style: "width: 100%;"}, li);
			var lower = dojo.create("div", {"class": "dojoxPortletItemSummary", innerHTML: this._getContent(item)}, li);
			dojo.create("span", {
				"class": iconCls,
				innerHTML: "<img src='" + dojo.config.baseUrl + "/resources/blank.gif'>"}, upper);
			var a = dojo.create("a", {href: this._getLink(item), innerHTML: this._getTitle(item) }, upper);

			if(this.openNew){
				dojo.attr(a, "target", "_blank");
			}
		})));

		// Catch all clicks on the list. If a toggle icon is clicked,
		// toggle the visible state of the summary DIV.
		dojo.connect(ul, "onclick", dojo.hitch(this, function(evt){
			if(dojo.hasClass(evt.target, iconCls) || dojo.hasClass(evt.target.parentNode, iconCls)){
				dojo.stopEvent(evt);
				var li = evt.target.parentNode;
				while(li.tagName != "LI"){
					li = li.parentNode;
				}
				if(this.onlyOpenOne){
					dojo.query("li", ul).filter(function(item){
						return item != li;
					}).removeClass(expandedCls).addClass(collapsedCls);
				}
				var isExpanded = dojo.hasClass(li, expandedCls);
				dojo.toggleClass(li, expandedCls, !isExpanded);
				dojo.toggleClass(li, collapsedCls, isExpanded);
			}
		}));
	}
});


dojo.declare("dojox.widget.PortletFeedSettings",
	dojox.widget.PortletSettings, {

	// summary:
	//		A Settings widget designed to be used with a dojox.widget.FeedPortlet
	// description:
	//		It provides form items that the user can use to change the URL
	//		for a feed to load into the FeedPortlet.
	//		There are two forms that it can take.
	//
	//		The first is to display a text field, with Load and Cancel buttons,
	//		which is prepopulated with the enclosing FeedPortlet's URL.
	//		If a `<select>` DOM node is used as the source node for this widget,
	//		it displays a list of predefined URLs that the user can select from
	//		to load into the enclosing FeedPortlet.
	//
	// example:
	// |	<div dojoType="dojox.widget.PortletFeedSettings"></div>
	//
	// example:
	// |	<select dojoType="dojox.widget.PortletFeedSettings">
	// |		<option>http://www.dojotoolkit.org/aggregator/rss</option>
	// |		<option>http://dojocampus.org/content/category/podcast/feed/</option>
	// |	</select>

	"class" : "dojoxPortletFeedSettings",

	// urls: Array
	//		An array of JSON object specifying URLs to display in the
	//		PortletFeedSettings object. Each object contains a 'url' and 'label'
	//		attribute, e.g.
	//		[{url:'http:google.com', label:'Google'}, {url:'http://dojotoolkit.org', label: 'Dojo'}]
	urls: null,

	// selectedIndex: Number
	//		The selected URL. Defaults to zero.
	selectedIndex: 0,

	buildRendering: function(){
		// If JSON URLs have been specified, create a SELECT DOM node,
		// and insert the required OPTION elements.
		var s;
		if(this.urls && this.urls.length > 0){
			console.log(this.id + " -> creating select with urls ", this.urls)
			s = dojo.create("select");
			if(this.srcNodeRef){
				dojo.place(s, this.srcNodeRef, "before");
				dojo.destroy(this.srcNodeRef);
			}
			this.srcNodeRef = s;
			dojo.forEach(this.urls, function(url){
				dojo.create("option", {value: url.url || url, innerHTML: url.label || url}, s);
			});
		}

		// If the srcNodeRef is a SELECT node, then replace it with a DIV, and insert
		// the SELECT node into that div.
		if(this.srcNodeRef.tagName == "SELECT"){
			this.text = this.srcNodeRef;
			var div = dojo.create("div", {}, this.srcNodeRef, "before");
			div.appendChild(this.text);
			this.srcNodeRef = div;
			dojo.query("option", this.text).filter("return !item.value;").forEach("item.value = item.innerHTML");
			if(!this.text.value){
				if(this.content && this.text.options.length == 0){
					this.text.appendChild(this.content);
				}
				dojo.attr(s || this.text, "value", this.text.options[this.selectedIndex].value);
			}
		}
		this.inherited(arguments);
	},

	_setContentAttr: function(){

	},

	postCreate: function(){
		console.log(this.id + " -> postCreate");
		if(!this.text){
			// If a select node is not being used, create a new TextBox to
			// edit the URL.
			var text = this.text = new dijit.form.TextBox({});
			dojo.create("span", {
				innerHTML: "Choose Url: "
			}, this.domNode);
			this.addChild(text);
		}

		// Add a LOAD button
		this.addChild(new dijit.form.Button({
			label: "Load",
			onClick: dojo.hitch(this, function(){
				// Set the URL of the containing Portlet with the selected URL.
				this.portlet.attr("url",
					(this.text.tagName == "SELECT") ? this.text.value : this.text.attr('value'));
				if(this.text.tagName == "SELECT"){
					// Set the selected index on the Select node.
					dojo.some(this.text.options, dojo.hitch(this, function(opt, idx){
						if(opt.selected){
							this.set("selectedIndex", idx);
							return true;
						}
						return false;
					}));
				}
				// Hide the widget.
				this.toggle();
			})
		}));

		// Add a CANCEL button, which hides this widget
		this.addChild(new dijit.form.Button({
			label: "Cancel",
			onClick: dojo.hitch(this, "toggle")
		}));
		this.inherited(arguments);
	},

	startup: function(){
		// summary:
		//		Sets the portlet associated with this PortletSettings object.
		if(this._started){return;}
		console.log(this.id + " -> startup");
		this.inherited(arguments);

		if(!this.portlet){
			throw Error(this.declaredClass + ": A PortletFeedSettings widget cannot exist without a Portlet.");
		}
		if(this.text.tagName == "SELECT"){
			// Set the initial selected option.
			dojo.forEach(this.text.options, dojo.hitch(this, function(opt, index){
				dojo.attr(opt, "selected", index == this.selectedIndex);
			}));
		}
		var url = this.portlet.attr("url");
		if(url){
			// If a SELECT node is used to choose a URL, ensure that the Portlet's URL
			// is one of the options.
			if(this.text.tagName == "SELECT"){
				if(!this.urls && dojo.query("option[value='" + url + "']", this.text).length < 1){
					dojo.place(dojo.create("option", {
						value: url,
						innerHTML: url,
						selected: "true"
					}), this.text, "first");
				}
			}else{
				this.text.attr("value", url);
			}
		}else{
			this.portlet.attr("url", this.get("feedPortletUrl"));
		}
	},

	_getFeedPortletUrlAttr: function(){
		return this.text.value;
	}
});
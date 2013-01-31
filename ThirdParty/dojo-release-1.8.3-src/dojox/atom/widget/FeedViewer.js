define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/dom-class",
	"dijit/_Widget",
	"dijit/_Templated",
	"dijit/_Container",
	"../io/Connection",
	"dojo/text!./templates/FeedViewer.html",
	"dojo/text!./templates/FeedViewerEntry.html",
	"dojo/text!./templates/FeedViewerGrouping.html",
	"dojo/i18n!./nls/FeedViewerEntry"
], function (dojo, lang, arrayUtil, connect, declare, domClass, _Widget, _Templated, _Container, Connection, template, entryTemplate, groupingTemplate, i18nViewer) {
dojo.experimental("dojox.atom.widget.FeedViewer");

var FeedViewer = declare("dojox.atom.widget.FeedViewer", [_Widget, _Templated, _Container],{
	// summary:
	//		An ATOM feed viewer that allows for viewing a feed, deleting entries, and editing entries.

	feedViewerTableBody: null,	//The body of the feed viewer table so we can access it and populate it.  Will be assigned via template.
	feedViewerTable: null,		//The overal table container which contains the feed viewer table.  Will be assigned via template.
	entrySelectionTopic: "",	//The topic to broadcast when any entry is clicked so that a listener can pick up it and display it.
	url: "",					//The URL to which to connect to initially on creation.
	xmethod: false,
	localSaveOnly: false,

	//Templates for the HTML rendering.  Need to figure these out better, admittedly.
	templateString: template,

	_feed: null,
	_currentSelection: null, // Currently selected entry

	_includeFilters: null,

	alertsEnabled: false,

	postCreate: function(){
		// summary:
		//		The postCreate function.
		// description:
		//		The postCreate function.  Creates our AtomIO object for future interactions and subscribes to the
		//		event given in markup/creation.
		this._includeFilters = [];

		if(this.entrySelectionTopic !== ""){
			this._subscriptions = [dojo.subscribe(this.entrySelectionTopic, this, "_handleEvent")];
		}
		this.atomIO = new Connection();
		this.childWidgets = [];
	},
	
	startup: function(){
		// summary:
		//		The startup function.
		// description:
		//		The startup function.  Parses the filters and sets the feed based on the given url.
		this.containerNode = this.feedViewerTableBody;
		var children = this.getDescendants();
		for(var i in children){
			var child = children[i];
			if(child && child.isFilter){
				this._includeFilters.push(new FeedViewer.CategoryIncludeFilter(child.scheme, child.term, child.label));
				child.destroy();
			}
		}
		
		if(this.url !== ""){
			this.setFeedFromUrl(this.url);
		}
	},

	clear: function(){
		// summary:
		//		Function clearing all current entries in the feed view.
		// returns:
		//		Nothing.
		this.destroyDescendants();
	},

	setFeedFromUrl: function(/*string*/url){
		// summary:
		//		Function setting the feed from a URL which to get the feed.
		// url:
		//		The URL to the feed to load.
		// returns:
		//		Nothing.
		if(url !== ""){
			if(this._isRelativeURL(url)){
				var baseUrl = "";
				if(url.charAt(0) !== '/'){
					baseUrl = this._calculateBaseURL(window.location.href, true);
				}else{
					baseUrl = this._calculateBaseURL(window.location.href, false);
				}
				this.url = baseUrl + url;
			}

			this.atomIO.getFeed(url,lang.hitch(this,this.setFeed));
		}
	},


	setFeed: function(/*object*/feed){
		// summary:
		//		Function setting the dojox.atom.io.model.Feed data into the view.
		// entry:
		//		The dojox.atom.io.model.Feed object to process
		// returns:
		//		Nothing.
		this._feed = feed;
		this.clear();
		var entrySorter=function(a,b){
			var dispA = this._displayDateForEntry(a);
			var dispB = this._displayDateForEntry(b);
			if(dispA > dispB){return -1;}
			if(dispA < dispB){return 1;}
			return 0;
		};

		// This function may not be safe in different locales.
		var groupingStr = function(dateStr){
			var dpts = dateStr.split(',');
			
			dpts.pop(); // remove year and time
			return dpts.join(",");
		};
		var sortedEntries = feed.entries.sort(lang.hitch(this,entrySorter));
		if(feed){
			var lastSectionTitle = null;
			for(var i=0;i<sortedEntries.length;i++){
				
				var entry = sortedEntries[i];

				if(this._isFilterAccepted(entry)){
					var time = this._displayDateForEntry(entry);
					var sectionTitle = "";

					if(time !== null){
						sectionTitle = groupingStr(time.toLocaleString());

						if(sectionTitle === "" ){
							//Generally an issue on Opera with how its toLocaleString() works, so do a quick and dirty date construction M/D/Y
							sectionTitle = "" + (time.getMonth() + 1) + "/" + time.getDate() + "/" + time.getFullYear();
						}
					}
					if((lastSectionTitle === null) || (lastSectionTitle != sectionTitle)){
						this.appendGrouping(sectionTitle);
						lastSectionTitle = sectionTitle;
					}
					this.appendEntry(entry);
				}
			}
		}
	},

	_displayDateForEntry: function(/*object*/entry){
		// summary:
		//		Internal function for determining the appropriate date to display.
		// entry:
		//		The dojox.atom.io.model.Entry object to examine.
		// returns:
		//		An appropriate date for the feed viewer display.
		if(entry.updated){return entry.updated;}
		if(entry.modified){return entry.modified;}
		if(entry.issued){return entry.issued;}
		return new Date();
	},

	appendGrouping: function(/*string*/titleText){
		// summary:
		//		Function for appending a new grouping of entries to the feed view.
		// entry:
		//		The title of the new grouping to create on the view.
		// returns:
		//		Nothing.
		var entryWidget = new FeedViewerGrouping({});
		entryWidget.setText(titleText);
		this.addChild(entryWidget);
		this.childWidgets.push(entryWidget);
	},

	appendEntry: function(/*object*/entry){
		// summary:
		//		Function for appending an entry to the feed view.
		// entry:
		//		The dojox.atom.io.model.Entry object to append
		// returns:
		//		Nothing.
		var entryWidget = new FeedViewerEntry({"xmethod": this.xmethod});
		entryWidget.setTitle(entry.title.value);
		entryWidget.setTime(this._displayDateForEntry(entry).toLocaleTimeString());
		entryWidget.entrySelectionTopic = this.entrySelectionTopic;
		entryWidget.feed = this;
		this.addChild(entryWidget);
		this.childWidgets.push(entryWidget);
		this.connect(entryWidget, "onClick", "_rowSelected");
		entry.domNode = entryWidget.entryNode;
		
		//Need to set up a bi-directional reference here to control events between the two.
		entry._entryWidget = entryWidget;
		entryWidget.entry = entry;
	},
	
	deleteEntry: function(/*object*/entryRow){
		// summary:
		//		Function for deleting a row from the view
		if(!this.localSaveOnly){
			this.atomIO.deleteEntry(entryRow.entry, lang.hitch(this, this._removeEntry, entryRow), null, this.xmethod);
		}else{
			this._removeEntry(entryRow, true);
		}
		dojo.publish(this.entrySelectionTopic, [{ action: "delete", source: this, entry: entryRow.entry }]);
	},

	_removeEntry: function(/*FeedViewerEntry*/ entry, /* boolean */success){
		// summary:
		//		callback for when an entry is deleted from a feed.
		if(success){
			/* Check if this is the last Entry beneath the given date */
			var idx = arrayUtil.indexOf(this.childWidgets, entry);
			var before = this.childWidgets[idx-1];
			var after = this.childWidgets[idx+1];
			if( before.isInstanceOf(widget.FeedViewerGrouping) &&
				(after === undefined || after.isInstanceOf(widget.FeedViewerGrouping))){
				before.destroy();
			}
			
			/* Destroy the FeedViewerEntry to remove it from the view */
			entry.destroy();
		}else{}
	},
	
	_rowSelected: function(/*object*/evt){
		// summary:
		//		Internal function for handling the selection of feed entries.
		// evt:
		//		The click event that triggered a selection.
		// returns:
		//		Nothing.
		var selectedNode = evt.target;
		while(selectedNode){
			if(domClass.contains(selectedNode, 'feedViewerEntry')) {
				break;
			}
			selectedNode = selectedNode.parentNode;
		}

		for(var i=0;i<this._feed.entries.length;i++){
			var entry = this._feed.entries[i];
			if( (selectedNode === entry.domNode) && (this._currentSelection !== entry) ){
				//Found it and it isn't already selected.
				domClass.add(entry.domNode, "feedViewerEntrySelected");
				domClass.remove(entry._entryWidget.timeNode, "feedViewerEntryUpdated");
				domClass.add(entry._entryWidget.timeNode, "feedViewerEntryUpdatedSelected");

				this.onEntrySelected(entry);
				if(this.entrySelectionTopic !== ""){
					dojo.publish(this.entrySelectionTopic, [{ action: "set", source: this, feed: this._feed, entry: entry }]);
				}
				if(this._isEditable(entry)){
					entry._entryWidget.enableDelete();
				}

				this._deselectCurrentSelection();
				this._currentSelection = entry;
				break;
			}else if( (selectedNode === entry.domNode) && (this._currentSelection === entry) ){
				//Found it and it is the current selection, we just want to de-select it so users can 'unselect rows' if they want.
				dojo.publish(this.entrySelectionTopic, [{ action: "delete", source: this, entry: entry }]);
				this._deselectCurrentSelection();
				break;
			}
		}
	},

	_deselectCurrentSelection: function(){
		// summary:
		//		Internal function for unselecting the current selection.
		// returns:
		//		Nothing.
		if(this._currentSelection){
			domClass.add(this._currentSelection._entryWidget.timeNode, "feedViewerEntryUpdated");
			domClass.remove(this._currentSelection.domNode, "feedViewerEntrySelected");
			domClass.remove(this._currentSelection._entryWidget.timeNode, "feedViewerEntryUpdatedSelected");
			this._currentSelection._entryWidget.disableDelete();
			this._currentSelection = null;
		}
	},


	_isEditable: function(/*object*/entry){
		// summary:
		//		Internal function for determining of a particular entry is editable.
		// description:
		//		Internal function for determining of a particular entry is editable.
		//		This is used for determining if the delete action should be displayed or not.
		// entry:
		//		The dojox.atom.io.model.Entry object to examine
		// returns:
		//		Boolean denoting if the entry seems editable or not..
		var retVal = false;
		if(entry && entry !== null && entry.links && entry.links !== null){
			for(var x in entry.links){
				if(entry.links[x].rel && entry.links[x].rel == "edit"){
					retVal = true;
					break;
				}
			}
		}
		return retVal;
	},

	onEntrySelected: function(/*object*/entry){
		// summary:
		//		Function intended for over-riding/replacement as an attachpoint to for other items to recieve
		//		selection notification.
		// entry:
		//		The dojox.atom.io.model.Entry object selected.
		// returns:
		//		Nothing.
	},

	_isRelativeURL: function(/*string*/url){
		// summary:
		//		Method to determine if the URL is relative or absolute.
		// description:
		//		Method to determine if the URL is relative or absolute.  Basic assumption is if it doesn't start
		//		with http:// or file://, it's relative to the current document.
		// url:
		//		The URL to inspect.
		// returns:
		//		boolean indicating whether it's a relative url or not.
		var isFileURL = function(url){
			var retVal = false;
			if(url.indexOf("file://") === 0){
				retVal = true;
			}
			return retVal;
		};

		var isHttpURL = function(url){
			var retVal = false;
			if(url.indexOf("http://") === 0){
				retVal = true;
			}
			return retVal;
		};

		var retVal = false;
		if(url !== null){
			if(!isFileURL(url) && !isHttpURL(url)){
				retVal = true;
			}
		}
		return retVal;
	},

	_calculateBaseURL: function(/*string*/fullURL, /*boolean*/currentPageRelative){
		// summary:
		//		Internal function to calculate a baseline URL from the provided full URL.
		// fullURL:
		//		The full URL as a string.
		// currentPageRelative:
		//		Flag to denote of the base URL should be calculated as just the server base, or relative to the current page/location in the URL.
		// returns:
		//		String of the baseline URL
		var baseURL = null;
		if(fullURL !== null){
			//Check to see if we need to strip off any query parameters from the URL.
			var index = fullURL.indexOf("?");
			if(index != -1){
				fullURL = fullURL.substring(0,index);
				//console.debug("Removed query parameters.  URL now: " + fullURL);
			}

			if(currentPageRelative){
				//Relative to the 'current page' in the URL, so we need to trim that off.
				//Now we need to trim if necessary.  If it ends in /, then we don't have a filename to trim off
				//so we can return.
				index = fullURL.lastIndexOf("/");
				if((index > 0) && (index < fullURL.length) && (index !== (fullURL.length -1))){
					//We want to include the terminating /
					baseURL = fullURL.substring(0,(index + 1));
				}else{
					baseURL = fullURL;
				}
			}else{
				//We want to find the first occurance of / after the <protocol>://
				index = fullURL.indexOf("://");
				if(index > 0){
					index = index + 3;
					var protocol = fullURL.substring(0,index);
					var fragmentURL = fullURL.substring(index, fullURL.length);
					index = fragmentURL.indexOf("/");
					if((index < fragmentURL.length) && (index > 0) ){
						baseURL = protocol + fragmentURL.substring(0,index);
					}else{
						baseURL = protocol + fragmentURL;
					}
				}
			}
		}
		return baseURL;
	},

	_isFilterAccepted: function(/*object*/entry) {
		// summary:
		//		Internal function to do matching of category filters to widgets.
		// returns:
		//		boolean denoting if this entry matched one of the accept filters.
		var accepted = false;
		if (this._includeFilters && (this._includeFilters.length > 0)) {
			for (var i = 0; i < this._includeFilters.length; i++) {
				var filter = this._includeFilters[i];
				if (filter.match(entry)) {
					accepted = true;
					break;
				}
			}
		}
		else {
			accepted = true;
		}
		return accepted;
	},

	addCategoryIncludeFilter: function(/*object*/filter) {
		// summary:
		//		Function to add a filter for entry inclusion in the feed view.
		// filter:
		//		The basic items to filter on and the values.
		//		Should be of format: {scheme: ``some text or null``, term: ``some text or null``, label: ``some text or null``}
		// returns:
		//		Nothing.
		if (filter) {
			var scheme = filter.scheme;
			var term = filter.term;
			var label = filter.label;
			var addIt = true;

			if (!scheme) {
				scheme = null;
			}
			if (!term) {
				scheme = null;
			}
			if (!label) {
				scheme = null;
			}
			
			if (this._includeFilters && this._includeFilters.length > 0) {
				for (var i = 0; i < this._includeFilters.length; i++) {
					var eFilter = this._includeFilters[i];
					if ((eFilter.term === term) && (eFilter.scheme === scheme) && (eFilter.label === label)) {
						//Verify we don't have this filter already.
						addIt = false;
						break;
					}
				}
			}

			if (addIt) {
				this._includeFilters.push(widget.FeedViewer.CategoryIncludeFilter(scheme, term, label));
			}
		}
	},

	removeCategoryIncludeFilter: function(/*object*/filter) {
		// summary:
		//		Function to remove a filter for entry inclusion in the feed view.
		// filter:
		//		The basic items to identify the filter that is present.
		//		Should be of format: {scheme: ``some text or null``, term: ``some text or null``, label: ``some text or null``}
		// returns:
		//		Nothing.
		if (filter) {
			var scheme = filter.scheme;
			var term = filter.term;
			var label = filter.label;

			if (!scheme) {
				scheme = null;
			}
			if (!term) {
				scheme = null;
			}
			if (!label) {
				scheme = null;
			}
			
			var newFilters = [];
			if (this._includeFilters && this._includeFilters.length > 0) {
				for (var i = 0; i < this._includeFilters.length; i++) {
					var eFilter = this._includeFilters[i];
					if (!((eFilter.term === term) && (eFilter.scheme === scheme) && (eFilter.label === label))) {
						//Keep only filters that do not match
						newFilters.push(eFilter);
					}
				}
				this._includeFilters = newFilters;
			}
		}
	},

	_handleEvent: function(/*object*/entrySelectionEvent) {
		// summary:
		//		Internal function for listening to a topic that will handle entry notification.
		// entrySelectionEvent:
		//		The topic message containing the entry that was selected for view.
		// returns:
		//		Nothing.
		if(entrySelectionEvent.source != this) {
			if(entrySelectionEvent.action == "update" && entrySelectionEvent.entry) {
                var evt = entrySelectionEvent;
				if(!this.localSaveOnly){
					this.atomIO.updateEntry(evt.entry, lang.hitch(evt.source,evt.callback), null, true);
				}
				this._currentSelection._entryWidget.setTime(this._displayDateForEntry(evt.entry).toLocaleTimeString());
				this._currentSelection._entryWidget.setTitle(evt.entry.title.value);
			} else if(entrySelectionEvent.action == "post" && entrySelectionEvent.entry) {
				if(!this.localSaveOnly){
					this.atomIO.addEntry(entrySelectionEvent.entry, this.url, lang.hitch(this,this._addEntry));
				}else{
					this._addEntry(entrySelectionEvent.entry);
				}
			}
		}
	},
	
	_addEntry: function(/*object*/entry) {
		// summary:
		//		callback function used when adding an entry to the feed.
		// description:
		//		callback function used when adding an entry to the feed.  After the entry has been posted to the feed,
		//		we add it to our feed representation (to show it on the page) and publish an event to update any entry viewers.
		this._feed.addEntry(entry);
		this.setFeed(this._feed);
		dojo.publish(this.entrySelectionTopic, [{ action: "set", source: this, feed: this._feed, entry: entry }]);
	},

	destroy: function(){
		// summary:
		//		Destroys this widget, including all descendants and subscriptions.
		this.clear();
		arrayUtil.forEach(this._subscriptions, dojo.unsubscribe);
	}
});

var FeedViewerEntry = FeedViewer.FeedViewerEntry = declare("dojox.atom.widget.FeedViewerEntry", [_Widget, _Templated],{
	// summary:
	//		Widget for handling the display of an entry and specific events associated with it.

	templateString: entryTemplate,

	entryNode: null,
	timeNode: null,
	deleteButton: null,
	entry: null,
	feed: null,

	postCreate: function(){
		var _nlsResources = i18nViewer;
		this.deleteButton.innerHTML = _nlsResources.deleteButton;
	},

	setTitle: function(/*string*/text){
		// summary:
		//		Function to set the title of the entry.
		// text:
		//		The title.
		// returns:
		//		Nothing.
		if (this.titleNode.lastChild){this.titleNode.removeChild(this.titleNode.lastChild);}
		
		var titleTextNode = document.createElement("div");
		titleTextNode.innerHTML = text;
		this.titleNode.appendChild(titleTextNode);
	},

	setTime: function(/*string*/timeText){
		// summary:
		//		Function to set the time of the entry.
		// timeText:
		//		The string form of the date.
		// returns:
		//		Nothing.
		if (this.timeNode.lastChild){this.timeNode.removeChild(this.timeNode.lastChild);}
		var timeTextNode = document.createTextNode(timeText);
		this.timeNode.appendChild(timeTextNode);
	},

	enableDelete: function(){
		// summary:
		//		Function to enable the delete action on this entry.
		// returns:
		//		Nothing.
		if (this.deleteButton !== null) {
			//TODO Fix this
			this.deleteButton.style.display = 'inline';
		}
	},

	disableDelete: function(){
		// summary:
		//		Function to disable the delete action on this entry.
		// returns:
		//		Nothing.
		if (this.deleteButton !== null) {
			this.deleteButton.style.display = 'none';
		}
	},

	deleteEntry: function(/*object*/event) {
		// summary:
		//		Function to handle the delete event and delete the entry.
		// returns:
		//		Nothing.
		event.preventDefault();
		event.stopPropagation();
		this.feed.deleteEntry(this);
	},

	onClick: function(/*object*/e){
		// summary:
		//		Attach point for when a row is clicked on.
		// e:
		//		The event generated by the click.
	}
});

var FeedViewerGrouping = FeedViewer.FeedViewerGrouping = declare("dojox.atom.widget.FeedViewerGrouping", [_Widget, _Templated],{
	// summary:
	//		Grouping of feed entries.

	templateString: groupingTemplate,
	
	groupingNode: null,
	titleNode: null,

	setText: function(text){
		// summary:
		//		Sets the text to be shown above this grouping.
		// text:
		//		The text to show.
		if (this.titleNode.lastChild){this.titleNode.removeChild(this.titleNode.lastChild);}
		var textNode = document.createTextNode(text);
		this.titleNode.appendChild(textNode);
	}
});

FeedViewer.AtomEntryCategoryFilter = declare("dojox.atom.widget.AtomEntryCategoryFilter",  null,{
	// summary:
	//		A filter to be applied to the list of entries.
	scheme: "",
	term: "",
	label: "",
	isFilter: true
});

FeedViewer.CategoryIncludeFilter = declare("dojox.atom.widget.FeedViewer.CategoryIncludeFilter", null,{
	constructor: function(scheme, term, label){
		// summary:
		//		The initializer function.
		this.scheme = scheme;
		this.term = term;
		this.label = label;
	},

	match: function(entry) {
		// summary:
		//		Function to determine if this category filter matches against a category on an atom entry
		// returns:
		//		boolean denoting if this category filter matched to this entry.
		var matched = false;
		if (entry !== null) {
			var categories = entry.categories;
			if (categories !== null) {
				for (var i = 0; i < categories.length; i++) {
					var category = categories[i];

					if (this.scheme !== "") {
						if (this.scheme !== category.scheme) {
							break;
						}
					}
					
					if (this.term !== "") {
						if (this.term !== category.term) {
							break;
						}
					}

					if (this.label !== "") {
						if (this.label !== category.label) {
							break;
						}
					}
					//Made it this far, everything matched.
					matched = true;
				}
			}
		}
		return matched;
	}
});

return FeedViewer;
});
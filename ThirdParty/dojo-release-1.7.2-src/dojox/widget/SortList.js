dojo.provide("dojox.widget.SortList");
dojo.experimental("dojox.widget.SortList"); // level: prototype, designed for dijit.chat.demo

dojo.require("dijit.layout._LayoutWidget");
dojo.require("dijit._Templated");

dojo.declare("dojox.widget.SortList",
	[dijit.layout._LayoutWidget, dijit._Templated],
	{
	// summary: A sortable unordered-list with a fixed header for use in dijit.demos.chat
	//		for demonstration purposes only for now. feel free to make API suggestions
	//		or fixes.
	//
	// title: String
	//		The title in the header
	title: "",
	
	// heading: String
	//		In the event a parent container is expecting a title="" attribute, set it for the parent
	//		via title, and the title of this widget via heading="" ... assuming you want different
	//		titles for each. eg: TabContainer, AccordionContainer, etc.
	heading: "",

	// descending: Boolean
	//		Toggle sort order based on this value.
	descending: true,

	// selected: Array
	//		A list of the selected <li> nodes at any given time.
	selected: null,

	// sortable: Boolean
	//	toggle to enable/disable sorting
	sortable: true,

	// FIXME: this is really simple store support
	store: "",
	key: "name",
	
	baseClass: "dojoxSortList",

	templateString: dojo.cache("dojox.widget","SortList/SortList.html"),

	_addItem: function(item){
		dojo.create("li", {
			innerHTML: this.store.getValue(item, this.key).replace(/</g, "&lt;")
		}, this.containerNode);
	},

	postCreate: function(){
		if(this.store){
			this.store = dojo.getObject(this.store);
			var props = {
				onItem: dojo.hitch(this, "_addItem"),
				onComplete: dojo.hitch(this, "onSort")
			};
			this.store.fetch(props);
		}else{ this.onSort(); }
		this.inherited(arguments);
	},

	startup: function(){
		this.inherited(arguments);
		if(this.heading){
			this.setTitle(this.heading);
			this.title = this.heading;
		}
		// we cheat, and give the browser just enough time so we know our height
		setTimeout(dojo.hitch(this,"resize"), 5);
		if(this.sortable){ this.connect(this.titleNode,"onclick", "onSort"); }
	},

	resize: function(){
		// summary: do our additional calculations when resize() is called by or in a parent
		this.inherited(arguments);
		// FIXME:
		// the 10 comes from the difference between the contentBox and calculated height
		// because of badding and border extents. this shouldn't be done this way, a theme change will
		// break it: but we also don't want to run getComputedStyle or dojo.coords() every time resize()
		// is fired.
		var offset = ((this._contentBox.h) - (dojo.style(this.titleNode,"height")))-10;
		this.bodyWrapper.style.height = Math.abs(offset) + "px";
	},
	
	onSort: function(/* Event */e){
		// summary: sort the data, and style the nodes.

		var arr = dojo.query("li",this.domNode);
		if (this.sortable){
			this.descending = !this.descending;
			dojo.addClass(this.titleNode,((this.descending)?"sortListDesc":"sortListAsc"));
			dojo.removeClass(this.titleNode,((this.descending)?"sortListAsc":"sortListDesc"));
			arr.sort(this._sorter);
			if(this.descending){ arr.reverse(); }
		}
		var i=0;
		dojo.forEach(arr,function(item){
			dojo[(i++) % 2 === 0 ? "addClass" : "removeClass"](item,"sortListItemOdd");
			this.containerNode.appendChild(item);
		},this);
	},
	
	_set: function(/* Event */e){
		// summary: set hover state
		if(e.target !== this.bodyWrapper){
			dojo.addClass(e.target,"sortListItemHover");
		}
	},

	_unset: function(/* Event */e){
		// summary: remove hover state (FIXME: combine with _set?)
		dojo.removeClass(e.target,"sortListItemHover");
	},

	_handleClick: function(/* Event */e){
		// summary: click listener for data portion of widget. toggle selected state
		//	of node, and update this.selected array accordingly
		dojo.toggleClass(e.target,"sortListItemSelected");
		e.target.focus();
		this._updateValues(e.target.innerHTML);
	},

	_updateValues: function(){
		this._selected = dojo.query("li.sortListItemSelected", this.containerNode);
		this.selected = [];
		dojo.forEach(this._selected, function(node){
			this.selected.push(node.innerHTML);
		}, this);
		this.onChanged(arguments);
	},

	_sorter: function(a,b){
		// summary: a basic sort function, use query sort, or keep this?
		var aStr = a.innerHTML;
		var bStr = b.innerHTML;
		if(aStr>bStr){ return 1; }
		if(aStr<bStr){ return -1; }
		return 0;
	},

	setTitle: function(/* String */title){
		// summary: Sets the widget title to a String
		this.focusNode.innerHTML = this.title = title;
	},

	onChanged: function(){
		// summary: stub function, passes the last changed item, and is fired after current state
	}
	
});

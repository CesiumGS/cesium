dojo.provide("dojox.widget.FilePicker");

dojo.require("dojox.widget.RollingList");

dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.widget", "FilePicker");

dojo.declare("dojox.widget._FileInfoPane",
	[dojox.widget._RollingListPane], {
	// summary: a pane to display the information for the currently-selected
	//	file
	
	// templateString: string
	//	delete our template string
	templateString: "",
	
	// templateString: String
	//		The template to be used to construct the widget.
	templateString: dojo.cache("dojox.widget", "FilePicker/_FileInfoPane.html"),
	
	postMixInProperties: function(){
		this._messages = dojo.i18n.getLocalization("dojox.widget", "FilePicker", this.lang);
		this.inherited(arguments);
	},

	onItems: function(){
		// summary:
		//	called after a fetch or load - at this point, this.items should be
		//  set and loaded.
		var store = this.store, item = this.items[0];
		if(!item){
			this._onError("Load", new Error("No item defined"));
		}else{
			this.nameNode.innerHTML = store.getLabel(item);
			this.pathNode.innerHTML = store.getIdentity(item);
			this.sizeNode.innerHTML = store.getValue(item, "size");
			this.parentWidget.scrollIntoView(this);
			this.inherited(arguments);
		}
	}
});

dojo.declare("dojox.widget.FilePicker", dojox.widget.RollingList, {
	// summary: a specialized version of RollingList that handles file information
	//  in a store
	
	className: "dojoxFilePicker",
	
	// pathSeparator: string
	//  Our file separator - it will be guessed if not set
	pathSeparator: "",
	
	// topDir: string
	//	The top directory string - it will be guessed if not set
	topDir: "",
		
	// parentAttr: string
	//	the attribute to read for finding our parent directory
	parentAttr: "parentDir",
	
	// pathAttr: string
	//  the attribute to read for getting the full path of our file
	pathAttr: "path",
	
	// preloadItems: boolean or int
	//  Set this to a sane number - since we expect to mostly be using the
	//	dojox.data.FileStore - which doesn't like loading lots of items
	//	all at once.
	preloadItems: 50,

	// selectDirectories: boolean
	//  whether or not we allow selection of directories - that is, whether or
	//  our value can be set to a directory.
	selectDirectories: true,

	// selectFiles: boolean
	//  whether or not we allow selection of files - that is, we will disable
	//  the file entries.
	selectFiles: true,

	_itemsMatch: function(/*item*/ item1, /*item*/ item2){
		// Summary: returns whether or not the two items match - checks ID if
		//  they aren't the exact same object - ignoring trailing slashes
		if(!item1 && !item2){
			return true;
		}else if(!item1 || !item2){
			return false;
		}else if(item1 == item2){
			return true;
		}else if (this._isIdentity){
			var iArr = [ this.store.getIdentity(item1), this.store.getIdentity(item2) ];
			dojo.forEach(iArr, function(i, idx){
				if(i.lastIndexOf(this.pathSeparator) == (i.length - 1)){
					iArr[idx] = i.substring(0, i.length - 1);
				}else{
				}
			}, this);
			return (iArr[0] == iArr[1]);
		}
		return false;
	},
	
	startup: function(){
		if(this._started){ return; }
		this.inherited(arguments);
		// Figure out our file separator if we don't have it yet
		var conn, child = this.getChildren()[0];
		var setSeparator = dojo.hitch(this, function(){
			if(conn){
				this.disconnect(conn);
			}
			delete conn;
			var item = child.items[0];
			if(item){
				var store = this.store;
				var parent = store.getValue(item, this.parentAttr);
				var path = store.getValue(item, this.pathAttr);
				this.pathSeparator = this.pathSeparator || store.pathSeparator;
				if(!this.pathSeparator){
					this.pathSeparator = path.substring(parent.length, parent.length + 1);
				}
				if(!this.topDir){
					this.topDir = parent;
					if(this.topDir.lastIndexOf(this.pathSeparator) != (this.topDir.length - 1)){
						this.topDir += this.pathSeparator;
					}
				}
			}
		});
		if(!this.pathSeparator || !this.topDir){
			if(!child.items){
				conn = this.connect(child, "onItems", setSeparator);
			}else{
				setSeparator();
			}
		}
	},
	
	getChildItems: function(item){
		var ret = this.inherited(arguments);
		if(!ret && this.store.getValue(item, "directory")){
			// It's an empty directory - so pass through an empty array
			ret = [];
		}
		return ret;
	},
	
	getMenuItemForItem: function(/*item*/ item, /* dijit._Contained */ parentPane, /* item[]? */ children){
		var menuOptions = {iconClass: "dojoxDirectoryItemIcon"};
		if(!this.store.getValue(item, "directory")){
			menuOptions.iconClass = "dojoxFileItemIcon";
			var l = this.store.getLabel(item), idx = l.lastIndexOf(".");
			if(idx >= 0){
				menuOptions.iconClass += " dojoxFileItemIcon_" + l.substring(idx + 1);
			}
			if(!this.selectFiles){
				menuOptions.disabled = true;
			}
		}
		var ret = new dijit.MenuItem(menuOptions);
		return ret;
	},
	
	getPaneForItem: function(/*item*/ item, /* dijit._Contained */ parentPane, /* item[]? */ children){
		var ret = null;
		if(!item || (this.store.isItem(item) && this.store.getValue(item, "directory"))){
			ret = new dojox.widget._RollingListGroupPane({});
		}else if(this.store.isItem(item) && !this.store.getValue(item, "directory")){
			ret = new dojox.widget._FileInfoPane({});
		}
		return ret;
	},
	
	_setPathValueAttr: function(/*string*/ path, /*boolean?*/ resetLastExec, /*function?*/ onSet){
		// Summary: sets the value of this widget based off the given path
		if(!path){
			this.set("value", null);
			return;
		}
		if(path.lastIndexOf(this.pathSeparator) == (path.length - 1)){
			path = path.substring(0, path.length - 1);
		}
		this.store.fetchItemByIdentity({identity: path,
										onItem: function(v){
											if(resetLastExec){
												this._lastExecutedValue = v;
											}
											this.set("value", v);
											if(onSet){ onSet(); }
										},
										scope: this});
	},
	
	_getPathValueAttr: function(/*item?*/val){
		// summary: returns the path value of the given value (or current value
		//  if not passed a value)
		if(!val){
			val = this.value;
		}
		if(val && this.store.isItem(val)){
			return this.store.getValue(val, this.pathAttr);
		}else{
			return "";
		}
	},
	
	_setValue: function(/* item */ value){
		// summary: internally sets the value and fires onchange
		delete this._setInProgress;
		var store = this.store;
		if(value && store.isItem(value)){
			var isDirectory = this.store.getValue(value, "directory");
			if((isDirectory && !this.selectDirectories) ||
				(!isDirectory && !this.selectFiles)){ return; }
		}else{
			value = null;
		}
		if(!this._itemsMatch(this.value, value)){
			this.value = value;
			this._onChange(value);
		}
	}
});
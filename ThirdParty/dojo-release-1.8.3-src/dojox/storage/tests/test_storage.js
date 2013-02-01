dojo.require("dojox.storage");

var TestStorage = {
	currentProvider: "default",
	currentNamespace: null,
	
	initialize: function(){
		//console.debug("test_storage.initialize()");
		
		// do we even have a storage provider?
		if(dojox.storage.manager.available == false){
			var o = document.createElement("option");
			o.appendChild(document.createTextNode("None"));
			o.value = "None";
			o.selected = true;
			var selector = dojo.byId("currentStorageProvider");
			selector.disabled = true;
			selector.appendChild(o);
			
			alert("No storage provider is available on this browser");
			return;
		}
		
		// what should our starting namespace be?
		this._determineCurrentNamespace();
		
		// clear out old values and enable input forms
		dojo.byId("storageNamespace").value = this.currentNamespace;
		dojo.byId("storageNamespace").disabled = false;
		dojo.byId("storageKey").value = "";
		dojo.byId("storageKey").disabled = false;
		dojo.byId("storageValue").value = "";
		dojo.byId("storageValue").disabled = false;
		
		// write out available providers
		this._printAvailableProviders();
		
		// write out our available namespaces
		this._printAvailableNamespaces();
		
		// write out our available keys
		this._printAvailableKeys();
		
		// initialize our event handlers
		var providerDirectory = dojo.byId("currentStorageProvider");
		dojo.connect(providerDirectory, "onchange", this, this.providerChange);
		var namespaceDirectory = dojo.byId("namespaceDirectory");
		dojo.connect(namespaceDirectory, "onchange", this, this.namespaceChange);
		var directory = dojo.byId("directory");
		dojo.connect(directory, "onchange", this, this.directoryChange);
		var storageValueElem = dojo.byId("storageValue");
		dojo.connect(storageValueElem, "onkeyup", this, this.printValueSize);
		
		// make the directory be unselected if the key name field gets focus
		var keyNameField = dojo.byId("storageKey");
		dojo.connect(keyNameField, "onfocus", function(evt){
			directory.selectedIndex = -1;
		});
											 
		// add onclick listeners to all of our buttons
		var buttonContainer = dojo.byId("buttonContainer");
		var currentChild = buttonContainer.firstChild;
		while(currentChild.nextSibling != null){
			if(currentChild.nodeType == 1){
				var buttonName = currentChild.id;
				var functionName = buttonName.match(/^(.*)Button$/)[1];
				dojo.connect(currentChild, "onclick", this, this[functionName]);
				currentChild.disabled = false;
			}
			
			currentChild = currentChild.nextSibling;
		}
		
		// print out metadata
		this._printProviderMetadata();
		
		// disable the configuration button if none is supported for this provider
		if(dojox.storage.hasSettingsUI() == false){
			dojo.byId("configureButton").disabled = true;
		}
	},
	
	providerChange: function(evt){
		var provider = evt.target.value;
		
		// reload the page with this provider
		var query = "";
		if(window.location.href.indexOf("forceStorageProvider") == -1){
			query = "?";
		}else{
			query = "&";
		}
		
		window.location.href += query + "forceStorageProvider=" + provider;
	},
	
	namespaceChange: function(evt){
		var ns = evt.target.value;
		this.currentNamespace = ns;
		
		// update our available keys
		this._printAvailableKeys();
		
		// clear out our key and values
		dojo.byId("storageNamespace").value = this.currentNamespace;
		dojo.byId("storageKey").value = "";
		dojo.byId("storageValue").value = "";
	},
	
	directoryChange: function(evt){
		var key = evt.target.value;
		
		// add this value into the form
		var keyNameField = dojo.byId("storageKey");
		keyNameField.value = key;
		
		this._handleLoad(key);
	},
	
	load: function(evt){
		// cancel the button's default behavior
		evt.preventDefault();
		evt.stopPropagation();
		
		// get the key to load
		var key = dojo.byId("storageKey").value;
		
		if(key == null || typeof key == "undefined" || key == ""){
			alert("Please enter a key name");
			return;
		}
		
		this._handleLoad(key);
	},
	
	loadMultiple: function(evt){
		// cancel the button's default behavior
		evt.preventDefault();
		evt.stopPropagation();
           
		// get the keys to load
		var dir = dojo.byId("directory");
		if(dir.selectedIndex < 0){
			alert("Please select a key from the 'All Keys' list");
			return;
		}
                 
		var keyArray = [dir.value], i;
  
		for(i = dir.options.selectedIndex + 1; i < dir.options.length
									&& keyArray.length < 10; i++){
										keyArray.push(dir.options[i].value);
		}

		for(i = dir.options.selectedIndex - 1; i >= 0 && keyArray.length < 10; i--){
			keyArray.push(dir.options[i].value);
		}
                                 
		this._handleLoadMultiple(keyArray);
	},
	
	save: function(evt){
		// cancel the button's default behavior
		evt.preventDefault();
		evt.stopPropagation();
		
		// get the new values
		var key = dojo.byId("storageKey").value;
		var value = dojo.byId("storageValue").value;
		var namespace = dojo.byId("storageNamespace").value;
		
		if(key == null || typeof key == "undefined" || key == ""){
			alert("Please enter a key name");
			return;
		}
		
		if(value == null || typeof value == "undefined" || value == ""){
			alert("Please enter a key value");
			return;
		}
		
		// print out the size of the value
		this.printValueSize();
		
		// do the save
		this._save(key, value, namespace);
	},
	
	saveMultiple: function(evt) {
		// cancel the button's default behavior
		evt.preventDefault();
		evt.stopPropagation();
                
		// get the new values
		var key = dojo.byId("storageKey").value;
		var value = dojo.byId("storageValue").value;
		var namespace = dojo.byId("storageNamespace").value;
          
		if(key == null || typeof key == "undefined" || key == ""){
			alert("Please enter a key name");
			return;
		}
     
		if(value == null || typeof value == "undefined" || value == ""){
			alert("Please enter a key value");
			return;
		}
                 
		// print out the size of the value
		this.printValueSize();
                 
		// do the save
		var keyArray = [], valueArray = [];
		for(var i = 0; i < 10; i++) {
			keyArray.push(key+i);
			valueArray.push(i + ") " + value);
		}
		this._saveMultiple(keyArray, valueArray, namespace);
	},
	
	clearNamespace: function(evt){
		// cancel the button's default behavior
		evt.preventDefault();
		evt.stopPropagation();
		
		dojox.storage.clear(this.currentNamespace);
		
		this._printAvailableNamespaces();
		this._printAvailableKeys();
	},
	
	_saveMultiple: function(keyArray, valueArray, namespace) {
		this._printStatus("Saving 10 keys, starting with '" + keyArray[0] + "'...");
		var self = this;
		var saveHandler = function(status, keyName){
			//console.debug("saveHandler, status="+status+", keyName="+keyName);
			if(status == dojox.storage.FAILED){
				alert("You do not have permission to store data for this web site. "
							+ "Press the Configure button to grant permission.");
			}else if(status == dojox.storage.SUCCESS){
				// clear out the old value
				dojo.byId("storageKey").value = "";
				dojo.byId("storageValue").value = "";
 				self._printStatus("Saved '" + keyArray[0] + "' and "
													+ (keyArray.length - 1) + " others");
              
				if(typeof namespace != "undefined" && namespace != null){
					self.currentNamespace = namespace;
				}
             
				self._printAvailableKeys();
				self._printAvailableNamespaces();
			}
		};
             
		try{
			if(namespace == dojox.storage.DEFAULT_NAMESPACE){
				dojox.storage.putMultiple(keyArray, valueArray, saveHandler);
			}else{
				dojox.storage.putMultiple(keyArray, valueArray, saveHandler, namespace);
			}
		}catch(exp){
			alert(exp);
		}
	},
	
	configure: function(evt){
		// cancel the button's default behavior
		evt.preventDefault();
		evt.stopPropagation();
		
		if(dojox.storage.hasSettingsUI()){
			// redraw our keys after the dialog is closed, in
			// case they have all been erased
			var self = this;
			dojox.storage.onHideSettingsUI = function(){
				self._printAvailableKeys();
			}
			
			// show the dialog
			dojox.storage.showSettingsUI();
		}
	},
	
	remove: function(evt){
		// cancel the button's default behavior
		evt.preventDefault();
		evt.stopPropagation();
		
		// determine what key to delete; if the directory has a selected value,
		// use that; otherwise, use the key name field
		var directory = dojo.byId("directory");
		var keyNameField = dojo.byId("storageKey");
		var keyValueField = dojo.byId("storageValue");
		var key;
		if(directory.selectedIndex != -1){
			key = directory.value;
			// delete this option
			var options = directory.childNodes;
			for(var i = 0; i < options.length; i++){
				if(options[i].nodeType == 1 &&
					 options[i].value == key){
					directory.removeChild(options[i]);
					break;
				}
			}
		}else{
			key = keyNameField.value;
		}
		
		keyNameField.value = "";
		keyValueField.value = "";
		
		// now delete the value
		this._printStatus("Removing '" + key + "'...");
		if(this.currentNamespace == dojox.storage.DEFAULT_NAMESPACE){
			dojox.storage.remove(key);
		}else{
			dojox.storage.remove(key, this.currentNamespace);
		}
		
		// update our UI
		this._printAvailableNamespaces();
		this._printStatus("Removed '" + key);
	},
	
	removeMultiple: function(evt){
		// cancel the button's default behavior
		evt.preventDefault();
		evt.stopPropagation();

		//	Try to help the user understands what she's doing
		if(confirm("Are you sure you want to delete the entry for the selected key and up to 10 more entries?")){

			// get the keys for entries to remove
			var dir = dojo.byId("directory");
			if(dir.selectedIndex < 0){
				alert("Please select a key from the 'All Keys' list");
				return;
			}
	                 
			var keyArray = [];
			for(var i = dir.options.selectedIndex; i < dir.options.length && keyArray.length < 10; i++){
				keyArray.push( dir.options[i].value);
			}

			this._printStatus("Removing '" + (dir.options.selectedIndex - i) + "' keys starting with '" + dir.options[dir.options.selectedIndex].value + "' ...");
			if(this.currentNamespace == dojox.storage.DEFAULT_NAMESPACE){
				dojox.storage.removeMultiple(keyArray);
			}else{
				dojox.storage.removeMultiple(keyArray, this.currentNamespace);
			}
				
			//	Remove the entries from the option list
			var options = directory.childNodes;
			for(i = dir.options.selectedIndex; i < dir.options.length && (i - dir.options.selectedIndex) < 10; i++){
				directory.removeChild(options[i]);
			}
		}
	},
	
	printValueSize: function(){
		var storageValue = dojo.byId("storageValue").value;
		var size = 0;
		if(storageValue != null && typeof storageValue != "undefined"){
			size = storageValue.length;
		}
		
		// determine the units we are dealing with
		var units;
		if(size < 1024)
			units = " bytes";
		else{
			units = " K";
			size = size / 1024;
			size = Math.round(size);
		}
		
		size = size + units;
		
		var valueSize = dojo.byId("valueSize");
		valueSize.innerHTML = size;
	},
	
	saveBook: function(evt){
		this._printStatus("Loading book...");
		
		var d = dojo.xhrGet({
			url: "resources/testBook.txt",
			handleAs: "text"
		});
		
		d.addCallback(dojo.hitch(this, function(results){
			this._printStatus("Book loaded");
			this._save("testBook", results);
		}));
		
		d.addErrback(dojo.hitch(this, function(error){
			alert("Unable to load testBook.txt: " + error);
		}));
		
		if(!typeof evt != "undefined" && evt != null){
			evt.preventDefault();
			evt.stopPropagation();
		}
		
		return false;
	},
	
	saveXML: function(evt){
		this._printStatus("Loading XML...");
		
		var d = dojo.xhrGet({
			url: "resources/testXML.xml",
			handleAs: "text"
		});
		
		d.addCallback(dojo.hitch(this, function(results){
			this._printStatus("XML loaded");
			this._save("testXML", results);
		}));
		
		d.addErrback(dojo.hitch(this, function(error){
			alert("Unable to load testXML.xml: " + error);
		}));
		
		if(!typeof evt != "undefined" && evt != null){
			evt.preventDefault();
			evt.stopPropagation();
		}
		
		return false;
	},
	
	_save: function(key, value, namespace){
		this._printStatus("Saving '" + key + "'...");
		var self = this;
		var saveHandler = function(status, keyName){
			//console.debug("saveHandler, status="+status+", keyName="+keyName);
			if(status == dojox.storage.FAILED){
				alert("You do not have permission to store data for this web site. "
							+ "Press the Configure button to grant permission.");
			}else if(status == dojox.storage.SUCCESS){
				// clear out the old value
				dojo.byId("storageKey").value = "";
				dojo.byId("storageValue").value = "";
				self._printStatus("Saved '" + key + "'");
				
				if(typeof namespace != "undefined"
					&& namespace != null){
					self.currentNamespace = namespace;
				}
				
				self._printAvailableKeys();
				self._printAvailableNamespaces();
			}
		};
		
		try{
			if(namespace == dojox.storage.DEFAULT_NAMESPACE){
				dojox.storage.put(key, value, saveHandler);
			}else{
				dojox.storage.put(key, value, saveHandler, namespace);
			}
		}catch(exp){
			alert(exp);
		}
	},
	
	_printAvailableKeys: function(){
		var directory = dojo.byId("directory");
		
		// clear out any old keys
		directory.innerHTML = "";
		
		// add new ones
		var availableKeys;
		if(this.currentNamespace == dojox.storage.DEFAULT_NAMESPACE){
			availableKeys = dojox.storage.getKeys();
		}else{
			availableKeys = dojox.storage.getKeys(this.currentNamespace);
		}
		
		for (var i = 0; i < availableKeys.length; i++){
			var optionNode = document.createElement("option");
			optionNode.appendChild(document.createTextNode(availableKeys[i]));
			optionNode.value = availableKeys[i];
			directory.appendChild(optionNode);
		}
	},
	
	_handleLoadMultiple: function(keyArray){
		this._printStatus("Loading '" + keyArray + "'...");
              
		// get the value
		var resultArray;
		if(this.currentNamespace == dojox.storage.DEFAULT_NAMESPACE){
			resultArray = dojox.storage.getMultiple(keyArray);
		}else{
			resultArray = dojox.storage.getMultiple(keyArray, this.currentNamespace);
		}
               
		// jsonify it if it is a JavaScript object
		for(var i = 0; i < resultArray.length; i++) {
			if(typeof resultArray[i] != "string"){
				resultArray[i] = dojo.toJson(resultArray[i]);
			}
		}
                
		// print out its value
		this._printStatus("Loaded '" + keyArray[0] + "' and "
											+ (keyArray.length - 1) + " others");
		dojo.byId("storageValue").value = "";
		for(i = 0; i < resultArray.length; i++){
			dojo.byId("storageValue").value += resultArray[i] + "\n----\n";
		}
	                 
		// print out the size of the value
		this.printValueSize();
	},
	
	_printAvailableNamespaces: function(){
		var namespacesDir = dojo.byId("namespaceDirectory");
		
		// clear out any old namespaces
		namespacesDir.innerHTML = "";
		
		// add new ones
		var availableNamespaces = dojox.storage.getNamespaces();
		for (var i = 0; i < availableNamespaces.length; i++){
			var optionNode = document.createElement("option");
			optionNode.appendChild(document.createTextNode(availableNamespaces[i]));
			optionNode.value = availableNamespaces[i];
			if(this.currentNamespace == availableNamespaces[i]){
				optionNode.selected = true;
			}
			namespacesDir.appendChild(optionNode);
		}
	},
	
	_handleLoad: function(key){
		this._printStatus("Loading '" + key + "'...");
		
		// get the value
		var results;
		if(this.currentNamespace == dojox.storage.DEFAULT_NAMESPACE){
			results = dojox.storage.get(key);
		}else{
			results = dojox.storage.get(key, this.currentNamespace);
		}
		
		// jsonify it if it is a JavaScript object
		if(typeof results != "string"){
			results = dojo.toJson(results);
		}
		
		// print out its value
		this._printStatus("Loaded '" + key + "'");
		dojo.byId("storageValue").value = results;
		
		// print out the size of the value
		this.printValueSize();
	},
	
	_printProviderMetadata: function(){
		var storageType = dojox.storage.manager.currentProvider.declaredClass;
		var isSupported = dojox.storage.isAvailable();
		var maximumSize = dojox.storage.getMaximumSize();
		var permanent = dojox.storage.isPermanent();
		var uiConfig = dojox.storage.hasSettingsUI();
		var moreInfo = "";
		if(dojox.storage.manager.currentProvider.declaredClass
				== "dojox.storage.FlashStorageProvider"){
			moreInfo = "Flash Version " + dojox.flash.info.version;
		}
		dojo.byId("currentStorageProvider").innerHTML = storageType;
		dojo.byId("isSupported").innerHTML = isSupported;
		dojo.byId("isPersistent").innerHTML = permanent;
		dojo.byId("hasUIConfig").innerHTML = uiConfig;
		dojo.byId("maximumSize").innerHTML = maximumSize;
		dojo.byId("moreInfo").innerHTML = moreInfo;
	},
	
	_printStatus: function(message){
		// remove the old status
		var top = dojo.byId("top");
		for (var i = 0; i < top.childNodes.length; i++){
			var currentNode = top.childNodes[i];
			if (currentNode.nodeType == 1 &&
					currentNode.className == "status"){
				top.removeChild(currentNode);
			}
		}
		
		var status = document.createElement("span");
		status.className = "status";
		status.innerHTML = message;
		
		top.appendChild(status);
		dojo.fadeOut({node: status, duration: 2000}).play();
	},
	
	_determineCurrentNamespace: function(){
		this.currentNamespace = dojox.storage.DEFAULT_NAMESPACE;
		
		// what is current namespace?
		var availableNamespaces = dojox.storage.getNamespaces();
		if(this.currentNamespace == dojox.storage.DEFAULT_NAMESPACE){
			// do we even have the default namespace in our available namespaces?
			var defaultPresent = false;
			for(var i = 0; i < availableNamespaces.length; i++){
				if(availableNamespaces[i] == dojox.storage.DEFAULT_NAMESPACE){
					defaultPresent = true;
				}
			}
			
			if(!defaultPresent && availableNamespaces.length){
				this.currentNamespace = availableNamespaces[0];
			}
		}
	},
	
	_printAvailableProviders: function(){
		// it is scary that this timeout is needed; if it is not present,
		// the options don't appear on Firefox and Safari, even though the
		// page is finished loading! it might have to do with some strange
		// interaction where our initialize method is called from ExternalInterface,
		// which originated inside of Flash. -- Brad Neuberg
		window.setTimeout(function(){
			var selector = dojo.byId("currentStorageProvider");
			var p = dojox.storage.manager.providers;
			for(var i = 0; i < p.length; i++){
				var name = p[i].declaredClass;
				var o = document.createElement("option");
				o.appendChild(document.createTextNode(name));
				o.value = name;
				if(dojox.storage.manager.currentProvider == p[i]){
					o.selected = true;
				}
			
				selector.appendChild(o);
			}
		}, 1);
	}
};

// wait until the storage system is finished loading
dojo.addOnLoad(function(){
	// is the storage already loaded?
	if(dojox.storage.manager.isInitialized() == false){
		dojo.connect(dojox.storage.manager, "loaded", TestStorage, TestStorage.initialize);
	}else{
		dojo.connect(dojo, "loaded", TestStorage, TestStorage.initialize);
	}
});
define(["dojo/_base/declare","dojox/data/CssRuleStore"], 
  function(declare, CssRuleStore) {

return declare("dojox.data.CssClassStore", CssRuleStore, {
	// summary:
	//		Basic store to display CSS information.
	// description:
	//		The CssClassStore allows users to get information about active Css classes in the page running the CssClassStore.
	//		It can also filter out classes from specific stylesheets.  The attributes it exposes on classes are as follows:
	//
	//		- class:		The classname, including the '.'.
	//		- classSans:	The classname without the '.'.

	// _labelAttribute:
	//		text representation of the Item [label and identifier may need to stay due to method names]
	_labelAttribute: 'class',
	
	_idAttribute: 'class',
	_cName: "dojox.data.CssClassStore",

	getFeatures: function(){
		// summary:
		//		See dojo/data/api/Read.getFeatures()
		return {
			"dojo.data.api.Read" : true,
			"dojo.data.api.Identity" : true
		};
	},

	getAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		this._assertIsItem(item);
		return ['class', 'classSans'];
	},

	getValue: function(item, attribute, defaultValue){
		// summary:
		//		See dojo/data/api/Read.getValue()
		var values = this.getValues(item, attribute);
		if(values && values.length > 0){
			return values[0];
		}
		return defaultValue;
	},

	getValues: function(item, attribute){
		// summary:
		//		See dojo/data/api/Read.getValues()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var value = [];
		if(attribute === "class"){
			value = [item.className];
		}else if(attribute === "classSans"){
			value = [item.className.replace(/\./g,'')];
		}
		return value;
	},

	_handleRule: function(rule, styleSheet, href){
		// summary:
		//		Handles the creation of an item based on the passed rule.  In this store, this implies
		//		parsing out all available class names.
		var obj = {};
		var s = rule['selectorText'].split(" ");
		for(var j=0; j<s.length; j++){
			var tmp = s[j];
			var first = tmp.indexOf('.');
			if(tmp && tmp.length > 0 && first !== -1){
				var last = tmp.indexOf(',') || tmp.indexOf('[');
				tmp = tmp.substring(first, ((last !== -1 && last > first)?last:tmp.length));
				obj[tmp] = true;
			}
		}
		for(var key in obj){
			if(!this._allItems[key]){
				var item = {};
				item.className = key;
				item[this._storeRef] = this;
				this._allItems[key] = item;
			}
		}
	},

	_handleReturn: function(){
		// summary:
		//		Handles the return from a fetching action.  Delegates requests to act on the resulting
		//		item set to eitehr the _handleFetchReturn or _handleFetchByIdentityReturn depending on
		//		where the request originated.
		var _inProgress = [];
		
		var items = {};
		for(var i in this._allItems){
			items[i] = this._allItems[i];
		}
		var requestInfo;
		// One-level deep clone (can't use dojo.clone, since we don't want to clone all those store refs!)
		while(this._pending.length){
			requestInfo = this._pending.pop();
			requestInfo.request._items = items;
			_inProgress.push(requestInfo);
		}

		while(_inProgress.length){
			requestInfo = _inProgress.pop();
			if(requestInfo.fetch){
				this._handleFetchReturn(requestInfo.request);
			}else{
				this._handleFetchByIdentityReturn(requestInfo.request);
			}
		}
	},

	_handleFetchByIdentityReturn: function(request){
		// summary:
		//		Handles a fetchByIdentity request by finding the correct item.
		var items = request._items;
		// Per https://bugs.webkit.org/show_bug.cgi?id=17935 , Safari 3.x always returns the selectorText
		// of a rule in full lowercase.
		var item = items[request.identity];
		if(!this.isItem(item)){
			item = null;
		}
		if(request.onItem){
			var scope = request.scope || dojo.global;
			request.onItem.call(scope, item);
		}
	},

	/* Identity API */
	getIdentity: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentity()
		this._assertIsItem(item);
		return this.getValue(item, this._idAttribute);
	},

	getIdentityAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentityAttributes()
		this._assertIsItem(item);
		return [this._idAttribute];
	},

	fetchItemByIdentity: function(/* request */ request){
		// summary:
		//		See dojo/data/api/Identity.fetchItemByIdentity()
		request = request || {};
		if(!request.store){
			request.store = this;
		}
		if(this._pending && this._pending.length > 0){
			this._pending.push({request: request});
		}else{
			this._pending = [{request: request}];
			this._fetch(request);
		}
		return request;
	}
});

});

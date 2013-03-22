define(["dojo/_base/kernel", "dojo/_base/array", "./_base"], function(dojo, darray, dxc){

	dxc.Dictionary=function(/*dojox.collections.Dictionary?*/ dictionary){
		// summary:
		//		Returns an object of type dojox.collections.Dictionary
		var items={};
		this.count=0;

		//	comparator for property addition and access.
		var testObject={};

		this.add=function(/*string*/ k, /*object*/ v){
			// summary:
			//		Add a new item to the Dictionary.
			var b=(k in items);
			items[k]=new dxc.DictionaryEntry(k,v);
			if(!b){
				this.count++;
			}
		};
		this.clear=function(){
			// summary:
			//		Clears the internal dictionary.
			items={};
			this.count=0;
		};
		this.clone=function(){
			// summary:
			//		Returns a new instance of dojox.collections.Dictionary; note the the dictionary is a clone but items might not be.
			return new dxc.Dictionary(this);	//	dojox.collections.Dictionary
		};
		this.contains=this.containsKey=function(/*string*/ k){
			// summary:
			//		Check to see if the dictionary has an entry at key "k".
			if(testObject[k]){
				return false;			// bool
			}
			return (items[k]!=null);	//	bool
		};
		this.containsValue=function(/*object*/ v){
			// summary:
			//		Check to see if the dictionary has an entry with value "v".
			var e=this.getIterator();
			while(e.get()){
				if(e.element.value==v){
					return true;	//	bool
				}
			}
			return false;	//	bool
		};
		this.entry=function(/*string*/ k){
			// summary:
			//		Accessor method; similar to dojox.collections.Dictionary.item but returns the actual Entry object.
			return items[k];	//	dojox.collections.DictionaryEntry
		};
		this.forEach=function(/*function*/ fn, /*object?*/ scope){
			// summary:
			//		functional iterator, following the mozilla spec.
			var a=[];	//	Create an indexing array
			for(var p in items) {
				if(!testObject[p]){
					a.push(items[p]);	//	fill it up
				}
			}
			dojo.forEach(a, fn, scope);
		};
		this.getKeyList=function(){
			// summary:
			//		Returns an array of the keys in the dictionary.
			return (this.getIterator()).map(function(entry){
				return entry.key;
			});	//	array
		};
		this.getValueList=function(){
			// summary:
			//		Returns an array of the values in the dictionary.
			return (this.getIterator()).map(function(entry){
				return entry.value;
			});	//	array
		};
		this.item=function(/*string*/ k){
			// summary:
			//		Accessor method.
			if(k in items){
				return items[k].valueOf();	//	object
			}
			return undefined;	//	object
		};
		this.getIterator=function(){
			// summary:
			//		Gets a dojox.collections.DictionaryIterator for iteration purposes.
			return new dxc.DictionaryIterator(items);	//	dojox.collections.DictionaryIterator
		};
		this.remove=function(/*string*/ k){
			// summary:
			//		Removes the item at k from the internal collection.
			if(k in items && !testObject[k]){
				delete items[k];
				this.count--;
				return true;	//	bool
			}
			return false;	//	bool
		};

		if (dictionary){
			var e=dictionary.getIterator();
			while(e.get()) {
				 this.add(e.element.key, e.element.value);
			}
		}
	};
	return dxc.Dictionary;
});

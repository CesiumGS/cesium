define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array"], 
  function(dojo, lang, arr){
	var collections = lang.getObject("dojox.collections", true);

	collections.DictionaryEntry=function(/*string*/ k, /*object*/ v){
		// summary:
		//		return an object of type dojox.collections.DictionaryEntry
		this.key=k;
		this.value=v;
		this.valueOf=function(){
			return this.value; 	//	object
		};
		this.toString=function(){
			return String(this.value);	//	string
		};
	}

	/*	Iterators
	 *	The collections.Iterators (Iterator and DictionaryIterator) are built to
	 *	work with the Collections included in this module.  However, they *can*
	 *	be used with arrays and objects, respectively, should one choose to do so.
	 */
	collections.Iterator=function(/*array*/ a){
		// summary:
		//		return an object of type dojox.collections.Iterator
		var position=0;
		this.element=a[position]||null;
		this.atEnd=function(){
			// summary:
			//		Test to see if the internal cursor has reached the end of the internal collection.
			return (position>=a.length);	//	bool
		};
		this.get=function(){
			// summary:
			//		Get the next member in the collection.
			if(this.atEnd()){
				return null;		//	object
			}
			this.element=a[position++];
			return this.element;	//	object
		};
		this.map=function(/*function*/ fn, /*object?*/ scope){
			// summary:
			//		Functional iteration with optional scope.
			return arr.map(a, fn, scope);
		};
		this.reset=function(){
			// summary:
			//		reset the internal cursor.
			position=0;
			this.element=a[position];
		};
	}

	/*	Notes:
	 *	The DictionaryIterator no longer supports a key and value property;
	 *	the reality is that you can use this to iterate over a JS object
	 *	being used as a hashtable.
	 */
	collections.DictionaryIterator=function(/*object*/ obj){
		// summary:
		//		return an object of type dojox.collections.DictionaryIterator
		var a=[];	//	Create an indexing array
		var testObject={};
		for(var p in obj){
			if(!testObject[p]){
				a.push(obj[p]);	//	fill it up
			}
		}
		var position=0;
		this.element=a[position]||null;
		this.atEnd=function(){
			// summary:
			//		Test to see if the internal cursor has reached the end of the internal collection.
			return (position>=a.length);	//	bool
		};
		this.get=function(){
			// summary:
			//		Get the next member in the collection.
			if(this.atEnd()){
				return null;		//	object
			}
			this.element=a[position++];
			return this.element;	//	object
		};
		this.map=function(/*function*/ fn, /*object?*/ scope){
			// summary:
			//		Functional iteration with optional scope.
			return arr.map(a, fn, scope);
		};
		this.reset=function() {
			// summary:
			//		reset the internal cursor.
			position=0;
			this.element=a[position];
		};
	};

	return collections;
});

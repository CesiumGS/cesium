define(["dojo/_base/kernel", "dojo/_base/array", "./_base"], function(dojo, darray, dxc){

	dxc.ArrayList=function(/*array?*/ arr){
		// summary:
		//		Returns a new object of type dojox.collections.ArrayList
		var items=[];
		if(arr) items=items.concat(arr);
		this.count=items.length;
		this.add=function(/*object*/ obj){
			// summary:
			//		Add an element to the collection.
			items.push(obj);
			this.count=items.length;
		};
		this.addRange=function(/*array*/ a){
			// summary:
			//		Add a range of objects to the ArrayList
			if(a.getIterator){
				var e=a.getIterator();
				while(!e.atEnd()){
					this.add(e.get());
				}
				this.count=items.length;
			}else{
				for(var i=0; i<a.length; i++){
					items.push(a[i]);
				}
				this.count=items.length;
			}
		};
		this.clear=function(){
			// summary:
			//		Clear all elements out of the collection, and reset the count.
			items.splice(0, items.length);
			this.count=0;
		};
		this.clone=function(){
			// summary:
			//		Clone the array list
			return new dxc.ArrayList(items);	//	dojox.collections.ArrayList
		};
		this.contains=function(/*object*/ obj){
			// summary:
			//		Check to see if the passed object is a member in the ArrayList
			for(var i=0; i < items.length; i++){
				if(items[i] == obj) {
					return true;	//	bool
				}
			}
			return false;	//	bool
		};
		this.forEach=function(/*function*/ fn, /*object?*/ scope){
			// summary:
			//		functional iterator, following the mozilla spec.
			dojo.forEach(items, fn, scope);
		};
		this.getIterator=function(){
			// summary:
			//		Get an Iterator for this object
			return new dxc.Iterator(items);	//	dojox.collections.Iterator
		};
		this.indexOf=function(/*object*/ obj){
			// summary:
			//		Return the numeric index of the passed object; will return -1 if not found.
			for(var i=0; i < items.length; i++){
				if(items[i] == obj) {
					return i;	//	int
				}
			}
			return -1;	// int
		};
		this.insert=function(/*int*/ i, /*object*/ obj){
			// summary:
			//		Insert the passed object at index i
			items.splice(i,0,obj);
			this.count=items.length;
		};
		this.item=function(/*int*/ i){
			// summary:
			//		return the element at index i
			return items[i];	//	object
		};
		this.remove=function(/*object*/ obj){
			// summary:
			//		Look for the passed object, and if found, remove it from the internal array.
			var i=this.indexOf(obj);
			if(i >=0) {
				items.splice(i,1);
			}
			this.count=items.length;
		};
		this.removeAt=function(/*int*/ i){
			// summary:
			//		Remove the element located at the given index.
			items.splice(i,1);
			this.count=items.length;
		};
		this.reverse=function(){
			// summary:
			//		Reverse the internal array
			items.reverse();
		};
		this.sort=function(/*function?*/ fn){
			// summary:
			//		sort the internal array
			if(fn){
				items.sort(fn);
			}else{
				items.sort();
			}
		};
		this.setByIndex=function(/*int*/ i, /*object*/ obj){
			// summary:
			//		Set an element in the array by the passed index.
			items[i]=obj;
			this.count=items.length;
		};
		this.toArray=function(){
			// summary:
			//		Return a new array with all of the items of the internal array concatenated.
			return [].concat(items);
		};
		this.toString=function(/*string*/ delim){
			// summary:
			//		implementation of toString, follows [].toString();
			return items.join((delim||","));
		};
	};
	return dxc.ArrayList;
});

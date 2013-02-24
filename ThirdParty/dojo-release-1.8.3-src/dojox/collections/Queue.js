define(["dojo/_base/kernel", "dojo/_base/array", "./_base"], function(dojo, darray, dxc){

	dxc.Queue=function(/*array?*/ arr){
		// summary:
		//		return an object of type dojox.collections.Queue
		var q=[];
		if (arr){
			q=q.concat(arr);
		}
		this.count=q.length;
		this.clear=function(){
			// summary:
			//		clears the internal collection
			q=[];
			this.count=q.length;
		};
		this.clone=function(){
			// summary:
			//		creates a new Queue based on this one
			return new dxc.Queue(q);	//	dojox.collections.Queue
		};
		this.contains=function(/*object*/ o){
			// summary:
			//		Check to see if the passed object is an element in this queue
			for(var i=0; i<q.length; i++){
				if (q[i]==o){
					return true;	//	bool
				}
			}
			return false;	//	bool
		};
		this.copyTo=function(/*array*/ arr, /*int*/ i){
			// summary:
			//		Copy the contents of this queue into the passed array at index i.
			arr.splice(i,0,q);
		};
		this.dequeue=function(){
			// summary:
			//		shift the first element off the queue and return it
			var r=q.shift();
			this.count=q.length;
			return r;	//	object
		};
		this.enqueue=function(/*object*/ o){
			// summary:
			//		put the passed object at the end of the queue
			this.count=q.push(o);
		};
		this.forEach=function(/*function*/ fn, /*object?*/ scope){
			// summary:
			//		functional iterator, following the mozilla spec.
			dojo.forEach(q, fn, scope);
		};
		this.getIterator=function(){
			// summary:
			//		get an Iterator based on this queue.
			return new dxc.Iterator(q);	//	dojox.collections.Iterator
		};
		this.peek=function(){
			// summary:
			//		get the next element in the queue without altering the queue.
			return q[0];
		};
		this.toArray=function(){
			// summary:
			//		return an array based on the internal array of the queue.
			return [].concat(q);
		};
	};
	return dxc.Queue;
});

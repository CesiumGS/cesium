define(["./_base", "./ArrayList"], function(dxc, ArrayList){

	dxc.Set=new (function(){
		function conv(arr){
			if(arr.constructor==Array){
				return new ArrayList(arr);	//	dojox.collections.ArrayList
			}
			return arr;		//	dojox.collections.ArrayList
		}
		this.union = function(/*array*/ setA, /*array*/ setB){
			// summary:
			//		Return the union of the two passed sets.
			setA=conv(setA);
			setB=conv(setB);
			var result = new ArrayList(setA.toArray());
			var e = setB.getIterator();
			while(!e.atEnd()){
				var item=e.get();
				if(!result.contains(item)){
					result.add(item);
				}
			}
			return result;	//	dojox.collections.ArrayList
		};
		this.intersection = function(/*array*/ setA, /*array*/ setB){
			// summary:
			//		Return the intersection of the two passed sets.
			setA=conv(setA);
			setB=conv(setB);
			var result = new ArrayList();
			var e = setB.getIterator();
			while(!e.atEnd()){
				var item=e.get();
				if(setA.contains(item)){
					result.add(item);
				}
			}
			return result;	//	dojox.collections.ArrayList
		};
		this.difference = function(/*array*/ setA, /*array*/ setB){
			// summary:
			//		Returns everything in setA that is not in setB.
			setA=conv(setA);
			setB=conv(setB);
			var result = new ArrayList();
			var e=setA.getIterator();
			while(!e.atEnd()){
				var item=e.get();
				if(!setB.contains(item)){
					result.add(item);
				}
			}
			return result;	//	dojox.collections.ArrayList
		};
		this.isSubSet = function(/*array*/ setA, /*array*/ setB) {
			// summary:
			//		Returns if set B is a subset of set A.
			setA=conv(setA);
			setB=conv(setB);
			var e = setA.getIterator();
			while(!e.atEnd()){
				if(!setB.contains(e.get())){
					return false;	//	boolean
				}
			}
			return true;	//	boolean
		};
		this.isSuperSet = function(/*array*/ setA, /*array*/ setB){
			// summary:
			//		Returns if set B is a superset of set A.
			setA=conv(setA);
			setB=conv(setB);
			var e = setB.getIterator();
			while(!e.atEnd()){
				if(!setA.contains(e.get())){
					return false;	//	boolean
				}
			}
			return true;	//	boolean
		};
	})();
	return dxc.Set;
});

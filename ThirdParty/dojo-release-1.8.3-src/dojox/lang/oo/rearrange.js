dojo.provide("dojox.lang.oo.rearrange");

(function(){
	var extraNames = dojo._extraNames, extraLen = extraNames.length,
		opts = Object.prototype.toString, empty = {};

	dojox.lang.oo.rearrange = function(bag, map){
		// summary:
		//		Process properties in place by removing and renaming them.
		// description:
		//		Properties of an object are to be renamed or removed specified
		//		by "map" argument. Only own properties of "map" are processed.
		// example:
		//	|	oo.rearrange(bag, {
		//	|		abc: "def",	// rename "abc" attribute to "def"
		//	|		ghi: null	// remove/hide "ghi" attribute
		//	|	});
		// bag: Object
		//		the object to be processed
		// map: Object
		//		the dictionary for renaming (false value indicates removal of the named property)
		// returns: Object
		//		the original object

	var name, newName, prop, i, t;

		for(name in map){
			newName = map[name];
			if(!newName || opts.call(newName) == "[object String]"){
				prop = bag[name];
				if(!(name in empty) || empty[name] !== prop){
					if(!(delete bag[name])){
						// can't delete => hide it
						bag[name] = undefined;
					}
					if(newName){
						bag[newName] = prop;
					}
				}
			}
		}
		if(extraLen){
			for(i = 0; i < extraLen; ++i){
				name = extraNames[i];
				// repeating the body above
				newName = map[name];
				if(!newName || opts.call(newName) == "[object String]"){
					prop = bag[name];
					if(!(name in empty) || empty[name] !== prop){
						if(!(delete bag[name])){
							// can't delete => hide it
							bag[name] = undefined;
						}
						if(newName){
							bag[newName] = prop;
						}
					}
				}
			}
		}

		return bag;	// Object
	};
})();

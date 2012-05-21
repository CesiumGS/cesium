define(["../buildControl"], function(bc) {
	var
		mappedNames= 0,

		mapNames= function() {
			mappedNames= {};
			var id= 2;
			for (var p in bc.hasFeatures) {
				if (typeof bc.staticHasFeatures[p]!="undefined") {
					mappedNames[p]= bc.staticHasFeatures[p] ? 1 : 0;
				} else {
					//mappedNames[p]= id++;
					mappedNames[p]= '"' + p + '"';
				}
			}
		};

	return function(resource) {
		if (!mappedNames) {
			mapNames();
		}

		var result= resource.text.replace(/([^\w\.])has\s*\(\s*["']([^'"]+)["']\s*\)/g, function(match, prefix, featureName) {
			var value= mappedNames[featureName];
			if (value==1 || value==0) {
				return prefix + mappedNames[featureName] + "";
			} else {
				return prefix + "has(" + value + ")";
			}
		});

		result= result.replace(/(has.add\s*\(\s*)["']([^'"]+)["']/g, function(match, prefix, featureName) {
			if (mappedNames[featureName]<2) {
				return (mappedNames[featureName]==0 ? "false && " : "true || ") + match;
			} else if(mappedNames[featureName]!==undefined) {
				return prefix + mappedNames[featureName];
			} else {
				return match;
			}
		});

		resource.text= result;

		return 0;
	};
});

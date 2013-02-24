define(["../buildControl"], function(bc) {
	return function(resource){
		if(resource.hasTest){
			return 0;
		}
		var
			hasFeatures = bc.hasFeatures = bc.hasFeatures || {},
			text = resource.text,
			hasRe = /[^\w\.]has\s*\(\s*["']([^"']+)["']\s*\)/g,
			result;
		while((result = hasRe.exec(text)) != null){
			var
				featureName = result[1],
				sourceSet = hasFeatures[featureName] = hasFeatures[featureName] || {};
			sourceSet[resource.mid] = 1;
		}
		return 0;
	};
});

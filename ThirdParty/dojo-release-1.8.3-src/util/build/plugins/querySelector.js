define(function() {
	return {
		start:function(
			id,
			referenceModule,
			bc
		) {
			var result = [bc.amdResources["dojo/selector/_loader"]];
			if(bc.selectorEngine){
				result = result.concat(bc.amdResources["dojo/selector/" + bc.selectorEngine]);
			}
			return result;
		}
	};
});

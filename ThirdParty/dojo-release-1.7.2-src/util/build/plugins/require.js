///
// \module build/plugins/require
//
define([], function() {
	return {
		start:function(
			mid,
			referenceModule,
			bc
		) {
			var result = [];
			mid.split(",").map(function(mid){
				var module = bc.amdResources[mid];
				if (!module) {
					bc.log("legacyMissingDependency", ["reference module", referenceModule.mid, "dependency", mid]);
				}else{
					result.push(module);
				}
			});
			return result;
		}
	};
});


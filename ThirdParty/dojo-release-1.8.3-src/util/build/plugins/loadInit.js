define(function() {
	return {
		start:function(
			mid,
			referenceModule,
			bc
		){
			return [bc.amdResources["dojo/require"], bc.amdResources[bc.getSrcModuleInfo(mid, referenceModule).mid]];
		}
	};
});

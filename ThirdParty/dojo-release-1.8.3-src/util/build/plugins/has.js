define(["dojo/regexp"], function(dojoRegExp) {
	return {
		start:function(
			id,
			referenceModule,
			bc
		) {
			var
				getHasPluginDependency = function(){
					var hasPlugin = bc.amdResources["dojo/has"];
					if(!hasPlugin){
						bc.log("dojoHasMissingPlugin");
						return [];
					}else{
						return [hasPlugin];
					}
				},

				has = function(featureId) {
					var value = bc.staticHasFeatures[featureId];
					return (value===undefined || value==-1) ? undefined : value;
				},

				tokens = id.match(/[\?:]|[^:\?]*/g),

				i = 0,

				get = function(skip){
					var operator, term = tokens[i++];
					if(term == ":"){
						// empty string module name; therefore, no dependency
						return "";
					}else{
						// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
						if(tokens[i++] == "?"){
							var hasResult = has(term);
							if(hasResult===undefined){
								return undefined;
							}else if(!skip && hasResult){
								// matched the feature, get the first value from the options
								return get();
							}else{
								// did not match, get the second value, passing over the first
								get(true);
								return get(skip);
							}
						}
						// a module
						return term===undefined ? "" : term;
					}
				},

				resolvedId = get();

			// we only need the plugin if we need to resolve at run time
			if(resolvedId===undefined){
				bc.log("dojoHasUnresolvedMid", ["plugin resource id", id, "reference module id", referenceModule && referenceModule.mid]);
				return getHasPluginDependency();
			}

			var regex = new RegExp("((dojo\\/)|([./]+))has\\!" + dojoRegExp.escapeString(id));
			if(!resolvedId){
				// replace the unneeded module with a module that's guaranteed available
				// this keeps the module order, and therefore, argument order to the factory correct
				referenceModule.text = referenceModule.text.replace(regex, "require");
				return [];
			}else{
				var
					moduleInfo = bc.getSrcModuleInfo(resolvedId, referenceModule),
					module = bc.amdResources[moduleInfo.mid];
				if(module){
					referenceModule.text = referenceModule.text.replace(regex, resolvedId);
					return [module];
				}else{
					bc.log("dojoHasMissingMid", ["plugin resource id", id, "resolved plugin resource id", moduleInfo.mid, "reference module id", referenceModule && referenceModule.mid]);
					return getHasPluginDependency();
				}
			}
		}
	};
});

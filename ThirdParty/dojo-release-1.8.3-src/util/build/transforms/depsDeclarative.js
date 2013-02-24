define([
	"../buildControl",
	"../fs",
	"../fileUtils",
	"dojo/_base/lang",
	"dojo/_base/json"
], function(bc, fs, fileUtils, lang, json){
	return function(resource){
		var
			// Array of MIDs discovered in the declarative resource
			aggregateDeps = [],

			// Looks for "data-dojo-type" and "data-dojo-mids" for declarative modules
			interningAutoRequireRegExp = /\sdata-dojo-(?:type|mids)\s*=\s*["']([^"']+\/[^"']+)["']/gi,

			// Looks for '<script type="dojo/require">' blocks
			interningDeclarativeRequireRegExp = /<script\s+[^>]*type=["']dojo\/require["'][^>]*>([^<]*)<\/script>/gi,

			processAutoRequire = function(){
				// Parses the resource for any MIDs that might need to be built into the layer
				var mids = [],
					str = resource.text,
					match;

				// Run the RegExp over the text
				while(match = interningAutoRequireRegExp.exec(str)){
					match[1].split(/\s*,\s*/).forEach(function(mid){
						mids.push(mid);
					});
				}

				return mids;
			},

			processDeclarativeRequire = function(){
				// Parses the resource for and declarative require script blocks and
				// analyses the bocks for their MIDs to be included in the layer.
				var mids = [],
					str = resource.text,
					match;

				while(match = interningDeclarativeRequireRegExp.exec(str)){
					// Try and convert <script type="dojo/require"> into object
					try{
						var h = json.fromJson("{" + match[1] + "}");
					}catch(e){
						bc.log("declarativeRequireFailed", ["resource", resource.src, "error", e]);
					}
					// Cycle through each key and add module as dependency
					for(var i in h){
						var mid = h[i];
						if(typeof mid == "string"){
							mids.push(mid);
						}else{
							bc.log("userWarn", ["declarative require has invalid value", "resource", resource.src, "key", i, "value", mid]);
						}
					}
				}

				return mids;
			};

		// Intern the resources strings and identify any mids used in declarative syntax
		aggregateDeps = aggregateDeps.concat(processAutoRequire());
		
		// Intern the resources strings and identify any declarative require script blocs and parse out the mids
		aggregateDeps = aggregateDeps.concat(processDeclarativeRequire());


		// Iterate through the layers, identify those that contain this resource.mid, 
		// remove it from the include array and then add this resource's includes
		for(var mid in bc.amdResources){
			if(bc.amdResources[mid].layer){ // This resource is a layer
				var includes = bc.amdResources[mid].layer.include,
					idx = includes.indexOf(resource.mid);
				// Bitwise operator that returns true if the layer contains this resource
				if(~idx){
					// Remove this resources mid from the layer's include array
					includes.splice(idx, 1);
					aggregateDeps.forEach(function(dep){
						// Uniquely add appropriate mids to the layer's include array
						if(!(/^(require|exports|module)$/.test(dep))){
							if(!~includes.indexOf(dep)){
								includes.push(dep);
							}
						}
					});
				}
			}
		}

	};
});
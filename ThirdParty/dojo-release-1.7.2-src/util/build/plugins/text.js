define(["../buildControl", "dojo/json"], function(bc, json) {
	// note: this builder plugin only writes text that is part of a package
	var makePluginPseudoModule= function(module, moduleInfo) {
			return {
				module:module,
				pid:moduleInfo.pid,
				mid:moduleInfo.mid,
				deps:[],
				getText:function(){
					return json.stringify(this.module.text+"");
				},
				internStrings:function(){
					return ["url:" + this.mid, json.stringify(this.module.text+"")];
				}
			};
		},

		start= function(
			mid,
			referenceModule,
			bc
		) {
			var textPlugin= bc.amdResources["dojo/text"];
			if (!textPlugin) {
				throw new Error("text! plugin missing");
			}

			// mid may contain a pragma (e.g. "!strip"); remove
			mid= mid.split("!")[0];

			// the following taken from the loader toUrl function
			// name must include a filetype; fault tolerate to allow no filetype (but things like "path/to/version2.13" will assume filetype of ".13")
			var
				match = mid.match(/(.+)(\.[^\/\.]+?)$/),
				root = (match && match[1]) || mid,
				ext = (match && match[2]) || "",
				moduleInfo =  bc.getSrcModuleInfo(root, referenceModule),
				url= moduleInfo.url;
			// recall, getModuleInfo always returns a url with a ".js" suffix iff pid; therefore, we've got to trim it
			url= (typeof moduleInfo.pid == "string" ? url.substring(0, url.length - 3) : url) + ext;

			// fixup the moduleInfo to reflect type filetype extention
			moduleInfo.url= url;
			moduleInfo.mid+= ext;

			var textResource= bc.resources[url];
			if (!textResource) {
				throw new Error("text resource (" + url + ") missing");
			}
			if(bc.internStrings){
				textResource.tag.noWrite= 0;
			}
			return [textPlugin, makePluginPseudoModule(textResource, moduleInfo)];
		};

	return {
		start:start
	};
});

define(function() {
	var nlsRe=
		// regexp for reconstructing the master bundle name from parts of the regexp match
		// nlsRe.exec("foo/bar/baz/nls/en-ca/foo") gives:
		// ["foo/bar/baz/nls/en-ca/foo", "foo/bar/baz/nls/", "/", "/", "en-ca", "foo"]
		// nlsRe.exec("foo/bar/baz/nls/foo") gives:
		// ["foo/bar/baz/nls/foo", "foo/bar/baz/nls/", "/", "/", "foo", ""]
		// so, if match[5] is blank, it means this is the top bundle definition.
		// courtesy of http://requirejs.org
		/(^.*(^|\/)nls(\/|$))([^\/]*)\/?([^\/]*)/;

	return {
		start:function(
			mid,
			referenceModule,
			bc
		){
			var i18nPlugin = bc.amdResources["dojo/i18n"],
			match = nlsRe.exec(mid),
			bundleName = match[5] || match[4],
			bundlePath = bc.getSrcModuleInfo(match[1] + bundleName, referenceModule).mid.match(/(.+\/)[^\/]+/)[1],
			locale = (match[5] && match[4]),
			i18nResourceMid = bundlePath + (locale ? locale + "/" : "") + bundleName,
			i18nResource = bc.amdResources[i18nResourceMid];

			if(!i18nPlugin){
				throw new Error("i18n! plugin missing");
			}
			if(!i18nResource){
				throw new Error("i18n resource (" + i18nResourceMid + ") missing");
			}
			return [i18nPlugin, i18nResource];
		}
	};
});

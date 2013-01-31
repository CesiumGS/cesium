define([], function(){
	var
		rev = "$Rev: 23930 $".match(/\d+/),
		version= {
			major: 1, minor: 7, patch: 0, flag: "dev",
			revision: rev ? +rev[0] : NaN,
			toString: function(){
				var v= version;
				return v.major + "." + v.minor + "." + v.patch + v.flag + " (" + v.revision + ")";
			}
		};
	return version;
});

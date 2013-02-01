define([], function() {
	return {
		cwd:function() {
			return environment["user.dir"];
		},

		exit:function(resultCode) {
			// no documented way to return an exit code in rhino
			if (resultCode) {
				java.lang.System.exit(resultCode);
			}
			quit();
		},

		exec:function() {
			// signature is (command, arg1, ..., argn, errorMessage, bc, callback)
			for(var args = [], i = 0; i<arguments.length-3; i++){
				args.push(arguments[i]);
			}
			var
				errorMessage = arguments[i++],
				bc = arguments[i++],
				callback = arguments[i],
				options = {output:""};
			args.push(options);
			try{
				runCommand.apply(this, args);
				callback && callback(0, options.output);
			}catch(e){
				bc.log("execFailed", ["message", errorMessage, "output", options.output+"", "error", e]);
				callback && callback(-1, errorMessage + "\n" + options.output + "\n" + e);
			}
		}
	};
});

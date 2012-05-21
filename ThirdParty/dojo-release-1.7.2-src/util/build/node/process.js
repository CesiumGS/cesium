define(["../fileHandleThrottle", "../messages"], function(fht, messages) {
	var spawn= require.nodeRequire("child_process").spawn;
	return {
		cwd:process.cwd,
		exit:function(code){
			// no more messages
			messages.stop();

			// allow whatever is in the stdout buffer to be pumped
			process.stdout.on('close', function(){
				process.exit(code);
			});
		},

		exec:function() {
			// signature is (command, arg1, ..., argn, errorMessage, bc, callback)
			for(var command= arguments[0], args= [], i= 1; i<arguments.length-3; i++){
				args.push(arguments[i]);
			}
			var
				errorMessage= arguments[i++],
				bc= arguments[i++],
				callback= arguments[i];
			fht.enqueue(function(){
				var
					text= "",
					process= spawn(command, args);
				process.on("exit", function(code){
					fht.release();
					if(code){
						bc.log("execFailed", ["message", errorMessage, "output", text]);
					}
					callback && callback(code, text);
				});
				process.stdout.on("data", function(data){
					text+= data;
				});
				process.stderr.on("data", function(data){
					text+= data;
				});
			});
		}
	};
});


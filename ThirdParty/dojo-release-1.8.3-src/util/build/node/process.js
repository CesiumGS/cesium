define(["../fileHandleThrottle", "../messages"], function(fht, messages){
	var version = Number(process.version.match(/\d+\.\d+/)[0]),
		spawn = require.nodeRequire("child_process").spawn;
	return {
		cwd:process.cwd,
		exit:function(code){
			// no more messages
			messages.stop();

			process.exit(code);
		},

		exec:function() {
			// signature is (command, arg1, ..., argn, errorMessage, bc, callback)
			for(var command = arguments[0], args = [], i = 1; i<arguments.length-3; i++){
				args.push(arguments[i]);
			}
			var
				errorMessage = arguments[i++],
				bc = arguments[i++],
				callback = arguments[i];
			fht.enqueue(function(){
				var
					text = "",
					process = spawn(command, args),
					status = 0,
					finish = function(code){
						// release when both exit and close events occur; see below
						if(++status===2){
							fht.release();
							if(code){
								bc.log("execFailed", ["message", errorMessage, "output", text]);
							}
							callback && callback(code, text);
						}
					};

				process.on("exit", finish);
				// for node>=0.8, close is called; for node <0.8 close appears to not be called (verified for 0.6)
				// in 0.8+ releasing the file handle before close is called can use up file handles too fast (see #15620)
				if(version>=0.8){
					process.on("close", finish);
				}else{
					++status;
				}
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


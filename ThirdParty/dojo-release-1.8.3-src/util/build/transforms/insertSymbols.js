define([
	"../buildControl",
	"../fileUtils",
	"../fs",
	"../replace"
], function(bc, fileUtils, fs, replace) {
	var symctr = 1,
		m = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
		len = m.length,

		generateSym = function(name, symtbl){
			var ret = name; //defaults to long symbol
			if(bc.symbol === "short"){
				var s=[], c = symctr;
				while(c){
					s.unshift(m[c%len]);
					c = Math.floor(c/len);
				}
				s = "$D" + s.join('');
				symctr++;
				symtbl[s + "_"] = name;
				ret = s + "_";
			}
			return ret;
		},

		convertSym = function(orig_name, symtbl){
			var name = orig_name.replace(/\./g, "_");
			if(bc.symbol !== "short" && orig_name === name){
				if(name === 'define'){
					//if the function is assigned to a variable named define, use
					//DEFINE instead to prevent messing up other transform steps
					name = 'DEFINE';
				}

				//if the original name does not have dot in it, don't use
				//the name directly: it will mess up the original logic, such as
				//in the following case:
				//		if(some_condition){
				//			var my_special_func=function(){...};
				//		}else{
				//			var my_special_func=function(){...};
				//		}
				//if the two anonymous functions are named my_special_func,
				//no matter what "some_condition" evaluates to, in the built
				//code, my_special_func will always be equal to the
				//implementation in the else branch
				//so we have to append something random to the name
				return name+"__"+Math.floor(Math.random()*10000);
			}
			return generateSym(name, symtbl);
		},

		insertSymbols = function(resource, symtbl){
			var content = resource.getText(),
				prefixes = [],
				addFunctionName = function(str, p1, p2, p3, p4){
					return p1+p2+p3+" "+generateSym(prefixes+p2, symtbl)+p4;
				};

			if(resource.pid){
				prefixes.push(resource.pid);
			}
			if(resource.mid){
				prefixes.push(resource.mid.replace(/\//g,'_'));
			}
			if(!prefixes.length){
				var m = content.match(/dojo\.provide\("(.*)"\);/);
				if(m){
					prefixes.push(m[1].replace(/\./g, "_"));
				}
			}
			if(prefixes.length){
				prefixes = prefixes.join('_').replace(/\.|\-/g,'_')+"_";
				content = content.replace(/^(\s*)(\w+)(\s*:\s*function)\s*(\(.*)$/mg, addFunctionName).
					replace(/^(\s*this\.)(\w+)(\s*=\s*function)\s*(\(.*)$/mg, addFunctionName);
			}
			content = content.replace(/^(\s*)([\w\.]+)(\s*=\s*function)\s*(\(.*)/mg,function(str, p1, p2, p3, p4){
				return p1+p2+p3+" "+convertSym(p2, symtbl)+p4;
			});
			return content;
		},

		warningIssued = 0;

	return function(resource, callback) {
		if(bc.symbol){
			if(resource.tag.report){
				if(bc.symbol === 'short'){
					bc.symbolTable = {};
					resource.reports.push({
						dir:".",
						filename:"symboltable.txt",
						content: function(){
							var symbolText = [], key, symtbl = bc.symbolTable;
							for(key in symtbl){
								symbolText.push(key + ": \"" + symtbl[key] + "\"" + bc.newline);
							}
							return symbolText.join('');
						}
					});
				}
			}else{
				if(!warningIssued){
					warningIssued = 1;
					bc.log("symbolsLeak", []);
				}
				fileUtils.ensureDirectoryByFilename(resource.dest);
				resource.text = insertSymbols(resource, bc.symbolTable);
			}
		}
		return 0;
	};
});

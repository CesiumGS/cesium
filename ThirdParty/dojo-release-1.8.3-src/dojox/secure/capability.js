dojo.provide("dojox.secure.capability");

dojox.secure.badProps = /^__|^(apply|call|callee|caller|constructor|eval|prototype|this|unwatch|valueOf|watch)$|__$/;
dojox.secure.capability = {
	keywords: ["break", "case", "catch", "const", "continue","debugger", "default", "delete", "do",
		 "else", "enum","false", "finally", "for", "function","if", "in", "instanceof", "new",
		 "null","yield","return", "switch",
		 "throw", "true", "try", "typeof", "var", "void", "while"],
	validate : function(/*string*/script,/*Array*/safeLibraries,/*Object*/safeGlobals) {
		// summary:
		//		pass in the text of a script. If it passes and it can be eval'ed, it should be safe.
		//		Note that this does not do full syntax checking, it relies on eval to reject invalid scripts.
		//		There are also known false rejections:
		//
		//		- Nesting vars inside blocks will not declare the variable for the outer block
		// 	 	- Named functions are not treated as declaration so they are generally not allowed unless the name is declared with a var.
		//		- Var declaration that involve multiple comma delimited variable assignments are not accepted
		// script:
		//		 the script to execute
		// safeLibraries:
		//		The safe libraries that can be called (the functions can not be access/modified by the untrusted code, only called)
		// safeGlobals:
		//		These globals can be freely interacted with by the untrusted code
		
	
		var keywords = this.keywords;
		for (var i = 0; i < keywords.length; i++) {
			safeGlobals[keywords[i]]=true;
		}
		var badThis = "|this| keyword in object literal without a Class call";
		var blocks = []; // keeps track of the outer references from each inner block
		if(script.match(/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\uff00-\uffff]/)){
			throw new Error("Illegal unicode characters detected");
		}
		if(script.match(/\/\*@cc_on/)){
			throw new Error("Conditional compilation token is not allowed");
		}
		script = script.replace(/\\["'\\\/bfnrtu]/g, '@'). // borrows some tricks from json.js
			// now clear line comments, block comments, regular expressions, and strings.
			// By doing it all at once, the regular expression uses left to right parsing, and the most
			// left token is read first. It is also more compact.
			replace(/\/\/.*|\/\*[\w\W]*?\*\/|("[^"]*")|('[^']*')/g,function(t) {
				return t.match(/^\/\/|^\/\*/) ? ' ' : '0'; // comments are replaced with a space, strings and regex are replaced with a single safe token (0)
			}).
			replace(/\.\s*([a-z\$_A-Z][\w\$_]*)|([;,{])\s*([a-z\$_A-Z][\w\$_]*\s*):/g,function(t,prop,prefix,key) {
				// find all the dot property references, all the object literal keys, and labels
				prop = prop || key;
				if(/^__|^(apply|call|callee|caller|constructor|eval|prototype|this|unwatch|valueOf|watch)$|__$/.test(prop)){
					throw new Error("Illegal property name " + prop);
				}
				return (prefix && (prefix + "0:")) || '~'; // replace literal keys with 0: and replace properties with the innocuous ~
			});
		script.replace(/([^\[][\]\}]\s*=)|((\Wreturn|\S)\s*\[\s*\+?)|([^=!][=!]=[^=])/g,function(oper) {// check for illegal operator usages
			if(!oper.match(/((\Wreturn|[=\&\|\:\?\,])\s*\[)|\[\s*\+$/)){ // the whitelist for [ operator for array initializer context or [+num] syntax
				throw new Error("Illegal operator " + oper.substring(1));
			}
		});
		script = script.replace(new RegExp("(" + safeLibraries.join("|") + ")[\\s~]*\\(","g"),function(call) { // find library calls and make them look safe
			return "new("; // turn into a known safe call
		});
		function findOuterRefs(block,func) {
			var outerRefs = {};
			block.replace(/#\d+/g,function(b) { // graft in the outer references from the inner scopes
				var refs = blocks[b.substring(1)];
				for (var i in refs) {
					if(i == badThis) {
						throw i;
					}
					if(i == 'this' && refs[':method'] && refs['this'] == 1) {
						// if we are in an object literal the function may be a bindable method, this must only be in the local scope
						i = badThis;
					}
					if(i != ':method'){
						outerRefs[i] = 2; // the reference is more than just local
					}
				}
			});
			block.replace(/(\W|^)([a-z_\$A-Z][\w_\$]*)/g,function(t,a,identifier) { // find all the identifiers
				if(identifier.charAt(0)=='_'){
					throw new Error("Names may not start with _");
				}
				outerRefs[identifier] = 1;
			});
			return outerRefs;
		}
		var newScript,outerRefs;
		function parseBlock(t,func,a,b,params,block) {
			block.replace(/(^|,)0:\s*function#(\d+)/g,function(t,a,b) { // find functions in object literals
			// note that if named functions are allowed, it could be possible to have label: function name() {} which is a security breach
					var refs = blocks[b];
					refs[':method'] = 1;//mark it as a method
			});
			block = block.replace(/(^|[^_\w\$])Class\s*\(\s*([_\w\$]+\s*,\s*)*#(\d+)/g,function(t,p,a,b) { // find Class calls
					var refs = blocks[b];
					delete refs[badThis];
					return (p||'') + (a||'') + "#" + b;
			});
			outerRefs = findOuterRefs(block,func); // find the variables in this block
			function parseVars(t,a,b,decl) { // find var decls
				decl.replace(/,?([a-z\$A-Z][_\w\$]*)/g,function(t,identifier) {
					if(identifier == 'Class'){
						throw new Error("Class is reserved");
					}
					delete outerRefs[identifier]; // outer reference is safely referenced here
				});
			}
			
			if(func) {
				parseVars(t,a,a,params); // the parameters are declare variables
			}
			block.replace(/(\W|^)(var) ([ \t,_\w\$]+)/g,parseVars); // and vars declare variables
			// FIXME: Give named functions #name syntax so they can be detected as vars in outer scopes (but be careful of nesting)
			return (a || '') + (b || '') + "#" + (blocks.push(outerRefs)-1); // return a block reference so the outer block can fetch it
		}
		do {
			// get all the blocks, starting with inside and moving out, capturing the parameters of functions and catchs as variables along the way
			newScript = script.replace(/((function|catch)(\s+[_\w\$]+)?\s*\(([^\)]*)\)\s*)?{([^{}]*)}/g, parseBlock);
		}
		while(newScript != script && (script = newScript)); // keep going until we can't find anymore blocks
		parseBlock(0,0,0,0,0,script); //findOuterRefs(script); // find the references in the outside scope
		for (i in outerRefs) {
			if(!(i in safeGlobals)) {
				throw new Error("Illegal reference to " + i);
			}
		}
		
	}
};
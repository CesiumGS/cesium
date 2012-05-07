dojo.provide("dojox.jsonPath.query");

dojox.jsonPath.query = function(/*Object*/obj, /*String*/expr, /*Object*/arg){
	// summaRy
	// 	Perform jsonPath query `expr` on javascript object or json string `obj`
	//	obj - object || json string to perform query on
	//	expr - jsonPath expression (string) to be evaluated
	//	arg - {}special arugments.
	//		resultType: "VALUE"||"BOTH"||"PATH"} (defaults to value)
	//		evalType: "RESULT"||"ITEM"} (defaults to ?)

	var re = dojox.jsonPath._regularExpressions;
	if (!arg){arg={};}

	var strs = [];
	function _str(i){ return strs[i];}
	var acc;
	if (arg.resultType == "PATH" && arg.evalType == "RESULT") throw Error("RESULT based evaluation not supported with PATH based results");
	var P = {
		resultType: arg.resultType || "VALUE",
		normalize: function(expr){
			var subx = [];
			expr = expr.replace(/'([^']|'')*'/g, function(t){return "_str("+(strs.push(eval(t))-1)+")";});
			var ll = -1;
			while(ll!=subx.length){
				ll=subx.length;//TODO: Do expression syntax checking
				expr = expr.replace(/(\??\([^\(\)]*\))/g, function($0){return "#"+(subx.push($0)-1);});
			}
			expr = expr.replace(/[\['](#[0-9]+)[\]']/g,'[$1]')
						  .replace(/'?\.'?|\['?/g, ";")
						  .replace(/;;;|;;/g, ";..;")
						  .replace(/;$|'?\]|'$/g, "");
			ll = -1;
			while(ll!=expr){
				ll=expr;
					 expr = expr.replace(/#([0-9]+)/g, function($0,$1){return subx[$1];});
			}
			return expr.split(";");
		},
		asPaths: function(paths){
			for (var j=0;j<paths.length;j++){
			var p = "$";
			var x= paths[j];
			for (var i=1,n=x.length; i<n; i++)
				p += /^[0-9*]+$/.test(x[i]) ? ("["+x[i]+"]") : ("['"+x[i]+"']");
			paths[j]=p;
		  }
			return paths;
		},
		exec: function(locs, val, rb){
			var path = ['$'];
			var result=rb?val:[val];
			var paths=[path];
			function add(v, p,def){
			  if (v && v.hasOwnProperty(p) && P.resultType != "VALUE") paths.push(path.concat([p]));
				if (def)
				  result = v[p];
			  else if (v && v.hasOwnProperty(p))
					result.push(v[p]);
			}
			function desc(v){
				result.push(v);
				paths.push(path);
				P.walk(v,function(i){
					if (typeof v[i] ==='object')  {
						var oldPath = path;
						path = path.concat(i);
						desc(v[i]);
						path = oldPath;
					}
				});
			}
			function slice(loc, val){
				if (val instanceof Array){
					var len=val.length, start=0, end=len, step=1;
					loc.replace(/^(-?[0-9]*):(-?[0-9]*):?(-?[0-9]*)$/g, function($0,$1,$2,$3){start=parseInt($1||start);end=parseInt($2||end);step=parseInt($3||step);});
					start = (start < 0) ? Math.max(0,start+len) : Math.min(len,start);
					end = (end < 0) ? Math.max(0,end+len) : Math.min(len,end);
				  	for (var i=start; i<end; i+=step)
						add(val,i);
				}
			}
			function repStr(str){
				var i=loc.match(/^_str\(([0-9]+)\)$/);
				return i?strs[i[1]]:str;
			}
			function oper(val){
				if (/^\(.*?\)$/.test(loc)) // [(expr)]
					add(val, P.eval(loc, val),rb);
				else if (loc === "*"){
					P.walk(val, rb && val instanceof Array ? // if it is result based, there is no point to just return the same array
					function(i){P.walk(val[i],function(j){ add(val[i],j); })} :
					function(i){ add(val,i); });
				}
				else if (loc === "..")
					desc(val);
				else if (/,/.test(loc)){ // [name1,name2,...]
					for (var s=loc.split(/'?,'?/),i=0,n=s.length; i<n; i++)
						add(val,repStr(s[i]));
				}
				else if (/^\?\(.*?\)$/.test(loc)) // [?(expr)]
					P.walk(val, function(i){ if (P.eval(loc.replace(/^\?\((.*?)\)$/,"$1"),val[i])) add(val,i); });
				else if (/^(-?[0-9]*):(-?[0-9]*):?([0-9]*)$/.test(loc)) // [start:end:step]  python slice syntax
					slice(loc, val);
				else {
					loc=repStr(loc);
					if (rb && val instanceof Array && !/^[0-9*]+$/.test(loc))
						P.walk(val, function(i){ add(val[i], loc)});
					else
						add(val,loc,rb);
				}

			}
			while (locs.length){
				var loc = locs.shift();
				if ((val = result) === null || val===undefined) return val;
				result = [];
				var valPaths = paths;
				paths = [];
				if (rb)
					oper(val)
				else
					P.walk(val,function(i){path=valPaths[i]||path;oper(val[i])});
			}
			if (P.resultType == "BOTH"){
				paths = P.asPaths(paths);
				var newResult = [];
				for (var i =0;i <paths.length;i++)
					newResult.push({path:paths[i],value:result[i]});
				return newResult;
			}
			return P.resultType == "PATH" ? P.asPaths(paths):result;
		},
		walk: function(val, f){
			if (val instanceof Array){
				for (var i=0,n=val.length; i<n; i++)
					if (i in val)
						f(i);
			}
			else if (typeof val === "object"){
				for (var m in val)
					if (val.hasOwnProperty(m))
						f(m);
			}
		},
		eval: function(x, _v){
			try { return $ && _v && eval(x.replace(/@/g,'_v')); }
			catch(e){ throw new SyntaxError("jsonPath: " + e.message + ": " + x.replace(/@/g, "_v").replace(/\^/g, "_a")); }
		}
	};

	var $ = obj;
	if (expr && obj){
		return P.exec(P.normalize(expr).slice(1), obj, arg.evalType == "RESULT");
	}

	return false;

};

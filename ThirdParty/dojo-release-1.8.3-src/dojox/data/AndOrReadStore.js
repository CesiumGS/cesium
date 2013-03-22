define(["dojo/_base/declare", "dojo/_base/lang", "dojo/data/ItemFileReadStore", "dojo/data/util/filter", "dojo/_base/array", "dojo/_base/json"],
  function(declare, lang, ItemFileReadStore, filterUtil, array, json) {
  
// module:
//		dojox/data/AndOrReadStore
// summary:
//		TODOC

return declare("dojox.data.AndOrReadStore", [ItemFileReadStore], {
	// summary:
	//		AndOrReadStore uses ItemFileReadStore as a base, modifying only the query (_fetchItems) section.
	//		Supports queries of the form: query:"id:1* OR dept:'Sales Department' || (id:2* && NOT dept:S*)"
	//		Includes legacy/widget support via:
	// |		query:{complexQuery:"id:1* OR dept:'Sales Department' || (id:2* && NOT dept:S*)"}
	//		The ItemFileReadStore implements the dojo/data/api/Read API and reads
	//		data from JSON files that have contents in this format --
	// |	{ items: [
	// |		{ name:'Kermit', color:'green', age:12, friends:['Gonzo', {_reference:{name:'Fozzie Bear'}}]},
	// |		{ name:'Fozzie Bear', wears:['hat', 'tie']},
	// |		{ name:'Miss Piggy', pets:'Foo-Foo'}
	// |	]}
	//		Note that it can also contain an 'identifier' property that specified which attribute on the items
	//		in the array of items that acts as the unique identifier for that item.

	_containsValue: function(/*dojo/data/api/Item*/ item, /*attribute-name-string */ attribute, /*anything*/ value,
			/*String|RegExp?*/ regexp){
		// summary:
		//		Internal function for looking at the values contained by the item.
		// description:
		//		Internal function for looking at the values contained by the item.  This
		//		function allows for denoting if the comparison should be case sensitive for
		//		strings or not (for handling filtering cases where string case should not matter)
		// item:
		//		The data item to examine for attribute values.
		// attribute:
		//		The attribute to inspect.
		// value:
		//		The value to match.
		// regexp:
		//		Optional string or regular expression generated off value if value was of string type to handle wildcarding.
		//		If present and attribute values are string, then it can be used for comparison instead of 'value'
		//		If RegExp is a string, it is treated as an comparison statement and eval for number comparisons
		return array.some(this.getValues(item, attribute), function(possibleValue){
			// if string... eval for math operator comparisons
			if(lang.isString(regexp)){
				return eval(regexp);
			}else if(possibleValue !== null && !lang.isObject(possibleValue) && regexp){
				if(possibleValue.toString().match(regexp)){
					return true; // Boolean
				}
			} else if(value === possibleValue){
				return true; // Boolean
			} else {
				return false;
			}
		});
	},

	filter: function(requestArgs, arrayOfItems, findCallback){
		var items = [];
		if(requestArgs.query){
			//Complete copy, we may have to mess with it.
			//Safer than clone, which does a shallow copy, I believe.
			var query = json.fromJson(json.toJson(requestArgs.query));
			//Okay, object form query, we have to check to see if someone mixed query methods (such as using FilteringSelect
			//with a complexQuery).  In that case, the params need to be anded to the complex query statement.
			//See defect #7980
			if(typeof query == "object" ){
				var count = 0;
				var p;
				for(p in query){
					count++;
				}
				if(count > 1 && query.complexQuery){
					var cq = query.complexQuery;
					var wrapped = false;
					for(p in query){
						if(p !== "complexQuery"){
							//We should wrap this in () as it should and with the entire complex query
							//Not just part of it.
							if(!wrapped){
								cq = "( " + cq + " )";
								wrapped = true;
							}
							//Make sure strings are quoted when going into complexQuery merge.
							var v = requestArgs.query[p];
							if(lang.isString(v)){
								v = "'" + v + "'";
							}
							cq += " AND " + p + ":" + v;
							delete query[p];

						}
					}
					query.complexQuery = cq;
				}
			}

			var ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : false;
			//for complex queries only:  pattern = query[:|=]"NOT id:23* AND (type:'test*' OR dept:'bob') && !filed:true"
			//logical operators are case insensitive:  , NOT AND OR ( ) ! && ||  // "," included for quoted/string legacy queries.
			if(typeof query != "string"){
				query = json.toJson(query);
				query = query.replace(/\\\\/g,"\\"); //counter toJson expansion of backslashes, e.g., foo\\*bar test.
			}
			query = query.replace(/\\"/g,"\"");   //ditto, for embedded \" in lieu of " availability.
			var complexQuery = lang.trim(query.replace(/{|}/g,"")); //we can handle these, too.
			var pos2, i;
			if(complexQuery.match(/"? *complexQuery *"?:/)){ //case where widget required a json object, so use complexQuery:'the real query'
				complexQuery = lang.trim(complexQuery.replace(/"?\s*complexQuery\s*"?:/,""));
				var quotes = ["'",'"'];
				var pos1,colon;
				var flag = false;
				for(i = 0; i<quotes.length; i++){
					pos1 = complexQuery.indexOf(quotes[i]);
					pos2 = complexQuery.indexOf(quotes[i],1);
					colon = complexQuery.indexOf(":",1);
					if(pos1 === 0 && pos2 != -1 && colon < pos2){
						flag = true;
						break;
					} //first two sets of quotes don't occur before the first colon.
				}
				if(flag){	//dojo.toJson, and maybe user, adds surrounding quotes, which we need to remove.
					complexQuery = complexQuery.replace(/^\"|^\'|\"$|\'$/g,"");
				}
			} //end query="{complexQuery:'id:1* || dept:Sales'}" parsing (for when widget required json object query).
			var complexQuerySave = complexQuery;
			//valid logical operators.
			var begRegExp = /^>=|^<=|^<|^>|^,|^NOT |^AND |^OR |^\(|^\)|^!|^&&|^\|\|/i; //trailing space on some tokens on purpose.
			var sQuery = ""; //will be eval'ed for each i-th candidateItem, based on query components.
			var op = "";
			var val = "";
			var pos = -1;
			var err = false;
			var key = "";
			var value = "";
			var tok = "";
			pos2 = -1;
			for(i = 0; i < arrayOfItems.length; ++i){
				var match = true;
				var candidateItem = arrayOfItems[i];
				if(candidateItem === null){
					match = false;
				}else{
					//process entire string for this i-th candidateItem.
					complexQuery = complexQuerySave; //restore query for next candidateItem.
					sQuery = "";
					//work left to right, finding either key:value pair or logical operator at the beginning of the complexQuery string.
					//when found, concatenate to sQuery and remove from complexQuery and loop back.
					while(complexQuery.length > 0 && !err){
						op = complexQuery.match(begRegExp);

						//get/process/append one or two leading logical operators.
						while(op && !err){ //look for leading logical operators.
							complexQuery = lang.trim(complexQuery.replace(op[0],""));
							op = lang.trim(op[0]).toUpperCase();
							//convert some logical operators to their javascript equivalents for later eval.
							op = op == "NOT" ? "!" : op == "AND" || op == "," ? "&&" : op == "OR" ? "||" : op;
							op = " " + op + " ";
							sQuery += op;
							op = complexQuery.match(begRegExp);
						}//end op && !err

						//now get/process/append one key:value pair.
						if(complexQuery.length > 0){
							var opsRegex = /:|>=|<=|>|</g,
								matches = complexQuery.match(opsRegex),
								match = matches && matches.shift(),
								regex;

							pos = complexQuery.indexOf(match);
							if(pos == -1){
								err = true;
								break;
							}else{
								key = lang.trim(complexQuery.substring(0,pos).replace(/\"|\'/g,""));
								complexQuery = lang.trim(complexQuery.substring(pos + match.length));
								tok = complexQuery.match(/^\'|^\"/);	//quoted?
								if(tok){
									tok = tok[0];
									pos = complexQuery.indexOf(tok);
									pos2 = complexQuery.indexOf(tok,pos + 1);
									if(pos2 == -1){
										err = true;
										break;
									}
									value = complexQuery.substring(pos + match.length,pos2);
									if(pos2 == complexQuery.length - 1){ //quote is last character
										complexQuery = "";
									}else{
										complexQuery = lang.trim(complexQuery.substring(pos2 + 1));
									}
									if (match != ':') {
										regex = this.getValue(candidateItem, key) + match + value;
									} else {
										regex = filterUtil.patternToRegExp(value, ignoreCase);
									}
									sQuery += this._containsValue(candidateItem, key, value, regex);
								}
								else{ //not quoted, so a space, comma, or closing parens (or the end) will be the break.
									tok = complexQuery.match(/\s|\)|,/);
									if(tok){
										var pos3 = new Array(tok.length);
										for(var j = 0;j<tok.length;j++){
											pos3[j] = complexQuery.indexOf(tok[j]);
										}
										pos = pos3[0];
										if(pos3.length > 1){
											for(var j=1;j<pos3.length;j++){
												pos = Math.min(pos,pos3[j]);
											}
										}
										value = lang.trim(complexQuery.substring(0,pos));
										complexQuery = lang.trim(complexQuery.substring(pos));
									}else{ //not a space, so must be at the end of the complexQuery.
										value = lang.trim(complexQuery);
										complexQuery = "";
									} //end  inner if(tok) else
									if (match != ':') {
										regex = this.getValue(candidateItem, key) + match + value;
									} else {
										regex = filterUtil.patternToRegExp(value, ignoreCase);
										console.log("regex value: ", value, " regex pattern: ", regex);
									}
									sQuery += this._containsValue(candidateItem, key, value, regex);
								} //end outer if(tok) else
							} //end found ":"
						} //end if(complexQuery.length > 0)
					} //end while complexQuery.length > 0 && !err, so finished the i-th item.
					match = eval(sQuery);
				} //end else is non-null candidateItem.
				if(match){
					items.push(candidateItem);
				}
			} //end for/next of all items.
			if(err){
				//soft fail.
				items = [];
				console.log("The store's _fetchItems failed, probably due to a syntax error in query.");
			}
		}else{
			// No query...
			// We want a copy to pass back in case the parent wishes to sort the array.
			// We shouldn't allow resort of the internal list, so that multiple callers
			// can get lists and sort without affecting each other.  We also need to
			// filter out any null values that have been left as a result of deleteItem()
			// calls in ItemFileWriteStore.
			for(var i = 0; i < arrayOfItems.length; ++i){
				var item = arrayOfItems[i];
				if(item !== null){
					items.push(item);
				}
			}
		} //end if there is a query.
		findCallback(items, requestArgs);
	} //end filter function

});

});

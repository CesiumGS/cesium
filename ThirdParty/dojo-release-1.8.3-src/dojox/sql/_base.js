dojo.provide("dojox.sql._base");
dojo.require("dojox.sql._crypto");

dojo.mixin(dojox.sql, {
	// summary:
	//		Executes a SQL expression.
	// description:
	// 		There are four ways to call this:
	//
	// 		1. Straight SQL: dojox.sql("SELECT * FROM FOOBAR");
	// 		2. SQL with parameters: dojox.sql("INSERT INTO FOOBAR VALUES (?)", someParam)
	// 		3. Encrypting particular values:
	//			dojox.sql("INSERT INTO FOOBAR VALUES (ENCRYPT(?))", someParam, "somePassword", callback)
	// 		4. Decrypting particular values:
	//	|		dojox.sql("SELECT DECRYPT(SOMECOL1), DECRYPT(SOMECOL2) FROM
	//	|				FOOBAR WHERE SOMECOL3 = ?", someParam,
	//	|				"somePassword", callback)
	//
	// 		For encryption and decryption the last two values should be the the password for
	// 		encryption/decryption, and the callback function that gets the result set.
	//
	// 		Note: We only support ENCRYPT(?) statements, and
	// 		and DECRYPT(*) statements for now -- you can not have a literal string
	// 		inside of these, such as ENCRYPT('foobar')
	//
	// 		Note: If you have multiple columns to encrypt and decrypt, you can use the following
	// 		convenience form to not have to type ENCRYPT(?)/DECRYPT(*) many times:
	//
	// | 	dojox.sql("INSERT INTO FOOBAR VALUES (ENCRYPT(?, ?, ?))",
	// |					someParam1, someParam2, someParam3,
	// |					"somePassword", callback)
	// |
	// | 	dojox.sql("SELECT DECRYPT(SOMECOL1, SOMECOL2) FROM
	// |				FOOBAR WHERE SOMECOL3 = ?", someParam,
	// |				"somePassword", callback)

	dbName: null,
	
	// debug: Boolean
	//		If true, then we print out any SQL that is executed
	//		to the debug window
	debug: (dojo.exists("dojox.sql.debug") ? dojox.sql.debug:false),

	open: function(dbName){
		if(this._dbOpen && (!dbName || dbName == this.dbName)){
			return;
		}
		
		if(!this.dbName){
			this.dbName = "dot_store_"
				+ window.location.href.replace(/[^0-9A-Za-z_]/g, "_");
			// database names in Gears are limited to 64 characters long
			if(this.dbName.length > 63){
			  this.dbName = this.dbName.substring(0, 63);
			}
		}
		
		if(!dbName){
			dbName = this.dbName;
		}
		
		try{
			this._initDb();
			this.db.open(dbName);
			this._dbOpen = true;
		}catch(exp){
			throw exp.message||exp;
		}
	},

	close: function(dbName){
		// on Internet Explorer, Google Gears throws an exception
		// "Object not a collection", when we try to close the
		// database -- just don't close it on this platform
		// since we are running into a Gears bug; the Gears team
		// said it's ok to not close a database connection
		if(dojo.isIE){ return; }
		
		if(!this._dbOpen && (!dbName || dbName == this.dbName)){
			return;
		}
		
		if(!dbName){
			dbName = this.dbName;
		}
		
		try{
			this.db.close(dbName);
			this._dbOpen = false;
		}catch(exp){
			throw exp.message||exp;
		}
	},
	
	_exec: function(params){
		try{
			// get the Gears Database object
			this._initDb();
		
			// see if we need to open the db; if programmer
			// manually called dojox.sql.open() let them handle
			// it; otherwise we open and close automatically on
			// each SQL execution
			if(!this._dbOpen){
				this.open();
				this._autoClose = true;
			}
		
			// determine our parameters
			var sql = null;
			var callback = null;
			var password = null;

			var args = dojo._toArray(params);

			sql = args.splice(0, 1)[0];

			// does this SQL statement use the ENCRYPT or DECRYPT
			// keywords? if so, extract our callback and crypto
			// password
			if(this._needsEncrypt(sql) || this._needsDecrypt(sql)){
				callback = args.splice(args.length - 1, 1)[0];
				password = args.splice(args.length - 1, 1)[0];
			}

			// 'args' now just has the SQL parameters

			// print out debug SQL output if the developer wants that
			if(this.debug){
				this._printDebugSQL(sql, args);
			}

			// handle SQL that needs encryption/decryption differently
			// do we have an ENCRYPT SQL statement? if so, handle that first
			var crypto;
			if(this._needsEncrypt(sql)){
				crypto = new dojox.sql._SQLCrypto("encrypt", sql,
													password, args,
													callback);
				return null; // encrypted results will arrive asynchronously
			}else if(this._needsDecrypt(sql)){ // otherwise we have a DECRYPT statement
				crypto = new dojox.sql._SQLCrypto("decrypt", sql,
													password, args,
													callback);
				return null; // decrypted results will arrive asynchronously
			}

			// execute the SQL and get the results
			var rs = this.db.execute(sql, args);
			
			// Gears ResultSet object's are ugly -- normalize
			// these into something JavaScript programmers know
			// how to work with, basically an array of
			// JavaScript objects where each property name is
			// simply the field name for a column of data
			rs = this._normalizeResults(rs);
		
			if(this._autoClose){
				this.close();
			}
		
			return rs;
		}catch(exp){
			exp = exp.message||exp;
			
			console.debug("SQL Exception: " + exp);
			
			if(this._autoClose){
				try{
					this.close();
				}catch(e){
					console.debug("Error closing database: "
									+ e.message||e);
				}
			}
		
			throw exp;
		}
		
		return null;
	},

	_initDb: function(){
		if(!this.db){
			try{
				this.db = google.gears.factory.create('beta.database', '1.0');
			}catch(exp){
				dojo.setObject("google.gears.denied", true);
				if(dojox.off){
				  dojox.off.onFrameworkEvent("coreOperationFailed");
				}
				throw "Google Gears must be allowed to run";
			}
		}
	},

	_printDebugSQL: function(sql, args){
		var msg = "dojox.sql(\"" + sql + "\"";
		for(var i = 0; i < args.length; i++){
			if(typeof args[i] == "string"){
				msg += ", \"" + args[i] + "\"";
			}else{
				msg += ", " + args[i];
			}
		}
		msg += ")";
	
		console.debug(msg);
	},

	_normalizeResults: function(rs){
		var results = [];
		if(!rs){ return []; }
	
		while(rs.isValidRow()){
			var row = {};
		
			for(var i = 0; i < rs.fieldCount(); i++){
				var fieldName = rs.fieldName(i);
				var fieldValue = rs.field(i);
				row[fieldName] = fieldValue;
			}
		
			results.push(row);
		
			rs.next();
		}
	
		rs.close();
		
		return results;
	},

	_needsEncrypt: function(sql){
		return /encrypt\([^\)]*\)/i.test(sql);
	},

	_needsDecrypt: function(sql){
		return /decrypt\([^\)]*\)/i.test(sql);
	}
});

dojo.declare("dojox.sql._SQLCrypto", null, {
	// summary:
	//		A private class encapsulating any cryptography that must be done
	// 		on a SQL statement. We instantiate this class and have it hold
	//		it's state so that we can potentially have several encryption
	//		operations happening at the same time by different SQL statements.
	constructor: function(action, sql, password, args, callback){
		if(action == "encrypt"){
			this._execEncryptSQL(sql, password, args, callback);
		}else{
			this._execDecryptSQL(sql, password, args, callback);
		}
	},
	
	_execEncryptSQL: function(sql, password, args, callback){
		// strip the ENCRYPT/DECRYPT keywords from the SQL
		var strippedSQL = this._stripCryptoSQL(sql);
	
		// determine what arguments need encryption
		var encryptColumns = this._flagEncryptedArgs(sql, args);
	
		// asynchronously encrypt each argument that needs it
		var self = this;
		this._encrypt(strippedSQL, password, args, encryptColumns, function(finalArgs){
			// execute the SQL
			var error = false;
			var resultSet = [];
			var exp = null;
			try{
				resultSet = dojox.sql.db.execute(strippedSQL, finalArgs);
			}catch(execError){
				error = true;
				exp = execError.message||execError;
			}
		
			// was there an error during SQL execution?
			if(exp != null){
				if(dojox.sql._autoClose){
					try{ dojox.sql.close(); }catch(e){}
				}
			
				callback(null, true, exp.toString());
				return;
			}
		
			// normalize SQL results into a JavaScript object
			// we can work with
			resultSet = dojox.sql._normalizeResults(resultSet);
		
			if(dojox.sql._autoClose){
				dojox.sql.close();
			}
				
			// are any decryptions necessary on the result set?
			if(dojox.sql._needsDecrypt(sql)){
				// determine which of the result set columns needs decryption
	 			var needsDecrypt = self._determineDecryptedColumns(sql);

				// now decrypt columns asynchronously
				// decrypt columns that need it
				self._decrypt(resultSet, needsDecrypt, password, function(finalResultSet){
					callback(finalResultSet, false, null);
				});
			}else{
				callback(resultSet, false, null);
			}
		});
	},

	_execDecryptSQL: function(sql, password, args, callback){
		// strip the ENCRYPT/DECRYPT keywords from the SQL
		var strippedSQL = this._stripCryptoSQL(sql);
	
		// determine which columns needs decryption; this either
		// returns the value *, which means all result set columns will
		// be decrypted, or it will return the column names that need
		// decryption set on a hashtable so we can quickly test a given
		// column name; the key is the column name that needs
		// decryption and the value is 'true' (i.e. needsDecrypt["someColumn"]
		// would return 'true' if it needs decryption, and would be 'undefined'
		// or false otherwise)
		var needsDecrypt = this._determineDecryptedColumns(sql);
	
		// execute the SQL
		var error = false;
		var resultSet = [];
		var exp = null;
		try{
			resultSet = dojox.sql.db.execute(strippedSQL, args);
		}catch(execError){
			error = true;
			exp = execError.message||execError;
		}
	
		// was there an error during SQL execution?
		if(exp != null){
			if(dojox.sql._autoClose){
				try{ dojox.sql.close(); }catch(e){}
			}
		
			callback(resultSet, true, exp.toString());
			return;
		}
	
		// normalize SQL results into a JavaScript object
		// we can work with
		resultSet = dojox.sql._normalizeResults(resultSet);
	
		if(dojox.sql._autoClose){
			dojox.sql.close();
		}
	
		// decrypt columns that need it
		this._decrypt(resultSet, needsDecrypt, password, function(finalResultSet){
			callback(finalResultSet, false, null);
		});
	},

	_encrypt: function(sql, password, args, encryptColumns, callback){
		//console.debug("_encrypt, sql="+sql+", password="+password+", encryptColumns="+encryptColumns+", args="+args);
	
		this._totalCrypto = 0;
		this._finishedCrypto = 0;
		this._finishedSpawningCrypto = false;
		this._finalArgs = args;
	
		for(var i = 0; i < args.length; i++){
			if(encryptColumns[i]){
				// we have an encrypt() keyword -- get just the value inside
				// the encrypt() parantheses -- for now this must be a ?
				var sqlParam = args[i];
				var paramIndex = i;
			
				// update the total number of encryptions we know must be done asynchronously
				this._totalCrypto++;
			
				// FIXME: This currently uses DES as a proof-of-concept since the
				// DES code used is quite fast and was easy to work with. Modify dojox.sql
				// to be able to specify a different encryption provider through a
				// a SQL-like syntax, such as dojox.sql("SET ENCRYPTION BLOWFISH"),
				// and modify the dojox.crypto.Blowfish code to be able to work using
				// a Google Gears Worker Pool
			
				// do the actual encryption now, asychronously on a Gears worker thread
				dojox.sql._crypto.encrypt(sqlParam, password, dojo.hitch(this, function(results){
					// set the new encrypted value
					this._finalArgs[paramIndex] = results;
					this._finishedCrypto++;
					// are we done with all encryption?
					if(this._finishedCrypto >= this._totalCrypto
						&& this._finishedSpawningCrypto){
						callback(this._finalArgs);
					}
				}));
			}
		}
	
		this._finishedSpawningCrypto = true;
	},

	_decrypt: function(resultSet, needsDecrypt, password, callback){
		//console.debug("decrypt, resultSet="+resultSet+", needsDecrypt="+needsDecrypt+", password="+password);
		
		this._totalCrypto = 0;
		this._finishedCrypto = 0;
		this._finishedSpawningCrypto = false;
		this._finalResultSet = resultSet;
	
		for(var i = 0; i < resultSet.length; i++){
			var row = resultSet[i];
		
			// go through each of the column names in row,
			// seeing if they need decryption
			for(var columnName in row){
				if(needsDecrypt == "*" || needsDecrypt[columnName]){
					this._totalCrypto++;
					var columnValue = row[columnName];
				
					// forming a closure here can cause issues, with values not cleanly
					// saved on Firefox/Mac OS X for some of the values above that
					// are needed in the callback below; call a subroutine that will form
					// a closure inside of itself instead
					this._decryptSingleColumn(columnName, columnValue, password, i,
												function(finalResultSet){
						callback(finalResultSet);
					});
				}
			}
		}
	
		this._finishedSpawningCrypto = true;
	},

	_stripCryptoSQL: function(sql){
		// replace all DECRYPT(*) occurrences with a *
		sql = sql.replace(/DECRYPT\(\*\)/ig, "*");
	
		// match any ENCRYPT(?, ?, ?, etc) occurrences,
		// then replace with just the question marks in the
		// middle
		var matches = sql.match(/ENCRYPT\([^\)]*\)/ig);
		if(matches != null){
			for(var i = 0; i < matches.length; i++){
				var encryptStatement = matches[i];
				var encryptValue = encryptStatement.match(/ENCRYPT\(([^\)]*)\)/i)[1];
				sql = sql.replace(encryptStatement, encryptValue);
			}
		}
	
		// match any DECRYPT(COL1, COL2, etc) occurrences,
		// then replace with just the column names
		// in the middle
		matches = sql.match(/DECRYPT\([^\)]*\)/ig);
		if(matches != null){
			for(i = 0; i < matches.length; i++){
				var decryptStatement = matches[i];
				var decryptValue = decryptStatement.match(/DECRYPT\(([^\)]*)\)/i)[1];
				sql = sql.replace(decryptStatement, decryptValue);
			}
		}
	
		return sql;
	},

	_flagEncryptedArgs: function(sql, args){
		// capture literal strings that have question marks in them,
		// and also capture question marks that stand alone
		var tester = new RegExp(/([\"][^\"]*\?[^\"]*[\"])|([\'][^\']*\?[^\']*[\'])|(\?)/ig);
		var matches;
		var currentParam = 0;
		var results = [];
		while((matches = tester.exec(sql)) != null){
			var currentMatch = RegExp.lastMatch+"";

			// are we a literal string? then ignore it
			if(/^[\"\']/.test(currentMatch)){
				continue;
			}

			// do we have an encrypt keyword to our left?
			var needsEncrypt = false;
			if(/ENCRYPT\([^\)]*$/i.test(RegExp.leftContext)){
				needsEncrypt = true;
			}

			// set the encrypted flag
			results[currentParam] = needsEncrypt;

			currentParam++;
		}
	
		return results;
	},

	_determineDecryptedColumns: function(sql){
		var results = {};

		if(/DECRYPT\(\*\)/i.test(sql)){
			results = "*";
		}else{
			var tester = /DECRYPT\((?:\s*\w*\s*\,?)*\)/ig;
			var matches = tester.exec(sql);
			while(matches){
				var lastMatch = new String(RegExp.lastMatch);
				var columnNames = lastMatch.replace(/DECRYPT\(/i, "");
				columnNames = columnNames.replace(/\)/, "");
				columnNames = columnNames.split(/\s*,\s*/);
				dojo.forEach(columnNames, function(column){
					if(/\s*\w* AS (\w*)/i.test(column)){
						column = column.match(/\s*\w* AS (\w*)/i)[1];
					}
					results[column] = true;
				});
				
				matches = tester.exec(sql)
			}
		}

		return results;
	},

	_decryptSingleColumn: function(columnName, columnValue, password, currentRowIndex,
											callback){
		//console.debug("decryptSingleColumn, columnName="+columnName+", columnValue="+columnValue+", currentRowIndex="+currentRowIndex)
		dojox.sql._crypto.decrypt(columnValue, password, dojo.hitch(this, function(results){
			// set the new decrypted value
			this._finalResultSet[currentRowIndex][columnName] = results;
			this._finishedCrypto++;
			
			// are we done with all encryption?
			if(this._finishedCrypto >= this._totalCrypto
				&& this._finishedSpawningCrypto){
				//console.debug("done with all decrypts");
				callback(this._finalResultSet);
			}
		}));
	}
});

(function(){

	var orig_sql = dojox.sql;
	dojox.sql = new Function("return dojox.sql._exec(arguments);");
	dojo.mixin(dojox.sql, orig_sql);
	
})();

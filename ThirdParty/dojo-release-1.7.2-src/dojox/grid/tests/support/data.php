<?php
	// db settings
	$dbserver = 'localhost';
	$dbuser = 'root';
	$dbpassword = 'root';
	
	error_reporting(E_ALL);
	
	/*
		Simple protocol:
			- Inputs via POST variables. 
			- Output is a string that can be evaluated into a JSON
			  First element of the array contains return status.
				
		This simplified tutorial code should not be deployed without a security review.
	*/
	
	@include "json.php";
	
	// set up response encoding 
	header("Content-Type: text/html; charset=utf-8");

	// util
	function getPostString($inName) {
		// make sure input strings are 'clean'
		return mysql_real_escape_string(@$_POST[$inName]);
	}
		
	// used for json encoding
	$json = new Services_JSON();
	
	function echoJson($inData) {
		global $json;
		// delay in ms
		$delay = getPostString('delay');
		if (!empty($delay))
			usleep($delay * 1000);
		echo '/* ' . $json->encode($inData) . ' */';
	}
	
	function error($inMessage) {
		$inMessage = str_replace('"', '\\"', $inMessage);
		error_log($inMessage);
		//echo '/* ({error: true, message: "' . $inMessage . '"}) */';
		echoJson(array('error' => true, 'message' => $inMessage));
		exit;
	}


	function getArray($inResult, $inArray="true") {
		$o = Array();
		while ($row = ($inArray ? mysql_fetch_row($inResult) : mysql_fetch_object($inResult)))
			$o[] = $row;
		return $o;	
	}
	
	// connect to DB
	mysql_connect($dbserver, $dbuser, $dbpassword);

	// select DB
	$database = getPostString("database");
	$database = ($database ? $database : $db);
	if (!mysql_select_db($database))
		error('failed to select db: ' . mysql_error());

	// select table
	$table = getPostString("table");
	$table = ($table ? $table : $dbtable);

	// cache
	$colCache = NULL;
	$pkCache = NULL;

	// set UTF8 output (MySql > 4.0)
	mysql_query("SET NAMES UTF8");
	
	// server, database, table meta data
	function getDatabases() {
		$result = mysql_query("SHOW DATABASES");
		$output = Array();
		while ($row = mysql_fetch_row($result)) {
			$r = strtolower($row[0]);
			if ($r != 'mysql' && $r != 'information_schema')
				$output[] = $row[0];
		}	
		return $output;	
	}
	
	function getTables() {
		global $database;
		$result = mysql_query("SHOW TABLES FROM $database");
		$output = Array();
		while ($row = mysql_fetch_row($result))
			$output[] = $row[0];
		return $output;	
	}
	
	function getColumns() {
		global $table, $colCache;
		if (!$colCache) {
			$result = mysql_query("SHOW COLUMNS FROM `$table`");
			return getArray($result, false);
			$colCache = getArray($result, false);
		}
		return $colCache;	
	}
	
	// returns object: $this->name, $this->index
	function getPk() {
		global $pkCache;
		if (!$pkCache) {
			$k = '';
			$columns = getColumns();
			for ($i=0; $i < count($columns); $i++) {
				$c = $columns[$i];
				if ($c->Key == 'PRI') {
					$k = $c->Field;
					break;
				}	
			}
			$pkCache->index = $i;
			$pkCache->name = $k;
		}	
		return $pkCache;
	}
	
	function getTableInfo() {
		global $table, $database;
		$c = getColumns();
		$r = rowcount();
		return array("count" => $r, "columns" => $c, "database" => $database, "table" => $table);
	}
	
	function getOldPostPkValue() {
		$pk = getPk();
		return getPostString('_o' . $pk->index);
	}
	
	function getNewPostPkValue() {
		$pk = getPk();
		return getPostString('_' . $pk->index);
	}
	
	function getPostColumns() {
		$columns = getColumns();
		for ($i=0, $a=array(), $p; (($p=getPostString("_".$i)) != ''); $i++) {
			$r = new stdClass();
			$r->name = $columns[$i]->Field;
			$r->value = $p;
			$a[] = $r;
		}	
		return $a;
	}
	
	function getOrderBy() {
		$ob = getPostString("orderby");
		if (is_numeric($ob)) {
			$columns = getColumns();
			$ob = $columns[intval($ob)-1]->Field;
		}
		return $ob;
	}
	
	function getWhere() {
		$w = getPostString("where");
		return ($w ? " WHERE $w" : "");
	}
	
	// basic operations
	function rowcount()	{
		global $table;
		$query = "SELECT COUNT(*) FROM `$table`" . getWhere();
		$result = mysql_query($query);
		if (!$result)
			error("failed to perform query: $query. " . mysql_error());
		if ($row = mysql_fetch_row($result))
			return $row[0];
		else
			return 0;
	}
	
	function select($inQuery = '') {
		global $table;
		// built limit clause
		$lim = (int)getPostString("limit");
		$off = (int)getPostString("offset");
		$limit = ($lim || $off ? " LIMIT $off, $lim" : "");
		// build order by clause
		$desc = (boolean)getPostString("desc");
		$ob = getOrderBy();
		$orderby = ($ob ? " ORDER BY `" . $ob . "`" . ($desc ? " DESC" : "") : "");
		// build query
		$query = ($inQuery ? $inQuery : "SELECT * FROM `$table`" . getWhere() . $orderby . $limit);
		// execute query
		if (!$result = mysql_query($query))
			error("failed to perform query: $query. " . mysql_error());
		// fetch each result row 
		return getArray($result);
	}

	function reflectRow() {
		global $table;
		$pk = getPk();
		$key = getNewPostPkValue();			
		$where = "`$pk->name`=\"$key\"";
		return select("SELECT * FROM `$table` WHERE $where LIMIT 1");
	}
	
	function update() {
		// build set clause
		for ($i=0, $set = array(), $cols = getPostColumns(), $v; ($v=$cols[$i]); $i++)
			$set[] = "`$v->name` = '$v->value'";
		$set = implode(', ', $set);
		// our table
		global $table;
		// build query
		$pk = getPk();
		$pkValue = getOldPostPkValue();
		$query = "UPDATE `$table` SET $set WHERE `$pk->name` = '$pkValue' LIMIT 1";
		// execute query
		if (!mysql_query($query))
			error("failed to perform query: [$query]. " .
					"MySql says: [" . mysql_error() ."]");
		else {
			return reflectRow();
		}	
	}
	
	function insert() {
		global $table;
		// build values clause
		for ($i=0, $values = array(), $cols = getPostColumns(), $v; ($v=$cols[$i]); $i++)
			$values[] = $v->value;
		$values = '"' . implode('", "', $values) . '"';			
		// build query
		$query = "INSERT INTO `$table` VALUES($values)";
		// execute query
		if (!mysql_query($query))
			error("failed to perform query: [$query]. " .
					"MySql says: [" . mysql_error() ."]");
		else {
			return reflectRow();
		}
	}
	
	function delete() {
		global $table;
		// build query
		$n = getPostString("count");
		$pk = getPk();
		for ($i = 0, $deleted=array(); $i < $n; $i++) {
			$key = getPostString("_$i");
			array_push($deleted, $key);
			$query = "DELETE FROM `$table` WHERE `$pk->name`=\"$key\" LIMIT 1";
			// execute query
			if (!mysql_query($query) || mysql_affected_rows() != 1)
				error("failed to perform query: [$query]. " .
					"Affected rows: " . mysql_affected_rows() .". " . 
					"MySql says: [" . mysql_error() ."]");
		}	
		return $deleted;			
	}
	
	// find (full text search)
	function findData($inFindCol, $inFind, $inOrderBy, $inFullText) {
		global $table;
		$where = ($inFullText ? "WHERE MATCH(`$inFindCol`) AGAINST ('$inFind')" : "WHERE $inFindCol LIKE '$inFind'");
		$query = "SELECT * FROM $table $where $inOrderBy";
		$result = mysql_query($query);
		// return rows
		return getArray($result);
	}
	
	// binary search through sorted data, supports start point ($inFindFrom) and direction ($inFindForward)
	function findRow($inData, $inFindFrom=-1, $inFindForward) {
		$b = -1;
		$l = count($inData);
		if (!$inData)
			return $b;
		if (!$inFindFrom==-1 || $l < 2)
			$b = 0;
		else {
			// binary search
			$t = $l-1;
			$b = 0;
			while ($b <= $t) {
				$p = floor(($b+$t)/2);
				$d = $inData[$p][0];
				if ($d < $inFindFrom)
					$b = $p + 1;
				else if ($d > $inFindFrom)
					$t = $p - 1;
				else {
					$b = $p;
					break;
				}	
			}	
			if ($inFindFrom == $inData[$b][0]) {
				// add or subtract 1
				$b = ($inFindForward ? ($b+1 > $l-1 ? 0 : $b+1) : ($b-1 < 0 ? $l-1 : $b-1) );
			}	
			else if (!$inFindForward)
				// subtract 1
				$b = ($b-1 < 0 ? $l-1 : $b-1);
		}	
		return $inData[$b][0];
	}
	
	function buildFindWhere($inFindData, $inKey, $inCol) {
		$o = Array();
		foreach($inFindData as $row)
			$o[] = $inCol . "='" . $row[$inKey] . "'";
		return (count($o) ? ' WHERE ' . implode(' OR ', $o) : '');
	}
		
	function find($inFindCol, $inFind='', $inOb='', $inFindFrom=0, $inFindForward=true, $inFullText=true) {
		global $table;
		// build order by clause
		$desc = (boolean)getPostString("desc");
		if (!$inOb)
			$inOb = getOrderBy();
		if ($inOb)
			$inOb = "`" . $inOb . "`"	;
		$orderby = ($inOb ? " ORDER BY $inOb " . ($desc ? " DESC" : "") : "");
		// update inputs from post
		if (!$inFind)
			$inFind = getPostString('findText');
		if (!$inFindCol)
			$inFindCol = getPostString('findCol');	
		if (empty($inFindFrom))
			$inFindFrom = getPostString('findFrom');
		$ff = getPostString('findForward');
		if ($ff)
			$inFindForward = (strtolower($ff) == 'true' ? true : false);
		$ft = getPostString('findFullText');
		if ($ft)
			$inFullText = (strtolower($ft) == 'true' ? true : false);	
		
		// get find data
		$f = findData($inFindCol, $inFind, $orderby,  $inFullText);
		$pk = getPk();

		// execute query
		$where = buildFindWhere($f, $pk->index, 'f');
		$query = "SELECT Row, f FROM (SELECT @row := @row + 1 AS Row, $pk->name as f FROM `$table` $orderby) AS tempTable $where";
		mysql_query('SET @row = -1;');
		if (!$result = mysql_query($query))
			error("failed to perform query: $query. " . mysql_error());
		
		// return row number 
		return findRow(getArray($result), $inFindFrom, $inFindForward);
	}
	
	// our command list
	$cmds = array( 
		"count" => "rowcount", 
		"select" => "select",
		"update" => "update",
		"insert" => "insert",
		"delete" => "delete",
		"find" => "find",
		"databases" => "getDatabases",
		"tables" => "getTables",
		"columns" => "getColumns",
		"info" => "getTableInfo"
	);
		
	// process input params
	$cmd = @$_POST["command"];
	
	//$cmd="select";
	
	// dispatch command
	$func = @$cmds[$cmd];
	if (function_exists($func)) 
		echoJson(call_user_func($func));
	else
		error("bad command");
?>

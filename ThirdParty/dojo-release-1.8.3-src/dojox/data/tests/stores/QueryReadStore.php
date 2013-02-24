<?php

header("Content-Type", "text/json");

$allItems = array(
	array('id'=>0, 'name'=>"Alabama", 'label'=>"<img src='images/Alabama.jpg'/>Alabama", 'abbreviation'=>"AL", 'capital'=>'Montgomery'),
	array('id'=>1, 'name'=>"Alaska", 'label'=>"Alaska", 'abbreviation'=>"AK", 'capital'=>'Juneau'),
	array('id'=>2, 'name'=>"American Samoa", 'label'=>"American Samoa", 'abbreviation'=>"AS", 'capital'=>'Pago Pago'),
	array('id'=>3, 'name'=>"Arizona", 'label'=>"Arizona", 'abbreviation'=>"AZ", 'capital'=>'Phoenix'),
	array('id'=>4, 'name'=>"Arkansas", 'label'=>"Arkansas", 'abbreviation'=>"AR", 'capital'=>'Little Rock'),
	array('id'=>5, 'name'=>"Armed Forces Europe", 'label'=>"Armed Forces Europe", 'abbreviation'=>"AE", 'capital'=>'??? (Europe)'),
	array('id'=>6, 'name'=>"Armed Forces Pacific", 'label'=>"Armed Forces Pacific", 'abbreviation'=>"AP", 'capital'=>'??? (Pacific)'),
	array('id'=>7, 'name'=>"Armed Forces the Americas", 'label'=>"Armed Forces the Americas", 'abbreviation'=>"AA", 'capital'=>'??? (America)'),
	array('id'=>8, 'name'=>"California", 'label'=>"California", 'abbreviation'=>"CA", 'capital'=>'Sacramento'),
	array('id'=>9, 'name'=>"Colorado", 'label'=>"Colorado", 'abbreviation'=>"CO", 'capital'=>'Denver'),
	array('id'=>10, 'name'=>"Connecticut", 'label'=>"Connecticut", 'abbreviation'=>"CT", 'capital'=>'Hartford'),
	array('id'=>11, 'name'=>"Delaware", 'label'=>"Delaware", 'abbreviation'=>"DE", 'capital'=>'Dover'),
	array('id'=>12, 'name'=>"District of Columbia", 'label'=>"District of Columbia", 'abbreviation'=>"DC", 'capital'=>'Washington'),
	array('id'=>13, 'name'=>"Federated States of Micronesia", 'label'=>"Federated States of Micronesia", 'abbreviation'=>"FM", 'capital'=>'Palikir'),
	array('id'=>14, 'name'=>"Florida", 'label'=>"Florida", 'abbreviation'=>"FL", 'capital'=>'Tallahassee'),
	array('id'=>15, 'name'=>"Georgia", 'label'=>"Georgia", 'abbreviation'=>"GA", 'capital'=>'Atlanta'),
	array('id'=>16, 'name'=>"Guam", 'label'=>"Guam", 'abbreviation'=>"GU", 'capital'=>'Hagatna'),
	array('id'=>17, 'name'=>"Hawaii", 'label'=>"Hawaii", 'abbreviation'=>"HI", 'capital'=>'Honolulu'),
	array('id'=>18, 'name'=>"Idaho", 'label'=>"Idaho", 'abbreviation'=>"ID", 'capital'=>'Boise'),
	array('id'=>19, 'name'=>"Illinois", 'label'=>"Illinois", 'abbreviation'=>"IL", 'capital'=>'Springfield'),
	array('id'=>20, 'name'=>"Indiana", 'label'=>"Indiana", 'abbreviation'=>"IN", 'capital'=>'Indianapolis'),
	array('id'=>21, 'name'=>"Iowa", 'label'=>"Iowa", 'abbreviation'=>"IA", 'capital'=>'Des Moines'),
	array('id'=>22, 'name'=>"Kansas", 'label'=>"Kansas", 'abbreviation'=>"KS", 'capital'=>'Topeka'),
	array('id'=>23, 'name'=>"Kentucky", 'label'=>"Kentucky", 'abbreviation'=>"KY", 'capital'=>'Frankfort'),
	array('id'=>24, 'name'=>"Louisiana", 'label'=>"Louisiana", 'abbreviation'=>"LA", 'capital'=>'Baton Rouge'),
	array('id'=>25, 'name'=>"Maine", 'label'=>"Maine", 'abbreviation'=>"ME", 'capital'=>'Augusta'),
	array('id'=>26, 'name'=>"Marshall Islands", 'label'=>"Marshall Islands", 'abbreviation'=>"MH", 'capital'=>'Answer Majuro'),
	array('id'=>27, 'name'=>"Maryland", 'label'=>"Maryland", 'abbreviation'=>"MD", 'capital'=>'Annapolis'),
	array('id'=>28, 'name'=>"Massachusetts", 'label'=>"Massachusetts", 'abbreviation'=>"MA", 'capital'=>'Boston'),
	array('id'=>29, 'name'=>"Michigan", 'label'=>"Michigan", 'abbreviation'=>"MI", 'capital'=>'Lansing'),
	array('id'=>30, 'name'=>"Minnesota", 'label'=>"Minnesota", 'abbreviation'=>"MN", 'capital'=>'Saint Paul'),
	array('id'=>31, 'name'=>"Mississippi", 'label'=>"Mississippi", 'abbreviation'=>"MS", 'capital'=>'Jackson'),
	array('id'=>32, 'name'=>"Missouri", 'label'=>"Missouri", 'abbreviation'=>"MO", 'capital'=>'Jefferson City'),
	array('id'=>33, 'name'=>"Montana", 'label'=>"Montana", 'abbreviation'=>"MT", 'capital'=>'Helena'),
	array('id'=>34, 'name'=>"Nebraska", 'label'=>"Nebraska", 'abbreviation'=>"NE", 'capital'=>'Lincoln'),
	array('id'=>35, 'name'=>"Nevada", 'label'=>"Nevada", 'abbreviation'=>"NV", 'capital'=>'Carson City'),
	array('id'=>36, 'name'=>"New Hampshire", 'label'=>"New Hampshire", 'abbreviation'=>"NH", 'capital'=>'Concord'),
	array('id'=>37, 'name'=>"New Jersey", 'label'=>"New Jersey", 'abbreviation'=>"NJ", 'capital'=>'Trenton'),
	array('id'=>38, 'name'=>"New Mexico", 'label'=>"New Mexico", 'abbreviation'=>"NM", 'capital'=>'Santa Fe'),
	array('id'=>39, 'name'=>"New York", 'label'=>"New York", 'abbreviation'=>"NY", 'capital'=>'Albany'),
	array('id'=>40, 'name'=>"North Carolina", 'label'=>"North Carolina", 'abbreviation'=>"NC", 'capital'=>'Raleigh'),
	array('id'=>41, 'name'=>"North Dakota", 'label'=>"North Dakota", 'abbreviation'=>"ND", 'capital'=>'Bismarck'),
	array('id'=>42, 'name'=>"Northern Mariana Islands", 'label'=>"Northern Mariana Islands", 'abbreviation'=>"MP", 'capital'=>'Saipan'),
	array('id'=>43, 'name'=>"Ohio", 'label'=>"Ohio", 'abbreviation'=>"OH", 'capital'=>'Columbus'),
	array('id'=>44, 'name'=>"Oklahoma", 'label'=>"Oklahoma", 'abbreviation'=>"OK", 'capital'=>'Oklahoma City'),
	array('id'=>45, 'name'=>"Oregon", 'label'=>"Oregon", 'abbreviation'=>"OR", 'capital'=>'Salem'),
	array('id'=>46, 'name'=>"Pennsylvania", 'label'=>"Pennsylvania", 'abbreviation'=>"PA", 'capital'=>'Harrisburg'),
	array('id'=>47, 'name'=>"Puerto Rico", 'label'=>"Puerto Rico", 'abbreviation'=>"PR", 'capital'=>'San Juan'),
	array('id'=>48, 'name'=>"Rhode Island", 'label'=>"Rhode Island", 'abbreviation'=>"RI", 'capital'=>'Providence'),
	array('id'=>49, 'name'=>"South Carolina", 'label'=>"South Carolina", 'abbreviation'=>"SC", 'capital'=>'Columbia'),
	array('id'=>50, 'name'=>"South Dakota", 'label'=>"South Dakota", 'abbreviation'=>"SD", 'capital'=>'Pierre'),
	array('id'=>51, 'name'=>"Tennessee", 'label'=>"Tennessee", 'abbreviation'=>"TN", 'capital'=>'Nashville'),
	array('id'=>52, 'name'=>"Texas", 'label'=>"Texas", 'abbreviation'=>"TX", 'capital'=>'Austin'),
	array('id'=>53, 'name'=>"Utah", 'label'=>"Utah", 'abbreviation'=>"UT", 'capital'=>'Salt Lake City'),
	array('id'=>54, 'name'=>"Vermont", 'label'=>"Vermont", 'abbreviation'=>"VT", 'capital'=>'Montpelier'),
	array('id'=>55, 'name'=> "Virgin Islands, U.S.", 'label'=>"Virgin Islands, U.S.", 'abbreviation'=>"VI", 'capital'=>'Charlotte Amalie'),
	array('id'=>56, 'name'=>"Virginia", 'label'=>"Virginia", 'abbreviation'=>"VA", 'capital'=>'Richmond'),
	array('id'=>57, 'name'=>"Washington", 'label'=>"Washington", 'abbreviation'=>"WA", 'capital'=>'Olympia'),
	array('id'=>58, 'name'=>"West Virginia", 'label'=>"West Virginia", 'abbreviation'=>"WV", 'capital'=>'Charleston'),
	array('id'=>59, 'name'=>"Wisconsin", 'label'=>"Wisconsin", 'abbreviation'=>"WI", 'capital'=>'Madison'),
	array('id'=>60, 'name'=>"Wyoming", 'label'=>"Wyoming", 'abbreviation'=>"WY", 'capital'=>'Cheyenne'),
	array('id'=>61, 'name'=>"Special chars !\"$%&/()=? <a >#'+*-_.:,; <", 'label'=>"Special chars !\"$%&/()=? <a >#'+*-_.:,;<", 'abbreviation'=>":-)", 'capital'=>'/dev/null'),
);


// Query.   Null means no query at all (return all records), whereas any string, even the empty string,
// is a filter.
$q = null;
if (array_key_exists("q", $_REQUEST)) {
	$q = $_REQUEST['q'];
}else if (array_key_exists("name", $_REQUEST)) {
	$q = $_REQUEST['name'];
}

// Support wildcard search like "a*" to find all elements beginning with a, or "*" to find all elements
// (same as no query at all)
if ($q === "*") {
	$q = null;	// treat it the same as no query at all
}else if ($q && strlen($q) && $q[strlen($q)-1]=="*") {
	$q = substr($q, 0, strlen($q)-1);
	$wildcard = true;
}

$ret = array();
foreach ($allItems as $item) {
	$foundPos = -1;

	// flag if item matches the query or not
	$matches = true;

	// If there's a query, run it, and set $matches if item matches.
	// Allow query for empty string too, that's why it has the explicit test for null.
	if ($q !== null) {
		if($wildcard){
			// query like "a*", check if item starts with "a"
			$foundPos = strpos(strtolower($item['name']), strtolower($q));
			$matches = $foundPos===0;
		}else{
			// query like "alabama", check if item matches query string exactly
			$matches = strtolower($item['name']) == strtolower($q);
		}
	}

	if ($matches) {
		// Add item to result list
		$ret[] = $item;
	}
}

// Handle sorting
if (array_key_exists("sort", $_REQUEST)) {
	$sort = $_REQUEST['sort'];
	// Check if $sort starts with "-" then we have a DESC sort.
	$desc = strpos($sort, '-')===0 ? true : false;
	$sort = strpos($sort, '-')===0 ? substr($sort, 1) : $sort;
	if (in_array($sort, array_keys($ret[0]))) {
		$toSort = array();
		foreach ($ret as $i) $toSort[$i[$sort]] = $i;
		if ($desc) krsort($toSort); else ksort($toSort);
		$newRet = array();
		foreach ($toSort as $i) $newRet[] = $i;
		$ret = $newRet;
	}
}


// Handle total number of matches as a return, regardless of page size, but taking the filtering into account (if taken place).
$numRows = count($ret);

// Handle paging, if given.
if (array_key_exists("start", $_REQUEST)) {
	$ret = array_slice($ret, $_REQUEST['start']);
}
if (array_key_exists("count", $_REQUEST)) {
	$ret = array_slice($ret, 0, $_REQUEST['count']);
}

print '/*'.json_encode(array('numRows'=>$numRows, 'items'=>$ret, 'identity'=>'id')).'*/';

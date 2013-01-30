<?php
//
//	This is an experiemental file, used to generate dojo11.cix,
//	the XML for ActiveState's Komodo Editor code-completion.
//
//  	it requires php5, a lot of memory, and write access to
//  	the ./cache folder in this path.  It will parse the dojo
//	tree (or read from cache if a file is unmodified), and dump
//	the results to "valid" XML (i think).
//
//  to use:
//  /usr/local/php5/bin/php -q makeCix.php > ../resources/dojo.cix
//

// $Rev: $ 
$current_version = "1.6.0";

header("Content-type: text/xml");

ini_set("memory_limit","512M");
include_once('includes/dojo.inc');

$files = dojo_get_files();

// our namespaces:
$out = array("dijit" => array(), "dojox" => array(), "dojo" => array() );
// put the results of each file into $array[$namespace]
foreach ($files as $set){
	list($namespace,$file) = $set;
	$data = dojo_get_contents_cache($namespace, $file);
	$out[$namespace] = array_merge($out[$namespace],$data);
}
// and do some weeeird array manipulations:
$out = @expando_dojo($out);

// start a new document
$doc = new DOMDocument('1.0');
// setup for codeintel:
$codeintel = $doc->createElement('codeintel');
$codeintel->setAttribute("description","Dojo Toolkit API - version " . $current_version);
$codeintel->setAttribute("version","2.0");
$codeintel->setAttribute("encoding","UTF-8");
// wrap all the api in one "file" tag:
$data = $doc->createElement('file');
$data->setAttribute("lang","JavaScript");
$data->setAttribute("path","");
$f = $codeintel->appendChild($data);
// and all the namespaces under one heading "dojo"
$api = $doc->createElement('scope');
$api->setAttribute("ilk","blob");
$api->setAttribute("lang","JavaScript");
$api->setAttribute("name","dojo");
$namespace = $f->appendChild($api);

// iterate through our modified array, and make an XML tree of the data:
foreach ($out as $ns => $data){
	
		// each top-level namespace get's it own scope
		$nsdata = $doc->createElement('scope');
		$nsdata->setAttribute("ilk","class");
		$nsdata->setAttribute("name",$ns);

		foreach ($data as $obj => $info){
			
			$objElm = $doc->createElement('scope');
			if(!empty($info['type'])){

				$tt = $info['type'];
				switch($tt){
					case "Object" :
						// inspect this object deeper, but append to namespace:
						$nsdata->appendChild(dojo_inspect($data[$obj],$obj,$doc, "variable"));
						break;
					case "Function" :
						if($info['classlike']){
							// inspect deeper, append to namesapce:
							$nsdata->setAttribute("ilk","class");
							$nsdata->appendChild(dojo_inspect($data[$obj],$obj,$doc));
						}else{
							// functions usually have param data:
							$objElm->setAttribute("ilk",strtolower($tt));
							$objElm->setAttribute("name",$obj);
							if(is_array($info['parameters'])){
								// generate the signature
								$sig = $obj."(";
								foreach($info['parameters'] as $param => $pData){
									$sig .= $param.",";
									$paramElm = $doc->createElement('variable');
									if(!empty($pData['type'])){
										$paramElm->setAttribute("citdl",$pData['type']);
									}
									$paramElm->setAttribute("name",$param);
									$paramElm->setAttribute("ilk","argument");
									if($pData['summary']){
										$paramElm->setAttribute("doc", fix_utf(htmlentities($pData['summary'])));
									}
									$objElm -> appendChild($paramElm);
								}
								$sig = substr($sig,0,strlen($sig)-1);
								$sig .= ")";
								$objElm->setAttribute("signature",$sig);
								unset($sig);
							}
						}
						break;
				}
				unset($tt);
			}
			// pertinent data:
			if(!empty($info['returns'])){
				$objElm->setAttribute("returns",htmlentities($info['returns']));
			}
			// helpful data:
			if(!empty($info['summary'])){
				$objElm->setAttribute("doc", fix_utf(htmlentities($info['summary'])));
			}
			
			// avoid appending this node if we skipped popoulating it (in the case of nsdata->appendCHild())
			if($objElm->hasAttribute("name")){
				$nsdata->appendChild($objElm);
			}
		}

		// and dump all the data to this namesapce
		$namespace->appendChild($nsdata);	
	
}

// append the APi to the document, and print:
$doc->appendChild($codeintel);
print $doc->saveXML();


function dojo_inspect($data,$ns,$doc,$t="scope"){
	// summary: inspect some namespace (as top), with some passed data.
	if ($t == "argument") {
		$elm = $doc->createElement("variable");
		$elm->setAttribute("ilk", "argument");
	} else {
		$elm = $doc->createElement($t);
	}
	$elm->setAttribute("name",$ns);

	foreach ($data as $obj => $info){
		switch($obj){
			// these are all the ones we don't _really_ care about in this context:
			case "prototype" : //$elm->setAttribute("classref",$info['prototype']); break;
			case "chains" :
			case "mixins" :
			case "instance" :
			case "optional" :
			case "classlike" :
			case "examples" :
			case "private_parent" :
			case "description" : 
			case "source" :
			case "style" :
				break;

			// mmm, duplicated from above:
			case "parameters" :
				$sig = $ns."(";
				foreach($info as $key => $val){
					$sig .= $key.",";
					$elm->appendChild(dojo_inspect($val,$key,$doc,"argument"));
				}
				$sig = substr($sig,0,strlen($sig)-1);
				$sig .= ")";
				$elm->setAttribute("signature",$sig);
				break;

			// some pertinant info about this element:
			case "returns" : $elm->setAttribute("returns",htmlentities($info));
			case "private" : $elm->setAttribute("attributes","private"); break;

			case "type" :
				if($info) {
					switch ($info){
						case "Function" :
							$elm->setAttribute("ilk","function");
							break;
						default:
							if (is_array($info)) {
							    if ($info["instance"]) {
								$elm->setAttribute("citdl",$info["instance"]);
							    }
							} else {
							    $elm->setAttribute("citdl",$info);
							}
					}
				}
				break;

			// ahhh, the blessed summary:
			case "summary" : $elm->setAttribute("doc", fix_utf(htmlentities($info)));
				break;

			// just in case we missed something?
			default :
				$scope_type = "scope";
				if (($data[$obj]["instance"] != NULL) ||
				    ($data[$obj]["type"] == "Object")) {
					$scope_type = "variable";
				}
				$elm->appendChild(dojo_inspect($data[$obj],$obj,$doc,$scope_type));
				break;
		}
	}
	// give it back as a domNode:
	return $elm;

}

function dojo_get_contents_cache($namespace, $file, $forceNew = false){
	// summary: a shim to dojo_get_contents, providing filemtime checking/caching
	// 		from parsing: XML takes ~ 80000ms on my MacBook Pro, from cache:
	// 		7000ms ... pass true as third param to force cache reloading.

	// if the file hasn't been change since the last time, skip parsing it
	$mtime = dojo_get_file_time($namespace, $file);
	$cfile = "./cache/".md5($namespace.$file).".".$mtime;
	
	if(!$forceNew && file_exists($cfile)){
		// read it from the cache:
		$cache = file_get_contents($cfile);
		$data = unserialize($cache);
		
	}else{
		// parse the file, and save the cached results:
		$data = @dojo_get_contents($namespace, $file);
		$cache = serialize($data);
		$fp = fopen($cfile,"w+");
		fputs($fp,$cache);
		fclose($fp);
		
	}
	return $data;

}

function expando_dojo($array){
	// ugly array manipulation to turn an array like:
	// array( "one" => array("one","two","three"), "one.more"=>array("two","four","six")
	// into:
	// array("one" => array("more"=>array("two","four","six"), "one", "two", "three"));

	$ret = array();
	foreach($array as $namespace => $results){
		foreach($results as $item => $data){
			switch($item{0}){
				case "#" : break;
				default:
					$list = explode(".",$item);
					$n = count($list);
					$me = $list[$n];
					// NOT happy with this:
					if(!($list[0]==$namespace)){ continue; }
					switch($n){
						case 8 :
							fprintf("UNCAUGHT! %s", $item); // way tooooo deep.
							break;
						case 7 : 
							$l1 = $list[1];
							$l2 = $list[2];
							$l3 = $list[3];
							$l4 = $list[4];
							$l5 = $list[5];
							$l6 = $list[6];
							if ($ret[$namespace][$l1][$l2][$l3][$l4][$l5][$l6] == NULL)
								$ret[$namespace][$l1][$l2][$l3][$l4][$l5][$l6] = $data;
							else
								$ret[$namespace][$l1][$l2][$l3][$l4][$l5][$l6] = array_merge_recursive($data, $ret[$namespace][$l1][$l2][$l3][$l4][$l5][$l6]);
							break;
						case 6 :
							$l1 = $list[1];
							$l2 = $list[2];
							$l3 = $list[3];
							$l4 = $list[4];
							$l5 = $list[5];
							if ($ret[$namespace][$l1][$l2][$l3][$l4][$l5] == NULL)
								$ret[$namespace][$l1][$l2][$l3][$l4][$l5] = $data;
							else
								$ret[$namespace][$l1][$l2][$l3][$l4][$l5] = array_merge_recursive($data, $ret[$namespace][$l1][$l2][$l3][$l4][$l5]);
							break;
						case 5 : 
							$l1 = $list[1];
							$l2 = $list[2];
							$l3 = $list[3];
							$l4 = $list[4];
							if ($ret[$namespace][$l1][$l2][$l3][$l4] == NULL)
								$ret[$namespace][$l1][$l2][$l3][$l4] = $data;
							else
								$ret[$namespace][$l1][$l2][$l3][$l4] = array_merge_recursive($data, $ret[$namespace][$l1][$l2][$l3][$l4]);
							break;
						case 4 :
							$l1 = $list[1];
							$l2 = $list[2];
							$l3 = $list[3];
							if ($ret[$namespace][$l1][$l2][$l3] == NULL)
								$ret[$namespace][$l1][$l2][$l3] = $data;
							else
								$ret[$namespace][$l1][$l2][$l3] = array_merge_recursive($data, $ret[$namespace][$l1][$l2][$l3]);
							break;
						case 3 :
							$l1 = $list[1];
							$l2 = $list[2];
							
							if ($ret[$namespace][$l1][$l2] == NULL)
								$ret[$namespace][$l1][$l2] = $data;
							else
								$ret[$namespace][$l1][$l2] = array_merge_recursive($data, $ret[$namespace][$l1][$l2]);
							break;
						case 2 :
							$l1 = $list[1];
							$ret[$namespace][$l1] = $data;
							break;
					}
					break;
			}
			
		}
		
	}
	return $ret;
}

function fix_utf($str){
	return iconv('utf-8','utf-8', $str);
}

?>

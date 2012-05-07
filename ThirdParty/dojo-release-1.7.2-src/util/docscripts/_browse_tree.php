<?php
header("Content-Type: application/json");

include_once('lib/parser2/dojo2.inc');

// no dojo.require() call made?
$files = dojo_get_files(); 
foreach ($files as $set){ 
	list($namespace, $file) = $set;
	$data[$namespace][] = $file;
}
$namespaces = array_keys($data); 

//	$data takes the form of $namespace[], where the value is the rest of the file.  So let's break it up.
//	note that $namespaces is the root of each branch.
$id_counter = 0;
$tree = array();
$folders = array();
$indexed = array();

//	temporary
//$namespaces = array("dojo");
foreach($namespaces as $nm){
	//	loop through the namespaces, build up our tree "json"
	$obj = array(
		"id" => "data-" . $id_counter++,
		"name" => $nm,
		"full_name" => $nm,
		"type" => "namespace",
		"children" => array()
	);
	$tree[] = &$obj;
	foreach($data[$nm] as $f){
		//	we know each one is unique here, but we have to break it up.
		$pieces = explode("/", $f);
		$name = array_pop($pieces);
		$file_obj = array(
			"id" => "data-" . $id_counter++,
			"name" => $name,
			"full_name" => $f,
			"ns" => $nm,
			"type" => "file"
		);

		//	push it into the tree regardless
		$tree[] = $file_obj;
		$indexed[$file_obj["id"]] = $file_obj;
		if(!count($pieces)){
			//	this is a direct child of the namespace, so just add it.
			$obj["children"][] = array("_reference" => $file_obj["id"]);
		} else {
			while(count($pieces)){
				$full_name = implode("/", $pieces);
				$name = array_pop($pieces);
				if(!array_key_exists($full_name, $folders)){
					//	add this directory object
					$folder_obj = array(
						"id" => "data-" . $id_counter++,
						"name" => $name,
						"full_name" => $full_name,
						"ns" => $nm,
						"type" => "folder",
						"added" => false,
						"children" => array()
					);
					//	keep track of it.
					$folders[$full_name] = $folder_obj;
				}

				//	check to see if there's a parent folder
				if(count($pieces)){
					//	there should be a parent
					$tmp = explode("/", $full_name);
					array_pop($tmp);
					$tmp = implode("/", $tmp);
					if(array_key_exists($tmp, $folders) && !$folders[$full_name]["added"]){
						$folders[$tmp]["children"][] = array("_reference"=>$folders[$full_name]["id"]);
						$folders[$full_name]["added"] = true;
					}
				}
			}

			//	finally, add our file to the right folder.
			$tmp = explode("/", $f);
			array_pop($tmp);
			$tmp = implode("/", $tmp);
			$folders[$tmp]["children"][] = array("_reference" => $file_obj["id"]);
		}
	}

	//	add in our folder objects and merge with the main namespace
	$tmp = array();
	foreach($folders as $f=>$folder){
		$tree[] = $folder;
		$indexed[$folder["id"]] = $folder;
		if(strpos($f, "/") === false){
			$tmp[] = array("_reference"=>$folder["id"]);
		}
	}
	$obj["children"] = array_merge($tmp, $obj["children"]);

	//	fugly sorting by rebuilding all children.
	foreach($tree as $key=>&$item){
		if(array_key_exists("children", $item) && count($item["children"])){
			$folder_objs = array();
			$privates = array();
			$file_objs = array();

			//	here's where it gets ugly.  Loop through the children, get the indexed object and push
			//	into the various arrays in order to rebuild the children.
			foreach($item["children"] as $child=>$value){
				$test = $indexed[$value["_reference"]];
				if($test["type"] == "folder"){
					$folder_objs[] = $value;
				}
				else if(strpos($test["name"], "_")===0){
					$privates[] = $value;
				}
				else {
					$file_objs[] = $value;
				}
			}

			//	TODO: we need the file objects to be sorted case-insensitive.


			//	rebuild the children array
			$item["children"] = array_merge($folder_objs, $privates, $file_objs);
		}
	}

	$folders = array();
	$indexed = array();
	unset($obj);
}
$storeData = array(
	"identifier"=>"id",
	"label"=>"name",
	"items"=>&$tree
);
print json_encode($storeData);
?>

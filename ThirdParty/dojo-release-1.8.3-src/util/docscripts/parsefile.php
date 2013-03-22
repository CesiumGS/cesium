<?php

//	Simple single-file doc validation utility, using our php-based `jsdoc` parser. 
//	To be used as a post-commit hook?
// 
//	to use:
//		php -q parsefile.php dojox/data/AndOrReadStore.js
//
//	exits normally (status 0) if OK, with status 255 if failed, other values are from PHP untrapped.
//
//	add --debug to last argument to see output data, eg:
//
//		php -q parsefile.php dijit/_Widget.js --debug
//
//	scan all files prior to running generate/makeCix (considerably faster to detect fatal parser-breaking errors)
//
//		php -q parsefile.php --all

include_once('lib/parser2/dojo2.inc');
$allfiles = dojo_get_files();

function doc_passes($ns, $file, $debug){
	try{
		$ret = doc_test($ns, $file, $debug);
		return $ret;
	}catch (Exception $e){
		return false;
	}
}

function doc_test($ns, $file, $debug){
	// the testing of a single file. this is where the actual testing goes.
	
	try{
		$ret = true;
		$data = dojo_get_contents($ns, $file);
		// test other things. like we're expecting at the _very_ least a $data['#provides'] key?
		if(empty($data['#provides'])){
			if($debug){ 
				print "Warning: no provide() determined. [" . $ns . "/" . $file . "]\n"; 
			}
			$ret = false;	 
		}else{
			if(count($data['#provides']) > 1){
				if($debug){
					print "Warning: Multiple provides() found?\n";
					$ret = false;
				}
			}
		}
		
		if(count($data) == 0){
			if($debug){ print "Error: No data found. [" . $ns . "/" . $file . "]"; }
			$ret = false;
		}else{
		    
		}
		
		return $ret;
	}catch (Exception $e){
		print "Error: Exception trapped processing [" . $ns . "/" . $file . "]\nException:\n";
		print $e;
		return false;
	}
}

if($argc){
	
	$argfile = $argv[1];
	$debug = in_array("--debug", $argv);
	if($argfile == "--all"){

		$debug = true;
		$haserror = false;
		foreach($allfiles as $set){
			list($ns, $file) = $set;
			if(!doc_passes($ns, $file, $debug)){
				$haserror = true;
			}
		}

		if($haserror){
			die(255);
		}

	}else{

		$parts = explode("/", $argfile);
		$ns = array_shift($parts);
		$file = implode("/", $parts);
		if(!doc_passes($ns, $file, $debug)){
			die(255);
		}

	}

}

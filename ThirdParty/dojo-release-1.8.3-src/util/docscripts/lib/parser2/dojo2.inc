<?php

ini_set('display_errors', 1);
error_reporting(E_ALL ^ E_NOTICE);

require_once('JavaScriptLanguage.php');
require_once('JavaScriptParser.php');
require_once('JavaScriptStatements.php');
require_once('JavaScriptFunction.php');
require_once('Dojo.php');
require_once('DojoCommentBlock.php');

$_dojo_properties_modules = array();

function _dojo_get_namespaces($limit=null){
	static $namespaces;
	if (!isset($namespaces)) {
		$namespaces = array();
		$files = scandir('modules');
		foreach ($files as $file) {
			if (substr($file, -7) == '.module') {
				$namespace = substr($file, 0, -7);
				if (!$limit || in_array($namespace, $limit)) {
					include_once('modules/' . $file);
					$namespaces[] = substr($file, 0, -7);
				}
			}
			elseif (substr($file, -18) == '.module.properties') {
				$namespace = substr($file, 0, -18);
				if (!$limit || in_array($namespace, $limit)) {
					global $_dojo_properties_modules;
					foreach (preg_split('%[\n\r]+%', file_get_contents('modules/' . $file)) as $line) {
						list($line, ) = preg_split('%[!#]%', $line, 2);
						if ($line = trim($line)) {
							list($key, $line) = explode('=', $line, 2);
							$key = str_replace('\\ ', ' ', trim($key));
							$line = preg_replace('%^\s+%', '', $line);
							if ($key == 'location') {
								$line = _dojo_ensure_directory($line);
							}
							$_dojo_properties_modules[$namespace][$key] = $line;
						}
					}
					$namespaces[] = substr($file, 0, -18);
				}
			}
		}
	}
	return $namespaces;
}

function dojo_get_include($node, $provide) {
	if ($node->jsdoc_project_name == $provide->title) {
		return 'Included automatically';
	}
	else {
		return 'dojo.require("%s");';
	}
}

function _dojo_ensure_directory($directory) {
	if (!is_dir($directory)) {
		die("$directory is not a directory\n");
	}
	else {
		if(substr($directory, -1) != '/'){
			$directory .= '/';
		}
	}
	return $directory;
}

function dojo_get_file_time($namespace, $file) {
	if (function_exists($namespace . '_code_location')) {
		return filectime(_dojo_ensure_directory(call_user_func($namespace . '_code_location')) . $file);
	}
	else {
		global $_dojo_properties_modules;
		return filectime($_dojo_properties_modules[$namespace]['location'] . $file);
	}
}

function _jsdoc_file_list($dir = false, $recurse = false){
	$output = array();

	if (!$recurse) {
		$old_dir = getcwd();
		if (!is_dir($dir)) {
			return array();
		}
		chdir($dir);
		$dir = '.';
	}
	$files = scandir($dir);

	foreach ($files as $file) {
		if ($file{0} == '.') continue;
		if (is_dir($dir . '/' . $file)) {
			if ($recurse) {
				$file = $dir . '/' . $file;
			}
			$output = array_merge($output, _jsdoc_file_list($file, true));
		}else{
			if (substr($file, -3) == '.js' && substr($file, -6) != '.xd.js') {
				if ($recurse) {
					$file = $dir . '/' . $file;
				}
				$output[] = $file;
			}
		}
	}

	if (!$recurse) {
		chdir($old_dir);
	}
	return $output;
}

function dojo_get_files($limit=null) {
		$namespaces = _dojo_get_namespaces($limit);
		$files = array();
		foreach ($namespaces as $namespace) {
				// skip util directory, parser chokes on util/less
				if($namespace == "util") continue;
				if (function_exists($namespace . '_code_location')) {
					$location = _dojo_ensure_directory(call_user_func($namespace . '_code_location'));
				}
				else {
					global $_dojo_properties_modules;
					$location = $_dojo_properties_modules[$namespace]['location'];
				}
				if (!$location) die($namespace . '_code_location does not return useful result');
				$list = _jsdoc_file_list($location);
				foreach ($list as $i => $item) {
						// Skip internationalization/tests/demos files
						if (preg_match('%(^|/|\\\\)(nls|tests|demos)(\\\\|/)%', $item)) {
							unset($list[$i]);
							continue;
						}
						$list[$i] = array($namespace, $item);
				}
				$files = array_merge($files, array_values($list));
		}

		return $files;
}

function _amd_pseudodoc_fix($matches){
	// adds a pseudo-block of aliases to trick parser into believing the things inside of define() callbacks
	// are in fact global
//	$out = $matches[1];
//	$args = trim($matches[2]);
//	if($args != ""){
//		$pseudo = "){\n\n/*=====\n";
//		$newargs = array();
//		foreach(explode(",", $args) as $arg){
//			$arg = trim($arg);
//			$newargs[] = "_$arg";
//			$pseudo .= "\tvar _$arg = $arg;\n";
//		}
//		$out .= join(",", $newargs);
//		$pseudo .= "\n=====*/\n\n";
//		$out .= $pseudo;
//	}else{
//		$out .= "){";
//	}
//	
//	return $out;

	// turn (dojo, dijit) into (this.dojo, this.dijit);
	$args = $matches[3];
	$freshargs = preg_replace('/\w+/', "_$0", $args);
	$newargs = $args; // preg_replace('/\w+/', "this.$0", $args);
	$body = $matches[4];

	return ";(function" . $freshargs . "{" . $body . "})" . $args . ";";
	
}

function _amd_unwrap($text, $namespace, $file_name) {
	// looking for something like...
	//
	//	 define("my/module", ["path/to/module", "another/module"]
	//	 define(["path/to/module", "another/module"]
	//	 define(["path/to/module"]
	//	 define([]
	//
	// if the mid is missing (which is the usual case), then the mid is given by the namespace + filename

	if (preg_match('/\/\/>>not-amd/', $text) || !preg_match('/define\s*\(\s*([\'"]([^\'"]+)[\'"]\s*,\s*)?\[\s*([^\]]*?)\s*\]/', $text, $matches)) {
		// not an AMD module
		//print "not an AMD module\n\n\n"; //for debugging
		return $text;
	}

	$mid = trim($matches[2]);
	if ($mid=="" || empty($mid)) {
		// prefix the namespace; remove the .js filetype
		if (preg_match('/(.+)\.js/', $file_name, $midMatches)) {
			$mid = $namespace . "/" . $midMatches[1];
		} else {
			//print "not an AMD module\n\n\n";	//for debugging
			return $text;
		}
	}

	$requires = "";
	foreach (explode(",", $matches[3]) as $dep) {
		// regex is looking for the trimmed contents of a quoted string
		// if a plugin resource is given (e.g., "dojo/text!./path/to/template.html"), then return the plugin (e.g., "dojo/text")
		if (preg_match('/[\'"]\s*([^\'"!]+)\!?[^\'"]*\s*[\'"]/', $dep, $match)) {
			$dep = $match[1];
			if (substr($dep, 0, 1)==".") {
				// path is relative to mid
				$dep = explode("/", $dep);
				$ref = explode("/", $mid);
				array_pop($ref);
				foreach($dep as $part){
					if ($part=="..") {
						array_pop($ref);
					} else if ($part!=".") {
						array_push($ref, $part);
					} 
				}
				$dep = implode(".", $ref);
			} else {
				// absolute path
				$dep = str_replace("/", ".", $dep);
			}
			// don't dojo.require dojo or the CommonJs module lexical vars
			if ($dep!="dojo" && $dep!="require" && $dep!="exports" && $dep!="module") {
				$requires.= "dojo.require(\"" . $dep	. "\");\n";
			}
		} else {
			// print "failed to find dependency name in what looks like an AMD module (" .	 $namespace . "/" . $file_name . ").\n";
			// print $matches[0];
		}
	}
	$result = "dojo.provide(\"" . str_replace("/", ".", $mid)	. "\");\n" . $requires; //
	
	// FIXME: temporary fix, inject pseudo-docs for AMD style define([], function(a,b,c))
	// tricks parser into thinking a b and c are aliases to global objects:
	// FIXME: regexp is really greedy. also breaks define statements in docs if doesn't match first one
	// FIXME: will only break on define([ "eval!function() { return 'fml'; }" ); so don't do that.
	$text = preg_replace_callback('/(define\((.*?)function(\s*\(.*?)\{(.*)\}\);)/s', "_amd_pseudodoc_fix", $text, 1);
	
	// old re:
	// '/(define\(.*?function.*\()(.*)\)\s?\{/'
	
	//print $result . "\n\n"; //for debugging
	return $result . $text;
}

function dojo_get_contents($namespace, $file_name) {

	if (function_exists($namespace . '_code_location')) {
		$location = _dojo_ensure_directory(call_user_func($namespace . '_code_location'));
	}
	else {
		global $_dojo_properties_modules;
		$location = $_dojo_properties_modules[$namespace]['location'];
	}

	$output = array();
	$output['#debug'] = array();

	$filedata = file_get_contents($location . '/' . $file_name);
	$output['#raw_source'] = $filedata;
	$filedata_amd = _amd_unwrap($filedata, $namespace, $file_name);
	if($filedata_amd != $filedata){
		$output['#unwrapped_source'] = $filedata_amd;
	}
	$filedata = $filedata_amd;
	
	$lines = preg_replace('%/\*={3,}|={3,}\*/%', '', $filedata);
	
	try{
		$parser = new JavaScriptParser(JavaScriptLanguage::tokenize($lines));
	}catch(Exception $e){
		$output['#debug'][] = "Died parsing $file_name";
		$output['#debug'][] = $e;
		return $output;
	}
	
//	print '<pre>';
//	$statements = $parser->statements();
//	print $statements[0]->resolve();
//	print '</pre>';
//	die();
	
	try{
		$package = new JavaScriptStatements($parser->statements());		
	}catch(Exception $e){
		$output['#debug'][] = "Died parsing statements";
		$output['#debug'][] = $e;
		return $output;
	}

	// Handle dojo.provide calls
	foreach ($package->function_calls(TRUE, 'dojo.provide') as $call) {
		if ($module = $call->arguments()->getString(0)) {
			$output['#provides'] = $module;
		}
	}

	$output['#resource'] = $file_name;
	
	// Handle dojo.require calls
	foreach ($package->function_calls(TRUE, 'dojo.require') as $call) {
		if ($module = $call->arguments()->getString(0)) {
			$output['#requires'][] = array('common', $module);
		}
	}

	// Handle mixin/extend calls
	foreach ($package->function_calls(TRUE, 'dojo.mixin', 'dojo.extend', 'lang.extend', 'lang.mixin', 'lang._mixin', 'dojo._mixin') as $call) {
		$arguments = $call->arguments();
		$assignment = $call->assignment();
		$name = $call->name();
		$root = NULL;
		if ($constructor = $arguments->getFunction(0)) {
			if ($assignment) {
				Dojo::roll_out($constructor, $assignment, FALSE, $output);
			}
		}
		else {
			$root = $arguments->getVariable(0, TRUE);
			if (endswith($name, 'extend')) {
				$output[$root]['type'] = 'Function';
			}
		}

		foreach (array_diff(array_unique(array($assignment, $root)), array(NULL)) as $root) {
			$mixin = endswith($name, "mixin");
			for ($i = 1; $i < $arguments->length; $i++) {
				if ($arguments->getObject($i)) {
					$keys = array();
					foreach ($arguments->getObject($i)->values() as $key => $values) {
						$keys[] = $key;
						$full_name = "$root.$key";
						foreach ($values as $value) {
							if ($value instanceof JavaScriptVariable) {
								$key = $mixin ? $full_name : "$root.prototype.$key";
								if ($key != $value->value()) {
									$output[$key]['alias'] = $value->value();
								}
							}
							else {
								Dojo::roll_out($value, $full_name, FALSE, $output);
								$output[$full_name][$mixin ? 'attached' : 'prototype'] = $root;
							}
						}
					}
					Dojo::roll_out_comment_block($arguments->getObject($i), $root, $output, $keys);
				}
				elseif ($root && $full_name = $arguments->getVariable($i)) {
					if ($mixin) {
						$output[$root]['mixins']['normal'][] = $full_name;
					}
					else {
						$output[$root]['chains']['prototype'][] = $full_name;
					}
				}
			}
		}
	}

	foreach ($package->function_calls(TRUE, 'dojo.declare', 'declare') as $call) {
		$arguments = $call->arguments();
		$name = $arguments->getString(0);
		if (!$name) {
			$assignment = $call->assignment();
			$output['#debug'][] = "Found declare() without a name? check return value?" + $assignments;
			continue;
		} else{
			// $output['#debug'][] = "Found declare w/ $name";
		}
		$output[$name]['type'] = 'Function';
		if ($superclass = $arguments->getVariable(1)) {
			if ($superclass != 'null') {
				$output[$name]['chains']['prototype'][] = $superclass;
				$output[$name]['chains']['call'][] = $superclass;
			}
		}
		elseif ($superclasses = $arguments->getArray(1)) {
			for($i = 0; TRUE; $i++) {
				if ($superclass = $superclasses->getVariable($i)) {
					$output[$name]['chains']['prototype'][] = $superclass . ($i ? '.prototype' : '');
					$output[$name]['chains']['call'][] = $superclass;
				}
				else {
					break;
				}
			}
		}
		if ($mixin = $arguments->getObject(2)) {
			$keys = $block_keys = Dojo::$block_keys;
			$new_keys = array();
			$constructors = array();
			// Remember that bad code can have multiple matching keys
			foreach ($mixin->values() as $key => $values) {
				$new_keys[] = $key;
				$full_name = "$name.$key";
				foreach ($values as $value) {
					if ($value instanceof JavaScriptFunction) {
						if (in_array($key, array('constructor', 'preamble', 'postscript'))) {
							$output[$full_name]['constructor'] = $key;
							$output[$full_name]['prototype'] = $name;
							$constructors[$full_name] = $value;
							continue;
						}
					}
					elseif ($value->type() == 'variable') {
						if ($full_name != $value->value()) {
							$output[$full_name]['alias'] = $value->value();
						}
						continue;
					}

					$output[$full_name]['prototype'] = $name;
					$new_keys = array_unique(array_merge($new_keys, Dojo::roll_out($value, $full_name, FALSE, $output, $new_keys)));
				}
			}

			foreach ($constructors as $full_name => $constructor) {
				$new_keys = array_unique(array_merge($new_keys, Dojo::roll_out($constructor, $name, FALSE, $output, $new_keys)));
				foreach ($output[$name] as $key => $value) {
					if ($key != 'chains') {
						$output[$full_name][$key] = $value;
					}
				}
			}

			Dojo::roll_out_comment_block($mixin, $name, $output, $new_keys);
		}
	}

	// Variable assignments (global)
	foreach ($package->assignments(TRUE) as $variable) {
		foreach ($variable->names() as $name) {
			$parts = explode('.', $name);
			$name = implode('.', array_diff($parts, array('prototype')));
			$last = array_pop($parts);

			$is_prototype = ($last == 'prototype');

			Dojo::roll_out($variable->value(), $name, FALSE, $output, array(), $is_prototype);

			if (count($parts) && !$is_prototype) {
				$output[$name]['attached'] = implode('.', $parts);
			}
		}
	}

	// dojo.provide creates new objects if needed
	if (!empty($output['#provides'])) {
		$parts = explode('.', $output['#provides']);
		while (count($parts)) {
			if (!array_key_exists(implode('.', $parts), $output)) {
				$output[implode('.', $parts)] = array('type' => 'Object');
			}
			array_pop($parts);
		}
	}

	// Set privacy, classlikeness, and clean up the summary a bit
	foreach ($output as $object_name => $object) {
		if ($object_name{0} == '#') {
			continue;
		}
		$parts = explode('.', $object_name);
		$last = array_pop($parts);
		if ($last{0} == '_') {
			$output[$object_name]['private'] = true;
		}
		if (preg_match('%\._+[^A-Z]%', implode('.', $parts), $match)) {
				$output[$object_name]['private_parent'] = true;
		}
		if (is_array($object['tags'])) {
			foreach ($object['tags'] as $tag) {
				if ($tag == 'protected') {
					unset($output[$object_name]['private']);
					$output[$object_name]['protected'] = true;
				}
				elseif ($tag == 'private') {
					unset($output[$object_name]['protected']);
					$output[$object_name]['private'] = true;
				}
				elseif ($tag == 'deprecated') {
					$output[$object_name]['deprecated'] = true;
				}
			}
			$output[$object_name]['tags'] = array_diff($object['tags'], array('private', 'protected', 'deprecated'));
		}

		if (isset($object['inferred_type'])) {
			if (empty($object['type'])) {
				$output[$object_name]['type'] = $object['inferred_type'];
			}
			unset($output[$object_name]['inferred_type']);
		}

		if ($object['type'] == 'Function') {
			if (preg_match('%^(_*)[A-Z]%', $last, $match)) {
				if (strlen($match[1]) < 2) {
					unset($output[$object_name]['private']);
				}
				$output[$object_name]['classlike'] = true;
			}
		}

		if ($object['prototype'] && $output[$object['prototype']]) {
			$output[$object['prototype']]['classlike'] = true;
		}
		elseif ($object['instance'] && $output[$object['instance']]) {
			$output[$object['instance']]['classlike'] = true;
		}
	}

	return $output;
}

function endswith($haystack, $needle){
	$length = strlen($needle);
	$start = $length * -1; 
	return (substr($haystack, $start) === $needle);
}

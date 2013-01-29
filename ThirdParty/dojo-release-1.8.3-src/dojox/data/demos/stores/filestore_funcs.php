<?php
	/**
	 *  Helper function to convert a simple pattern to a regular expression for matching.
	 * 
	 *	Returns a regular expression object that conforms to the defined conversion rules.
	 *		For example:  
	 *		ca*   -> /^ca.*$/
	 *		*ca*  -> /^.*ca.*$/
	 *		*c\*a*  -> /^.*c\*a.*$/
	 *		*c\*a?*  -> /^.*c\*a..*$/
	 *		and so on.
	 *
	 * @param pattern: string
	 *		A simple matching pattern to convert that follows basic rules:
	 *			* Means match anything, so ca* means match anything starting with ca
	 *			? Means match single character.  So, b?b will match to bob and bab, and so on.
	 *      	\ is an escape character.  So for example, \* means do not treat * as a match, but literal character *.
	 *  			To use a \ as a character in the string, it must be escaped.  So in the pattern it should be 
	 *				represented by \\ to be treated as an ordinary \ character instead of an escape.
	 */
	function patternToRegExp(/*String*/$pattern){
		$rxp = "^";
		$c = "";
		$len = strlen($pattern);
		for ($i = 0; $i < $len; $i++) {
			$c = $pattern[$i];
			switch ($c) {
				case '\\':
					$rxp = $rxp.$c;
					$i++;
					$rxp = $rxp.$pattern[$i];
					break;
				case '*':
					$rxp = $rxp.".*"; break;
				case '?':
					$rxp = $rxp."."; break;
				case '$':
				case '^':
				case '/':
				case '+':
				case '.':
				case '|':
				case '(':
				case ')':
				case '{':
				case '}':
				case '[':
				case ']':
					$rxp = $rxp."\\"; //fallthrough
				default:
					$rxp = $rxp.$c;
			}
		}
		return "(".$rxp."$)";
	}

	/**
	 * Function to load all file info from a particular directory.
	 *
	 * @param $dir The dir to seach from, relative to $rootDir.
	 * @param $rootDir The directory where the file service is rooted, used as separate var to allow easier checking and prevention of ../ing out of the tree.
	 * @param $recurse Whether or not to deep scan the dir and return all subfiles, or just return the toplevel files.
	 * @param $dirsOnly boolean to enote to only return directory names, not filenames.
	 * @param $expand boolean to indicate whether or not to inflate all children files along a path/file, or leave them as stubs.
	 * @param $showHiddenFiles boolean to indicate to return hidden files as part of the list.
	 */
	function getAllfiles($dir, $rootDir, $recurse, $dirsOnly, $expand, $showHiddenFiles) { 
		// summary:
		//		A function to obtain all the files in a particular directory (file or dir)
		$files = array();
		$dirHandle = opendir($rootDir."/".$dir);
		if ($dirHandle) {
			while($file = readdir($dirHandle)) {
				if ($file) {
					if ($file != ".." && $file != ".") {
						$path = $dir."/".$file;
						$fileObj = generateFileObj($file, $dir, $rootDir,$expand,$showHiddenFiles);
						if (is_dir($rootDir."/".$path)) {
							if ($recurse) {
								if ($showHiddenFiles || $fileObj["name"][0] != '.') {
									$subfiles = getAllfiles($path,$rootDir,$recurse,$dirsOnly,$expand,$showHiddenFiles);
									$length = count($subfiles);
									for ($i = 0; $i < $length; $i++) {
										$files[] = $subfiles[$i];
									}
								}
							}
						}
						if (!$dirsOnly || $fileObj["directory"]) {
							if ($showHiddenFiles || $fileObj["name"][0] !== '.') {
								$files[] = $fileObj;
							}
						}
					}
				}
			}
		}
		closedir($dirHandle);
		return $files;
	}

	/** 
	 * Function to generate an associative map of data about a specific file.
	 * @param $file The name of the file this object represents.
	 * @param $dir The sub-path that contains the file defined by $file
	 * @param $rootDir The directory from which to append dir and name to get the full path to the file.
	 * @param $expand boolean to denote that if the file is a directory, expand all children in the children attribute 
	 *        to a a full object
	 * @param $showHiddenFiles boolean to denote if hidden files should be shown in-view or not.
	 *
	 * @return Associative Map.   The details about the file:
	 *  $file["name"] - Returns the shortname of the file.
	 *  $file["parentDir"] - Returns the relative path from the service root for the parent directory containing file $file["name"]
	 *  $file["path"] - The relative path to the file.
	 *  $file["directory"] - Boolean indicator if the file represents a directory.
	 *  $file["size"] - The size of the file, in bytes.
	 *  $file["modified] - The modified date of the file in milliseconds since Jan 1st, 1970.
	 *  $file["children"] - Children files of a directory.  Empty if a standard file.
	 */
	function generateFileObj($file, $dir, $rootDir, $expand, $showHiddenFiles) {
		// summary:
		//		Function to generate an object representation of a disk file.
		$path = $file;
		if ($dir != "." && $dir != "./") {
			$path = $dir."/".$file;
		}

		$fullPath = $rootDir."/".$path;

		$atts = stat($fullPath);

		$rootPath = realPath($rootDir);                                       
		$resolvedDir = realPath($rootDir."/".$dir);
		$resolvedFullPath = realPath($fullPath);

		//Try to normalize down the paths so it does a consistent return.
		if (strcmp($rootPath, $resolvedDir) === 0) {
			$dir = ".";
		} else {
			$dir = substr($resolvedDir, (strlen($rootPath) + 1), strlen($resolvedDir));
			$dir = "./".str_replace("\\","/",$dir);
		}
		if (strcmp($rootPath, $resolvedFullPath) === 0) {
			$path = ".";
		} else {
			$path = substr($resolvedFullPath, (strlen($rootPath) + 1), strlen($resolvedFullPath));
			$path = "./".str_replace("\\","/",$path);
		}

		$fObj = array();
		$fObj["name"] = $file;
		$fObj["parentDir"] = $dir;
		$fObj["path"] = $path;
		$fObj["directory"] = is_dir($fullPath);
		$fObj["size"] = filesize($fullPath);
		$fObj["modified"] = $atts[9];

		if (is_dir($fullPath)) {
			$children = array();
			$dirHandle = opendir($fullPath);
			while($cFile = readdir($dirHandle)) {
				if ($cFile) {
					if ($cFile != ".." && $cFile != ".") {
						if ($showHiddenFiles || $cFile[0] != '.') {
							if (!$expand) {
								$children[] = $cFile;
							}else{
								$children[] = generateFileObj($cFile, $path, $rootDir, $expand, $showHiddenFiles);
							}
						}
					}
				}
			}
			closedir($dirHandle);
			$fObj["children"] = $children;
		}
		return $fObj;
	}

	/**
	 * A field comparator class, whose role it is to define which fields on an associaive map to compare on
	 * and provide the comparison function to do so.
	 */
	class FieldComparator {
		var $field;
		var $descending = false;

		/**
		 * Constructor.
		 * @param $f The field of the item to compare.
		 * @param $d Parameter denoting whether it should be ascending or descending.  Default is ascending.
		 */
		function FieldComparator($f, $d) {
			$this->field = $f;
			$this->descending = $d;
		}

		/**
		 * Function to compare file objects A and B on the field defined by $this->field.
		 * @param $fileA The first file to compare.
		 * @param #fileB The second file to compare.
		 */
		function compare($fileA,$fileB){
			$f = $this->field;
			$a = $fileA[$f];
			$b = $fileB[$f];

			$ret = 0;
			if (is_string($a) && is_string($b)) {
				$ret = strcmp($a,$b);
			} else if($a > $b || $a === null){
				$ret = 1;
			}else if($a < $b || $b === null){
				$ret = -1;
			}

			if (property_exists($this, "descending") && $this->descending == true) {
				$ret = $ret * -1;
			}

			if ($ret > 0) {
				$ret = 1;
			} else if ($ret < 0) {
				$ret = -1;
			}
			return $ret; //int, {-1,0,1}
		}
	}

	/**
	 * A compound comparator class, whose role it is to sequentially call a set of comparators on two objects and 
	 * return the combined result of the comparison.
	 */
	class CompoundComparator {
		//Comparator chain.
		var $comparators = array();

		/**
		 * Function to compare two objects $a and $b, using the chain of comparators.
		 * @param $a The first object to compare.  
		 * @param $b The second object to compare.
		 * @returns -1, 0, 1.  -1 if a < b, 1 if a > b, and 0 if a = b.
		 */
		function compare($a, $b) {
			$ret = 0;
			$size = count($this->comparators);
			for ($i = 0; $i < $size; $i++) {
				$comp = $this->comparators[$i];
				$ret = $comp->compare($a, $b);
				if ($ret != 0) {
					break;
				}
			}
			return $ret;
		}

		/**
		 * Function to add a comparator to the chain.
		 * @param $comp The comparator to add.
		 */
		function addComparator($comp){
			$this->comparators[] = $comp;
		}
	}

	/**
	 * A function to create a Comparator class with chained comparators based off the sort specification passed into the store.
	 * @param $sortSpec The Sort specification, which is an array of sort objects containing ( attribute: "someStr": descending: true|fase}
	 * @returns The constructed comparator.
	 */
	function createComparator($sortSpec) {
		//Function to construct the class that handles chained comparisons.
		$comparator = new CompoundComparator();
		$size = count($sortSpec);
		for ($i = 0; $i < $size; $i++) {
			$sort = $sortSpec[$i];
			$desc = false;
			if(property_exists($sort, "descending")){
				$desc = $sort->descending;
			}
			$fileComp = new FieldComparator($sort->attribute,$desc);
			$comparator->addComparator($fileComp);
		}
		return $comparator;
	}

	/**
	 * Function to match a set of queries against a directory and possibly all subfiles.
	 * @param query The Query send in to process and test against.
	 * @param patterns The set of regexp patterns generated off the query.
	 * @param dir the directory to search in.
	 * @param recurse Whether or not to recurse into subdirs and test files there too.
	 *
	 * @return Array.  Returns an array of all matches of the query.
	 */
	function matchFiles($query, $patterns, $ignoreCase, $dir, $rootDir, $recurse, $dirsOnly, $expand, $showHiddenFiles) {
		$files = array();
		$fullDir = $rootDir."/".$dir;

		if ($fullDir != null && is_dir($fullDir)) {

			$dirHandle = opendir($fullDir);
			while ($file = readdir($dirHandle)) {
				if ($file != "." && $file != "..") {
					$item = generateFileObj($file, $dir, $rootDir, $expand,$showHiddenFiles);
					$keys = array_keys($patterns);
					$total = count($keys);
					for ($i = 0; $i < $total; $i++) {
						$key = $keys[$i];
						$pattern = $query[$key];
						$matched = containsValue($item,$key,$query[$key],$patterns[$key], $ignoreCase);
						if (!$matched) {
							break;
						}
					}
					if ($matched) {
						if (!$dirsOnly || $item["directory"]) {
							if ($showHiddenFiles || $item["name"][0] != '.') {
								$files[] = $item;
							}
						}
					}

					if (is_dir($rootDir."/".$item["path"]) && $recurse) {
						if ($showHiddenFiles || $item["name"][0] != '.') {
							$files = array_merge($files, matchFiles($query, $patterns, $ignoreCase, $item["path"], $rootDir, $recurse, $dirsOnly, $expand, $showHiddenFiles));
						}
					}
				}
			}
			closedir($dirHandle);
		}
		return $files;
	}

	/**
	 * Function to handle comparing the value of an attribute on a file item.
	 * @param item  The item to examine.
	 * @param attr The attribute of the tem to examine.
	 * @parma value The value to compare it to.
	 * @param rExp A regular Expression pattern object generated off 'value' if any.
	 * 
	 * @returns boolean denoting if the value was matched or not.
	 */
	function containsValue($item, $attr, $value, $rExp, $ignoreCase) {
		$matched = false;
		$possibleValue = $item[$attr];
		if ($possibleValue === null && $value === null) {
			$matched = true;
		} else {
			if ($rExp != null && is_string($possibleValue)) {
				if ($ignoreCase) {
					$matched = eregi($rExp, $possibleValue);
				} else {
					$matched = ereg($rExp, $possibleValue);
				}

			} else {
				if ($value != null && $possibleValue != null) {
					$matched = ($value == $possibleValue);
				}
			}
		}              
		return $matched;
	}
// No closing PHP tag on purpose.  Do not want it to print whitepace and thus not allow setting headers later.

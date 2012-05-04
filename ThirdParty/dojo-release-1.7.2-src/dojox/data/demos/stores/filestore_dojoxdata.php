<?php
	//Define the root directory to use for this service.
	//All file lookups are relative to this path.
	$rootDir = "../..";

	require_once("filestore_funcs.php");

	//Extract the query, if any.
	$query = false;
	if (array_key_exists("query", $_GET)) {
		$query = $_GET['query'];
		$query = str_replace("\\\"", "\"", $query);
		$query = json_decode($query, true);
	}
	//Extract relevant query options.
	$queryOptions = json_decode("{}");
	$deep = false;
	$ignoreCase = false;
	if (array_key_exists("queryOptions", $_GET)) {
		$queryOptions = $_GET['queryOptions'];
		$queryOptions = str_replace("\\\"", "\"", $queryOptions);
		$queryOptions = json_decode($queryOptions);
		if (property_exists($queryOptions, "deep")) {
			$deep = $queryOptions->deep;
		}
		if (property_exists($queryOptions, "ignoreCase")) {
			$ignoreCase = $queryOptions->ignoreCase;
		}
	}

	//Extract non-dojo.data spec config options.
	$expand = false;
	$dirsOnly = false;
	$showHiddenFiles = false;
	$options = array();
	if (array_key_exists("options", $_GET)) {
		$options = $_GET['options'];
		$options = str_replace("\\\"", "\"", $options);
		$options = json_decode($options);
		if (array_search("expand", $options) > -1) {
			$expand = true;
		}
		if (array_search("dirsOnly", $options) > -1) {
			$dirsOnly = true;
		}
		if (array_search("showHiddenFiles", $options) > -1) {
			$showHiddenFiles = true;
		}
	}


	//See if a specific file was requested, or if it is just a query for files.
	$path = false;
	if (array_key_exists("path", $_GET)) {
		$path = $_GET['path'];
	}

	if (!is_string($path)) {

		$files = array();

		//Handle query for files.  Must try to generate patterns over the query 
		//attributes.
		$patterns = array();
		if (is_array($query)) {
			//Generate a series of RegExp patterns as necessary.
			$keys = array_keys($query);
			$total = count($keys);
			if ($total > 0) {
				for ($i = 0; $i < $total; $i++) {
					$key = $keys[$i];
					$pattern = $query[$key];
					if (is_string($pattern)) {
						$patterns[$key] = patternToRegExp($pattern);
					}
				}
				$files = matchFiles($query, $patterns, $ignoreCase, ".", $rootDir, $deep, $dirsOnly, $expand, $showHiddenFiles);
			} else {
				$files = getAllFiles(".",$rootDir,$deep,$dirsOnly,$expand,$showHiddenFiles);
			}
		}else{
			$files = getAllFiles(".",$rootDir,$deep,$dirsOnly,$expand,$showHiddenFiles);
		}

		$total = count($files);

		//Handle the sorting and paging.
		$sortSpec = false;
		if (array_key_exists("sort", $_GET)) {
			$sortSpec = $_GET['sort'];
			$sortSpec = str_replace("\\\"", "\"", $sortSpec);
			$sortSpec = json_decode($sortSpec);
		}

		if ($sortSpec != null) {
			$comparator = createComparator($sortSpec);
			usort($files,array($comparator, "compare"));
		}

		//Page, if necessary.
		if (array_key_exists("start", $_GET)) {
			$start = $_GET['start'];
			if (!is_numeric($start)) {
				$start = 0;
			}
			$files = array_slice($files, $start);
		}
		if (array_key_exists("count", $_GET)) {
			$count = $_GET['count'];
			if (!is_numeric($count)) {
				$count = $total;
			}
			$files = array_slice($files, 0, $count);
		}

		$result;
		$result->total = $total;
		$result->items = $files;
		header("Content-Type", "text/json");
		print("/* ".json_encode($result)." */");
	} else {
		//Query of a specific file (useful for fetchByIdentity and loadItem)

		//Make sure the path isn't trying to walk out of the rooted directory
		//As defined by $rootDir in the top of the php script.
		$rootPath = realPath($rootDir);
		$fullPath = realPath($rootPath."/".$path);

		if ($fullPath !== false) {
			if (strpos($fullPath,$rootPath) === 0) {
				//Root the path into the tree cleaner.
				if (strlen($fullPath) == strlen($rootPath)) {
					$path = ".";
				} else {
					//Fix the path to relative of root and put back into UNIX style (even if windows).
					$path = substr($fullPath,(strlen($rootPath) + 1),strlen($fullPath));
					$path = str_replace("\\", "/", $path);
				}

				if (file_exists($fullPath)) {
					$arr = split("/", $path);
					$size = count($arr);

					if ($size > 0) {
						$fName = $arr[$size - 1];
						if ($size == 1) {
							print("Setting path to: .");
							$path = ".";
						} else {
							$path = $arr[0];
						}
						for ($i = 1; $i < ($size - 1); $i++) {
							$path = $path."/".$arr[$i];
						}
						$file = generateFileObj($fName, $path, $rootDir, $expand,$showHiddenFiles);
						header("Content-Type", "text/json");
						print("/* ".json_encode($file)." */");
					} else {
						header("HTTP/1.0 404 Not Found");
						header("Status: 404 Not Found");
						print("<b>Cannot access file: [".htmlentities($path)."]<b>");
					}
				} else {
						header("HTTP/1.0 404 Not Found");
						header("Status: 404 Not Found");
						print("<b>Cannot access file: [".htmlentities($path)."]<b>");
				}
			} else {
				header("HTTP/1.0 403 Forbidden");
				header("Status: 403 Forbidden");
				print("<b>Cannot access file: [".htmlentities($path)."].  It is outside of the root of the file service.<b>");
			}
		} else {
				header("HTTP/1.0 404 Not Found");
				header("Status: 404 Not Found");
				print("<b>Cannot access file: [".htmlentities($path)."]<b>");
		}
	}
?>

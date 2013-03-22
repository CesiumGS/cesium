<?php
// summary
//		Test file to handle image uploads (remove the image size check to upload non-images)
//
//		This file handles both Flash and HTML uploads
//
//		NOTE: This is obviously a PHP file, and thus you need PHP running for this to work
//		NOTE: Directories must have write permissions
//		NOTE: This code uses the GD library (to get image sizes), that sometimes is not pre-installed in a
//				standard PHP build.
//
require("cLOG.php");

function findTempDirectory()
  {
    if(isset($_ENV["TMP"]) && is_writable($_ENV["TMP"])) return $_ENV["TMP"];
    elseif( is_writable(ini_get('upload_tmp_dir'))) return ini_get('upload_tmp_dir');
    elseif(isset($_ENV["TEMP"]) && is_writable($_ENV["TEMP"])) return $_ENV["TEMP"];
    elseif(is_writable("/tmp")) return "/tmp";
    elseif(is_writable("/windows/temp")) return "/windows/temp";
    elseif(is_writable("/winnt/temp")) return "/winnt/temp";
    else return null;
  }
function trace($txt, $isArray=false){
	//creating a text file that we can log to
	// this is helpful on a remote server if you don't
	//have access to the log files
	//
	$log = new cLOG("../tests/upload.txt", false);
	//$log->clear();
	if($isArray){
		$log->printr($txt);
	}else{
		$log->write($txt);
	}

	//echo "$txt<br>";
}
function getImageType($filename){
	return strtolower(substr(strrchr($filename,"."),1));
}
trace("---------------------------------------------------------");

//
//
//	EDIT ME: According to your local directory structure.
// 	NOTE: Folders must have write permissions
//
$upload_path = "../tests/uploads/"; 	// where image will be uploaded, relative to this file
$download_path = "../tests/uploads/";	// same folder as above, but relative to the HTML file

//
// 	NOTE: maintain this path for JSON services
//
require("../../../dojo/tests/resources/JSON.php");
$json = new Services_JSON();

//
// 	Determine if this is a Flash upload, or an HTML upload
//
//

//		First combine relavant postVars
$postdata = array();
$htmldata = array();
$data = "";
trace("POSTDATA: " . count($_FILES) . " FILES");
foreach ($_POST as $nm => $val) {
	$data .= $nm ."=" . $val . ",";	// string for flash
	$postdata[$nm] = $val;			// array for html
}

trace($postdata, true);

foreach ($_FILES as $nm => $val) {
	trace("   file: ".$nm ."=" . $val);
}

foreach ($_GET as $nm => $val) {
	trace($nm ."=" . $val);
}

$fieldName = "flashUploadFiles";//Filedata";

if( isset($_FILES[$fieldName]) || isset($_FILES['uploadedfileFlash'])){
	//
	// If the data passed has $fieldName, then it's Flash.
	// NOTE: "Filedata" is the default fieldname, but we're using a custom fieldname.
	// The SWF passes one file at a time to the server, so the files come across looking
	// very much like a single HTML file. The SWF remembers the data and returns it to
	// Dojo as an array when all are complete.
	//
	trace("returnFlashdata....");

	trace("");
	trace("ID:");

	trace("Flash POST:");
	trace($_POST, true);


	$returnFlashdata = true; //for dev

	if( isset($_FILES[$fieldName])){
	  // backwards compat - FileUploader
	  trace("FILES:");
	  trace($_FILES[$fieldName], true);
	  $m = move_uploaded_file($_FILES[$fieldName]['tmp_name'],  $upload_path . $_FILES[$fieldName]['name']);
	  $name = $_FILES[$fieldName]['name'];

	}else{
	  // New fieldname - Uploader
	  trace("FILES:");
	  trace($_FILES['uploadedfileFlash'], true);
	  $m = move_uploaded_file($_FILES['uploadedfileFlash']['tmp_name'],  $upload_path . $_FILES['uploadedfileFlash']['name']);
	  $name = $_FILES['uploadedfileFlash']['name'];

	}

	$file = $upload_path . $name;
	try{
	  list($width, $height) = getimagesize($file);
	} catch(Exception $e){
	  $width=0;
	  $height=0;
	}
	$type = getImageType($file);
	trace("file: " . $file ."  ".$type." ".$width);
	// 		Flash gets a string back:

	//exit;

	$data .='file='.$file.',name='.$name.',width='.$width.',height='.$height.',type='.$type;
	if($returnFlashdata){
		trace("returnFlashdata:\n=======================");
		trace($data);
		trace("=======================");
		// echo sends data to Flash:
		echo($data);
		// return is just to stop the script:
		return;
	}

}elseif( isset($_FILES['uploadedfile0']) ){
	//
	//	Multiple files have been passed from HTML
	//
	$cnt = 0;
	trace("HTML multiple POST:");
	trace($postdata, true);

	$_post = $htmldata;
	$htmldata = array();

	while(isset($_FILES['uploadedfile'.$cnt])){
	  trace("HTML multiple POST");
		$moved = move_uploaded_file($_FILES['uploadedfile'.$cnt]['tmp_name'],  $upload_path . $_FILES['uploadedfile'.$cnt]['name']);
		trace("moved:" . $moved ."  ". $_FILES['uploadedfile'.$cnt]['name']);
		if($moved){
			$name = $_FILES['uploadedfile'.$cnt]['name'];
			$file = $upload_path . $name;
			$type = getImageType($file);
			try{
			  list($width, $height) = getimagesize($file);
			} catch(Exception $e){
			  $width=0;
			  $height=0;
			}
			trace("file: " . $file );

			$_post['file'] = $file;
			$_post['name'] = $name;
			$_post['width'] = $width;
			$_post['height'] = $height;
			$_post['type'] = $type;
			$_post['size'] = filesize($file);
			$_post['additionalParams'] = $postdata;
			trace($_post, true);

			$htmldata[$cnt] = $_post;

		}elseif(strlen($_FILES['uploadedfile'.$cnt]['name'])){
		  $htmldata[$cnt] = array("ERROR" => "File could not be moved: ".$_FILES['uploadedfile'.$cnt]['name']);
		}
		$cnt++;
	}
	trace("HTML multiple POST done:");
	foreach($htmldata as $key => $value){
		trace($value, true);
	}

}elseif( isset($_POST['uploadedfiles']) ){
  trace("HTML5 multi file input... CAN'T ACCESS THIS OBJECT! (POST[uploadedfiles])");
  trace(count($_POST['uploadedfiles'])." ");


}elseif( isset($_FILES['uploadedfiles']) ){
	//
	// 	If the data passed has 'uploadedfiles' (plural), then it's an HTML5 multi file input.
	//
	$cnt = 0;
	trace("HTML5 multi file input");
	//trace($_FILES, true);
	//print_r($_FILES);
	$_post = $postdata;
	trace("POST DATA:::");
	trace($_post, true);
	$htmldata = array();
	$len = count($_FILES['uploadedfiles']['name']);
	//
	// Ugh. The array passed from HTML to PHP is fugly.
	//

	//print_r($_FILES['uploadedfiles']);

	for($i=0;$i<$len;$i++){
		$moved = move_uploaded_file($_FILES['uploadedfiles']['tmp_name'][$i],  $upload_path . $_FILES['uploadedfiles']['name'][$i]);
		trace("moved:" . $moved ."  ". $_FILES['uploadedfiles']['name'][$i]);
		if($moved){
			$name = $_FILES['uploadedfiles']['name'][$i];
			$file = $upload_path . $name;
			$type = getImageType($file);
			try{
			  list($width, $height) = getimagesize($file);
			} catch(Exception $e){
			  error_log("NO EL MOVEO: " . $name);
			  $width=0;
			  $height=0;
			  $_post['filesInError'] = $name;
			}

			if(!$width){
			  $_post['filesInError'] = $name;
			  $width=0;
			  $height=0;
			}
			trace("file: " . $file ." size: " . $width." ".$height);

			$_post['file'] = $file;
			$_post['name'] = $name;
			$_post['width'] = $width;
			$_post['height'] = $height;
			$_post['type'] = $type;
			$_post['size'] = filesize($file);
			//$_post['additionalParams'] = $postdata;
			//trace($_post, true);

			$htmldata[$cnt] = $_post;

		}elseif(strlen($_FILES['uploadedfiles']['name'][$i])){
		  $htmldata[$cnt] = array("ERROR" => "File could not be moved: ".$_FILES['uploadedfiles']['name'][$i]);
		}
		$cnt++;
	}

	$data = $json->encode($htmldata);
	trace($data);
	print $data;
	return $data;

}elseif( isset($_FILES['uploadedfile']) ){
	//
	// 	If the data passed has 'uploadedfile', then it's HTML.
	//	There may be better ways to check this, but this *is* just a test file.
	//
	$m = move_uploaded_file($_FILES['uploadedfile']['tmp_name'],  $upload_path . $_FILES['uploadedfile']['name']);



	trace("HTML single POST:");
	trace($postdata, true);

	$name = $_FILES['uploadedfile']['name'];
	$file = $upload_path . $name;
	$type = getImageType($file);
	try{
	  list($width, $height) = getimagesize($file);
	} catch(Exception $e){
	  $width=0;
	  $height=0;
	}
	trace("file: " . $file );

	$htmldata['file'] = $file;
	$htmldata['name'] = $name;
	$htmldata['width'] = $width;
	$htmldata['height'] = $height;
	$htmldata['type'] = $type;
	$htmldata['size'] = filesize($file);
	$htmldata['additionalParams'] = $postdata;


}elseif(isset($_GET['rmFiles'])){
	trace("DELETING FILES" . $_GET['rmFiles']);
	$rmFiles = explode(";", $_GET['rmFiles']);
	foreach($rmFiles as $f){
		if($f && file_exists($f)){
			trace("deleted:" . $f. ":" .unlink($f));
		}
	}

}else{
	trace("IMROPER DATA SENT... $_FILES:");
	trace($_FILES);
	$htmldata = array("ERROR" => "Improper data sent - no files found");
}

//HTML gets a json array back:
$data = $json->encode($htmldata);
trace("Json Data Returned:");
trace($data);
// in a text field:
?>

<textarea style="width:600px; height:150px;"><?php print $data; ?></textarea>

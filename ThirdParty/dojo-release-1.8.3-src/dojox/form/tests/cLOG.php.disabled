<?php
//
//	summary
//		Creates/Opens files for logging data
//		Useful for logging iinformation on a remote server
//		when you don't have access to log files
//		Also helpful for XHRs - since the page doesn't change
//		to the PHP location which normally shows log data
//		or errors.
//
//
 class cLOG {
	var $logfile;
	var $boolTimestamp;
	function cLOG($filename, $boolTimestamp){
		$this->boolTimestamp = $boolTimestamp;
		$this->logfile = $filename;
	}
	function write($txt){
		if($this->boolTimestamp){
			$dt = date("y.m.d G.i.s");
			$txt = "[". $dt ."]: ".$txt;
		}
		$fh = fopen($this->logfile, "a");
		if(is_array($txt)){
			//$txt = "::::::::".$txt;
			$ar = $txt;
			$txt = "Array:::::\n";
			foreach($ar as $key => $value){
				$txt += $key."=".$value."\n";
			}
		}
		fwrite($fh, $txt."\n");
		fclose($fh);
	}
	function clear(){
		$fh = fopen($this->logfile, "w");
		fwrite($fh, "");
		fclose($fh);
	}
	function newline(){
		$fh = fopen($this->logfile, "a");
		fwrite($fh, "\n\n");
		fclose($fh);
	}
	function printr($ar){
		$txt = "";
		foreach ($ar as $nm => $val) {
			$txt .= "    ".$nm ." = " . $val . "\n";
		}
		$this->write($txt);
	}
}
?>
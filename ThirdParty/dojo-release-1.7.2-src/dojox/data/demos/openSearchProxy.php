<?php
// A simple proxy for testing the OpenSearchStore
// Note, this simple proxy requires a curl-enabled PHP install
if(!$_GET['url']){ return; }

$url = str_replace(array(';;;;', '%%%%'), array('?', '&'), $_GET['url']);
if(stripos($url, "http://intertwingly.net/") === 0 || 
	stripos($url, "http://www.intertwingly.net/") === 0 || 
	stripos($url, "http://www.shutterpoint.com/") === 0 || 
	stripos($url, "http://technorati.com/") === 0){
	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$results = curl_exec($ch);
	header('HTTP/1.1 ' . curl_getinfo($ch, CURLINFO_HTTP_CODE) . ' OK');
	if($_GET['osd'] === 'true'){
		$xml = new SimpleXMLElement($results);
		if($xml->Url){
			foreach($xml->Url as $url){
				$url['template'] = $_SERVER['SCRIPT_NAME'].'?url='.str_replace(array('?', '&'), array(';;;;', '%%%%'), $url['template']);
			}
			header('Content-Type: text/xml');
			print $xml->asXML();
		}
	}else{
		header('Content-Type: '.curl_getinfo($ch, CURLINFO_CONTENT_TYPE));
		print $results;
	}
}else{
	header("HTTP/1.0 403 Forbidden");
	header("Status: 403 Forbidden");
	print "Provided URL not allowed by this demo proxy.";
}


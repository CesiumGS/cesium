<?php /*

  preview.php - rudimentary api browser designed to expose flaws in
  either the dojo doc parser or the effort to document the Dojo Toolkit
  API. it is embarasingly inefficient and sloppy, but works.
  
  this file requires PHP5, and a full source tree of the dojo toolkit.

  it parses a module, and dumps relevant API information made in real
  time. PLEASE use this to preview how the parse tool will interpret
  your code.

  it covers all files in dojtool's modules/ directory dynamically, so
  can be used to preview documentation in custom namespace code, as well.
  
  deep linking is possible via hash tags, eg:
  http://archive.dojotoolkit.org/nightly/dojotoolkit/util/docscripts/preview.php#dojo/dom-class.js

*/

// hide warnings
error_reporting(1);
$ajaxy = !empty($_REQUEST['ajaxy']);
$showall = isset($_REQUEST['showall']);

?>
<?php if(!$ajaxy){ ?>
	<!DOCTYPE html>
	<html>
		<head>
		
			<title>API Preview tool | The Dojo Toolkit</title>
		
			<style type="text/css">
				@import "../../dojo/resources/dojo.css"; 
				@import "../../dijit/themes/claro/claro.css";
				@import "../../dijit/themes/claro/document.css";
				
				body, html { width:100%; height:100%; margin:0; padding:0; overflow:hidden; }
				
				.dnone { display:none; } 
				.topbar li { display:inline; padding:5px; } 
				.pad {
					padding:20px;
					padding-top:8px;
				}
				#main { 
					width:100%; height:100%;
				}
				
				.claro ul {
				    margin-left:10px;
				}
				
				.claro ul ul {
				    border-left: 1px dotted #ccc;
				    margin-top:5px;
				    padding-left:10px;
				    list-style:none;
				}
				
				.source pre {
					margin:0; padding:0;
					border: none;
				}
				pre.error {
					color:red;
					background:yellow;
				}
				
				.claro ul .source ol {
				    list-style: number;
				}
			</style>
			
			<script type="text/javascript" src="../../dojo/dojo.js" djConfig="parseOnLoad:true"></script>
			<script type="text/javascript">
				dojo.require("dojo.data.ItemFileReadStore");
				dojo.require("dojo.hash");
				dojo.require("dijit.Tree");
				dojo.require("dijit.layout.BorderContainer");
				dojo.require("dijit.layout.ContentPane");
				dojo.require("dijit.layout.TabContainer");
				dojo.require("dojox.NodeList.delegate");
				
				var fileStore, fileTree, apiPane;
				
				function tgShow(id){
					dojo.toggleClass(id, "dnone");
				}

				function addTab(ns, file){
					
					var id = ns + "." + (file.split("/").join(".")),
						dij = dijit.byId(id),
						href = "?ns=" + ns + "&file=" + file + "&ajaxy=1&showall=1"
					;
					

					if(!dij){
						dij = new dijit.layout.ContentPane({
							id: id, 
							href: href,
							title: id,
							closable: true
						});
						dij.placeAt(apiPane);
					}else{
						dij.set("href", href + "&bust=" + (+new Date()));
					}
					apiPane.selectChild(dij);
				};
				
				function gohash(hash){
					// do an addTab for a ns/file extraction from the `hash` value
					var all = hash.split("/"),
						ns = all.shift(),
						file = all.join("/")
					;
					console.warn("go hash:", ns, file);
					ns && file && addTab(ns, file);
				}
				
				dojo.subscribe("/dojo/hashchange", gohash);
				
				dojo.ready(function(){
					
					apiPane = dijit.byId("apiTabs");
				//	dojo.connect(apiPane, "selectChild", function(child){
				//		var hash = dojo.hash();
				//		if(child.id !== hash){
				//			dojo.hash(child.id);
				//		}
				//	});
					
					dojo.query("#apiTabs").delegate(".toggler", "onclick", function(e){
						e && e.preventDefault();
						dojo.query(this).parent().siblings(".t").toggleClass("dnone");
					});

					//	build the tree
					fileStore = new dojo.data.ItemFileReadStore({
						url: "_browse_tree.php"
					});

					fileTree = new dijit.Tree({
						store: fileStore,
						query: { type: "namespace" },
						onClick: function(item){
							var type = fileStore.getValue(item, "type");
							if(type == "file"){
								//	load it up
								var ns = fileStore.getValue(item, "ns"),
									file = fileStore.getValue(item, "full_name")
								;
								var c = dojo.hash();
								console.warn(c, ns, file);
								if(c == ns + "/" + file){
									addTab(ns, file);
								}else{
									dojo.hash(ns + "/" + file);
								}
							}
						}
					});
					dojo.place(fileTree.domNode, dijit.byId("fileTreePane").domNode);

					// if we landed with a hash, lets use it:
					var current = dojo.hash();
					current && ~current.indexOf("/") && gohash(current);

				});
			</script>

		</head>
		<body class="claro">
<?php

} // $ajaxy

include_once('lib/parser2/dojo2.inc');

//*
$tree = '';
// no dojo.require() call made?
$u = 0; 
$files = dojo_get_files(); 
foreach ($files as $set){ 
	list($namespace, $file) = $set;
	$data[$namespace][] = $file;
}
$namespaces = array_keys($data); 
unset($files); 

if(!empty($_REQUEST['ns'])){

	$ns = $_REQUEST['ns'];
	$ifile = $_REQUEST['file'];
  

	if($ifile){
		$apiData = dojo_get_contents($ns,$ifile);

		$waserror = FALSE;
		$errorline = 0;
		
		$print .= "<h2>".htmlspecialchars($ns)."/".htmlspecialchars($ifile)."</h2><ul>";
		foreach($apiData as $key => $val){
			switch($key){
				case "#resource" : break;
				case "#requires" : 
					$print .= "<li><h3>Requires:</h3><ul>";
					foreach($val as $resource){
						$print .= "<li>{$resource[1]} in {$resource[0]}";
						if ($resource[2]) {
							$print .= " in project {$resource[2]}";
						}
						$print .= "</li>"; 
					}
					$print .= "</ul></li>"; 
					break;
				case "#provides" :
					$print .= "<li><h3>Provides:</h3><ul>";
					$print .= "<li>$val</li>"; 
					$print .= "</ul></li>"; 
					break;
				case "#debug":
					$print .= "<div><h4>Debugging:</h4><ul>";
					foreach($val as $message){
						$print .= "<li>";
						if(is_string($message)){
							$print .= $message;
						}else{
							$er = $message->getMessage();
							preg_match("/Line\ (\d+)/", $er, $matches);
							if($matches[1]){
								$waserror = TRUE;
								$errorline = $matches[1];
							}
							$print .= "<pre>" . $message->getMessage() . "</pre>";
						}
						$print .= "</li>";
					}
					$print .= "</ul></div>";
					break;
				case "#raw_source":
					$lines = explode("\n", $val);
					$print .= "<div class='source'><h4><a href='#' class='toggler'>Source</a></h4><div class='t dnone'><ol>";
					$i = 0;
					foreach($lines as $line){
						$i++;
						$print .= "<li value='$i'>";
						if($waserror && ($i == $errorline || $errorline + 1 == $i || $errorline - 1 == $i)){ 
							$print .= "<pre class='error'>";
						}else{ 
							$print .= "<pre>";
						}
						$print .= htmlentities($line) . " </pre></li>";
					}
					$print .= "</ol></div></div>";
					break;
				case "#unwrapped_source":
					if(!empty($val)){
						$print .= "<div><h4><a href='#' class='toggler'>" . $key . "</a></h4><pre class='t dnone'>" . htmlentities($val) . "</pre></div>";
					}
					break;
				default:
					$print .= "<li><h4>".$key."</h4><ul> ";
					foreach($val as $key2 => $val2){
  
						switch($key2){
							// most things using dojo.declare() trigger this, eg: dijits
							case "classlike":
								$knownClasses[] = $key;
								if ($_REQUEST['showall']) {
									$print .= "<li>$key2</li>";
								}
								break;

							// these are partially useless for our "overview" api, but set showall=1 in the
							// url if you want to see these, too. sortof.
							case "type" : 
								$print .= "<li><em>".$key2."</em><div><pre>".htmlentities($val2)."</pre></div></li>"; 
								break;
							case "private_parent" :
							case "prototype" :
							case "instance" :
							case "private" :
							case "deprecated" :
							case "protected" :
							case "attached" :
								if($_REQUEST['showall']){ $print .= "<li>".$key2." - ".$val2."</li>"; }
								break;
							case "alias" :
							case "constructor" :
								$print .= "<li>".$key2." - ".$val2."</li>";
								break;
				
							// another array we want inspect more closely 
							case "parameters" : 
								$print .= "<li><em>parameters:</em> <ul>"; 
								foreach($val2 as $param => $paramData){
									$print .= "<li>".$param;
									if (!empty($paramData['type'])) {
										$print .= ": <em>(typeof ".$paramData['type'].")</em>";
									}
									$print .= "<div>";
									if(!empty($paramData['summary'])){
										$print .= "<pre>".htmlentities($paramData['summary'])."</pre>";
									}
									$print .= "</div></li>";
								} //print_r($val2);				
								$print .= "</ul></li>";
								break;
				
								// the stripped source, and some minimal toggling to show/hide	
							case "source" : 
								$print .= "<li class=\"source\"><em>source: [<a onclick=\"tgShow('unique".++$u."');\">view</a>]</em> 
									<div class=\"dnone\" id=\"unique".$u."\">\n
									".ltrim(str_replace("\n","<br>",str_replace("\t","&nbsp;",$val2)))."
									</div>";  
								break;

							case "tags":
								$print .= "<li><em>$key2</em>: " . implode(' ', $val2) . '</li>';
								break;

							case "optional":
								if ($val2) {
									$print .= "<li><em>$key2</em></li>";
								}
								break;

							case "chains" :
							case "mixins" :
								if (!empty($val2)) {
									$print .= "<li><em>" . $key2 . ":</em> <ul>";
									foreach ($val2 as $subtype => $chains) {
										foreach ($chains as $chain) {
											$print .= "<li>$chain: <em>($subtype)</em></li>";
										}
									}
									$print .= "</ul></li>";
								}
								break;

							// these are the ones we care about, and are fulltext/sometimes html
							case "examples" :
								foreach ($val2 as $example){
									$print .= "<li><em>example</em><div><pre>".htmlentities($example)."</pre></div></li>";
								}
								break;

							case "returns" :
							case "return_summary" :
							case "exceptions" :
							case "description" :
							case "summary" : $print .= "<li><em>".$key2."</em><div><pre>".htmlentities($val2)."</pre></div></li>"; break;

							// this is a key we don't know about above, so show it just in case
							default: 
								$print .= "<li>?? ".$key2." = ".$val2." (debug: ".gettype($val2).") ??</li>"; 
								break;
						}
					} 
					$print .= "</ul></li>"; 
					break;
				}
			}
			$print .= "</ul>";
		}
	}

if(!$ajaxy){ ?>
<div dojoType="dijit.layout.BorderContainer" id="main">
	<div dojoType="dijit.layout.ContentPane" id="fileTreePane" region="left" style="width: 250px; overflow: auto;" splitter="true"></div>
	<div dojoType="dijit.layout.TabContainer" id="apiTabs" region="center">
		<div dojoType="dijit.layout.ContentPane" id="apiPane" title="Crude API Browser">
			<div class="pad"><?php echo $print; ?></div>
		</div>
	</div>
</div>
</body>
</html>
<?php }else{
	// we just want the content we parsed
	echo '<div class="pad">'.$print.'</div>';
}
?>

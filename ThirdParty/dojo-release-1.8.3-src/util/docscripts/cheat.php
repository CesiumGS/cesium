<?php
	
	// for this to work, the file api.html needs to be writable locally. pass a "?build" to
	// this url to trigger the generation. otherwise, work live from here. No JS ends up 
	// in the output. api.css gets inlined in the output, making cheat.html standalone. 
	
	$head = '<!DOCTYPE html>
	<html>
		<head>
			<title>API Overview - Dojo Toolkit</title>
		
		';

	$foot = '</body></html>';

	if(!empty($_POST['body'])){
		
		$head .= "<style type='text/css'>" . file_get_contents("cheat/cheat.css") ."</style></head><body>";
		$page = $head . $_POST['body'] . $foot;
			
		if(is_writable("./cheat.html")){
			file_put_contents("./cheat.html", stripslashes($page));
		}else{
			header("HTTP", true, 500);
			print "Unwritable File: cheat.html";
		}
		die;
	}
	
	print $head;
	
?>

		<link rel="stylesheet" href="cheat/cheat.css">

		<script type="text/javascript" src="../../dojo/dojo.js"></script>

		<script type="text/javascript">		
			dojo.require("util.docscripts.cheat.lib");
			dojo.ready(function(){
				
 				// a list of things to ignore in the dojo namespace (either useless, or handled specially)
				var ap = util.docscripts.cheat.lib;

				if(ap.hasTag("excludePlugd")){
					ap.ignore.push(
						// skip plugd api's for Dojo Base
						"pub", "sub", "unique", "first", "last", "end", "show", "hide", "toggle", 
						"conflict", "animate", "wrap", "appendTo", "append", "hoverClass", "hover",
						"qw","generateId"
					);
				}

				// core Dojo stuff:
				if(!ap.hasTag("excludeDojo")){
					ap.addIn("dojo");
					ap.addIn("dojo.NodeList.prototype");
					ap.addIn("dojo.fx", ap.getUl("Effects"));
					ap.addIn("dojo.Animation.prototype", ap.getUl("Effects"));
				}
				
				if(!ap.hasTag("excludeKeys")){
					var ul = ap.getUl("Key-Constants");
					dojo.place("<li class='dblspan'>(dojo.keys.*)</li>", ul, "first");
					ap.addIn("dojo.keys", ul);
				}

				ap.addIn({
					"djConfig": dojo.mixin({},{ 
							parseOnLoad:false,
							requires:[]
						},dojo.config),
					"toString":function(){ return "djConfig" }
				}, ap.getUl("djConfig"));

				// fun quick way to pseudo-doc a tag
//				ap.addIn({
//					"args":{
//						"load":function(data, ioArgs){},
//						"error":function(error){},
//						"handle":function(dataOrError){},
//						url:"", timeout: ""
//					},
//					"toString":function(){
//						// this is to trick the thing into introversion
//						return "args"
//					}
//				}, ap.getUl("Ajax"))

				if(ap.hasTag("includeColor")){
					ap.addIn("dojo.Color.prototype", ap.getUl("Colors"));
				}

				var finish = function(){
					ap.sortFields("container");
					ap.buildNav();
					ap.hasTag("build") && ap.save();
					
				}

				if(ap.hasTag("includeDijit")){
					dojo.require("dijit.dijit");
					dojo.addOnLoad(function(){

						ap.addIn("dijit._Widget.prototype", null, "dijit");
						ap.addIn("dijit", null, "dijit");
						ap.addIn("dijit._Templated.prototype", null, "dijit");
						ap.addIn("dijit.WidgetSet.prototype", ap.getUl("Widget-Access"));
						ap.addIn("dijit.popup", ap.getUl("Widget-Control"));
						finish();
					});
					
				}else{
					finish();
				}
				
				dojo.connect(dojo.global, "onkeypress", function(e){
					if(e.keyCode == dojo.keys.ESCAPE && e.ctrlKey){
						ap.save();
					}
				});
				
				dojo.byId("version").innerHTML = dojo.version;
				
			});
		</script>
	
	<body>
		<fieldset id="top"><div>
			<legend>Dojo API CheatSheet</legend>
				<ul id="nav">
					<li><a href="#top">Top</a></li>
				</ul>
				<div id="key">
					<fieldset>
						<legend>var</legend>
						<ul>
							<li>d = dojo,</li>
							<li>$ = d.query,</li>
							<li>dk = d.keys</li>
						</ul>
					</fieldset>
				</div>
			</div>
		</fieldset>
		<div id="container"></div>
		<span id="version"></span>
	</body>
</html>

<?php
	// this file is just a bouncer for ContentPane.html test
	error_reporting(E_ALL ^ E_NOTICE);
	
	if(isset($_GET['mode'])){
		switch($_GET['mode']){
			case 'htmlPaths':
				echo "<img src='../images/testImage.gif' id='imgTest'/>
					<div id='inlineStyleTest' style='width:188px;height:125px;background-image:url(../images/testImage.gif)'></div>
					<style>@import 'getResponse.php?mode=importCss';</style>
					<link type='text/css' rel='stylesheet' href='getResponse.php?mode=linkCss'>
					<div id='importCssTest'></div>
					<div id='linkCssTest'></div>
					<div id='importMediaTest'></div>
					<div id='linkMediaTest'></div>
					<!-- these may download but not render -->
					<style media='print'>@import 'getResponse.php?mode=importMediaPrint';</style>
					<link media='print' type='text/css' rel='stylesheet' href='getResponse.php?mode=linkMediaPrint'>
					";
				break;
	
			case 'importCss':
				header('Content-type: text/css; charset=utf-8');
				echo "#importMediaTest {
					margin: 4px;
					border: 1px dashed red;
					width: 200px;
					height: 200px;
				}
				#importCssTest {
						margin: 4px;
						border: 1px solid blue;
						width: 100px;
						height: 100px;
					}";
				break;
	
			case 'linkCss':
				header('Content-type: text/css; charset=utf-8');
				echo "#linkMediaTest {
					margin: 4px;
					border: 2px dashed red;
					width: 200px;
					height: 200px;
				}
				#linkCssTest {
					margin: 4px;
					border: 2px dashed red;
					width: 100px;
					height: 100px;
				}";
				break;

			case 'importMediaPrint': // may download but not render
				header('Content-type: text/css; charset=utf-8');
				echo "#importMediaTest {
					margin: 10px;
					border: 5px dashed gray;
					width: 100px;
					height: 100px;
				}";
				break;

			case 'linkMediaPrint': // may download but not render
				header('Content-type: text/css; charset=utf-8');
				echo "#linkMediaTest {
					margin: 10px;
					border: 5px dashed gray;
					width: 100px;
					height: 100px;
				}";
				break;
	
			case 'remoteJsTrue':
				header('Content-type: text/javascript; charset=utf-8');
				echo "unTypedVarInDocScope = true;";
				break;
	
			case 'remoteJsFalse':
				header('Content-type: text/javascript; charset=utf-8');
				echo "unTypedVarInDocScope = false;";
				break;
			case 'entityChars':
				header('Content-type: text/css; charset=utf-8');
				if($_GET['entityEscaped'] == null){                                                                                    
					print("var div = document.createElement(\"div\"); document.body.appendChild(div); div.innerHTML = \"<div id=\\\"should_not_be_here2\\\"></div>\"; window.__remotePaneLoaded2 = true;" );
				}else{
					print("window.__remotePaneLoaded2 = true;");
				}
				break;
			default:
				echo "unknown mode: ".htmlentities($_GET['mode']);
		}
	}
?>

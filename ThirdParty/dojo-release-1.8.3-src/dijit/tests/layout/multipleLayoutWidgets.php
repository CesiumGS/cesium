<?php
	// If you call this file like multipleLayoutWidgets.php?id=foo then the id's of the created widgets
	// will be based on the string "foo"
	$id = htmlspecialchars($_GET['id']);
?>
This file has some nested layout widgets, and when this file is loaded the TabContainer and
BorderContainer below should get resize() called on them
<div data-dojo-type="dijit/layout/TabContainer" id="<?php echo $id ?>TabContainer" data-dojo-props='style:"width: 300px; height: 300px;"'>
	<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props='title:"Tab 1"'>doc4 tab1</div>
	<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props='title:"Tab 2"'>doc4 tab2</div>
</div>
<div data-dojo-type="dijit/layout/BorderContainer" id="<?php echo $id ?>BorderContainer" data-dojo-props='style:"width: 300px; height: 300px;"'>
	<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props='region:"center"'>inner border container</div>
</div>

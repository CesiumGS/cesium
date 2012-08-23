/*!
 * Copyright 2011-2012, Analytical Graphics, Inc.
 */
(function() {
    "use strict";
    /*global Cesium,Sandbox,dojo,dijit,js_beautify,initializeOverlayCreator*/

    Sandbox.beautify = function(code) {
        var beautifiedCode = js_beautify(code);

        // Remove first and last lines, i.e., the function declaration
        var lines = beautifiedCode.split('\n');
        lines.splice(0, 1);
        lines.splice(lines.length - 1, 1);

        // Remove the first tabs, assuming four spaces
        for ( var i = 0; i < lines.length; ++i) {
            lines[i] = lines[i].substr(4);
        }

        // Remove "use strict", which is in FF, not Chrome
        var formattedCode = lines.join('\n').replace(/"use strict";\n\s*/, '');

        // Firefox workaround: Function.toString strips empty parenthesis from default constructors.
        // Add the removed parentheses to the first instance, assuming a semicolon follows.
        var defaultConstructedTypes = ['Image'];
        for (i = 0; i < defaultConstructedTypes.length; i++) {
            var regex = new RegExp(defaultConstructedTypes[i] + ';', 'g');
            formattedCode = formattedCode.replace(regex, defaultConstructedTypes[i] + '();');
        }

        return formattedCode;
    };

    // Set up the Ace editor
    var editor = new Sandbox.Editor('editor');
    var sampleMessage = '// Select one of the examples from the tree.  The corresponding code will be\n// shown in this editor, which you can modify and run.\n';
    var compileTimer;
    editor.display(sampleMessage);
    editor.linkToDoc();

    Cesium.Sandbox.getCodeEditor = function() {
        return editor;
    };

    // Create Sandbox
    var sb = new Cesium.Sandbox();
    var scene = sb.getScene();
    var primitives = scene.getPrimitives();
    var ellipsoid = sb.getEllipsoid();
    var cb = primitives.getCentralBody();

    // Build and publish codesnippet treeview
    var divNum = 0;
    var treeContainer = document.getElementById('tree');
    var treeDiv = document.createElement('div');
    treeDiv.id = 'tree' + divNum.toString();
    treeContainer.appendChild(treeDiv);
    var tree = new Sandbox.Tree(treeDiv.id);

    var pl = tree.addNode('Polyline', '', null, 'Polyline');
    tree.addNode('Draw a line between two points', [new Sandbox.PolylineTwoPoints(scene, ellipsoid, primitives)], pl, 'Polyline');
    tree.addNode('Draw a line between several points', [new Sandbox.PolylineSeveralPoints(scene, ellipsoid, primitives)], pl, 'Polyline');
    tree.addNode("Draw two lines between several points", [new Sandbox.MultiplePolylineSeveralPoints(scene, ellipsoid, primitives)], pl, "Polyline");
    tree.addNode('Set the interior and outline color', [new Sandbox.PolylineColor(scene, ellipsoid, primitives)], pl, 'Polyline');
    tree.addNode('Set the interior and outline translucency', [new Sandbox.PolylineTranslucency(scene, ellipsoid, primitives)], pl, 'Polyline');
    tree.addNode('Set the interior and outline width', [new Sandbox.PolylineWidth(scene, ellipsoid, primitives)], pl, 'Polyline');
    tree.addNode('Draw a line in a local reference frame', [new Sandbox.PolylineReferenceFrame(scene, ellipsoid, primitives)], pl, 'Polyline');

    var pg = tree.addNode('Polygon', '', null, 'Polygon');
    tree.addNode('Draw a polygon', [new Sandbox.Polygon(scene, ellipsoid, primitives)], pg, 'Polygon');
    tree.addNode('Draw a polygon using an extent', [new Sandbox.PolygonWithExtent(scene, ellipsoid, primitives)], pg, 'Polygon');
    tree.addNode('Draw nested polygons', [new Sandbox.NestedPolygon(scene, ellipsoid, primitives)], pg, 'Polygon');
    var mat = tree.addNode('Materials', '', pg, 'Material');
    tree.addNode('Modify the default material', [new Sandbox.PolygonColor(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a composite material', [new Sandbox.CompositeMaterial1(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a composite material', [new Sandbox.CompositeMaterial2(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a composite material', [new Sandbox.CompositeMaterial3(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply an image material', [new Sandbox.ImagePolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a diffuse map material', [new Sandbox.DiffuseMapPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply an alpha map material', [new Sandbox.AlphaMapPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a specular map material', [new Sandbox.SpecularMapPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply an emission map material', [new Sandbox.EmissionMapPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a bump map material', [new Sandbox.BumpMapPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a normal map material', [new Sandbox.NormalMapPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a reflection material', [new Sandbox.ReflectionPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a refraction material', [new Sandbox.RefractionPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a fresnel material', [new Sandbox.FresnelPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a brick material', [new Sandbox.BrickPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a wood material', [new Sandbox.WoodPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply an asphalt material', [new Sandbox.AsphaltPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a cement material', [new Sandbox.CementPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a grass material', [new Sandbox.GrassPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a stripe material', [new Sandbox.StripePolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a checkerboard material', [new Sandbox.CheckerboardPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a dot material', [new Sandbox.DotPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a tie-dye material', [new Sandbox.TieDyePolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a facet material', [new Sandbox.FacetPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    tree.addNode('Apply a blob material', [new Sandbox.BlobPolygonMaterial(scene, ellipsoid, primitives)], mat, 'Material');
    var animate = tree.addNode('Animations', '', pg, 'Animation');
    tree.addNode('Use an erosion animation', [new Sandbox.ErosionPolygonAnimation(scene, ellipsoid, primitives)], animate, 'Animation');
    tree.addNode('Use an alpha animation', [new Sandbox.AlphaPolygonAnimation(scene, ellipsoid, primitives)], animate, 'Animation');
    tree.addNode('Use a height animation', [new Sandbox.HeightPolygonAnimation(scene, ellipsoid, primitives)], animate, 'Animation');

    var cir = tree.addNode('Circle', '', null, 'Circle');
    tree.addNode('Outline a circle', [new Sandbox.OutlineCircle(scene, ellipsoid, primitives)], cir, 'Circle');
    tree.addNode('Fill a circle', [new Sandbox.FilledCircle(scene, ellipsoid, primitives)], cir, 'Circle');
    tree.addNode('Fill an ellipse', [new Sandbox.FilledEllipse(scene, ellipsoid, primitives)], cir, 'Circle');
    tree.addNode('Apply a material to a filled circle', [new Sandbox.FilledCircleMaterial(scene, ellipsoid, primitives)], cir, 'Circle');

    var bb = tree.addNode('Billboard', '', null, 'Billboard');
    tree.addNode('Draw a billboard', [new Sandbox.Billboard(scene, ellipsoid, primitives)], bb, 'Billboard');
    tree.addNode('Draw several billboards', [new Sandbox.SeveralBillboards(scene, ellipsoid, primitives)], bb, 'Billboard');
    tree.addNode('Draw points using billboards', [new Sandbox.PointBillboards(scene, ellipsoid, primitives)], bb, 'Billboard');
    tree.addNode('Draw markers using billboards', [new Sandbox.MarkerBillboards(scene, ellipsoid, primitives)], bb, 'Billboard');
    tree.addNode('Set billboard properties at creation', [new Sandbox.BillboardPropertiesCreation(scene, ellipsoid, primitives)], bb, 'Billboard');
    tree.addNode('Set billboard properties after creation', [new Sandbox.BillboardProperties(scene, ellipsoid, primitives)], bb, 'Billboard');
    tree.addNode('Draw billboards in a local reference frame', [new Sandbox.BillboardReferenceFrame(scene, ellipsoid, primitives)], bb, 'Billboard');

    var lbl = tree.addNode('Label', '', null, 'Label');
    tree.addNode('Draw a label', [new Sandbox.Label(scene, ellipsoid, primitives)], lbl, 'Label');
    tree.addNode('Draw several labels', [new Sandbox.Labels(scene, ellipsoid, primitives)], lbl, 'Label');
    tree.addNode('Set label font and style at creation', [new Sandbox.LabelFont(scene, ellipsoid, primitives)], lbl, 'Label');
    tree.addNode('Set label properties after creation', [new Sandbox.LabelProperties(scene, ellipsoid, primitives)], lbl, 'Label');
    tree.addNode('Draw labels in a local reference frame', [new Sandbox.LabelReferenceFrame(scene, ellipsoid, primitives)], lbl, 'Label');

    var sens = tree.addNode('Sensor', '', null, 'Sensor');

    var rs = tree.addNode('Rectangular Sensors', '', sens, 'Sensor');
    tree.addNode('Draw a rectangular sensor', [new Sandbox.RectangularPyramidSensorVolume(scene, ellipsoid, primitives)], rs, 'Sensor');

    var customSensors = tree.addNode('Custom Sensors', '', sens, 'Sensor');
    tree.addNode('Draw a custom sensor', [new Sandbox.CustomSensorVolume(scene, ellipsoid, primitives)], customSensors, 'Sensor');

    var cs = tree.addNode('Conic Sensors', '', sens, 'Sensor');
    tree.addNode('Draw a conic sensor', [new Sandbox.ConicSensorVolume(scene, ellipsoid, primitives)], cs, 'Sensor');
    tree.addNode('Draw a conic sensor with clock angles', [new Sandbox.ConicSensorVolumeClockAngles(scene, ellipsoid, primitives)], cs, 'Sensor');
    var mt = tree.addNode('Materials', '', sens, 'Material');
    tree.addNode('Modify the default material', [new Sandbox.SensorMaterial(scene, ellipsoid, primitives)], mt, 'Material');
    tree.addNode('Apply a stripe material', [new Sandbox.StripeSensorMaterial(scene, ellipsoid, primitives)], mt, 'Material');
    tree.addNode('Apply a distance interval material', [new Sandbox.DistanceIntervalSensorMaterial(scene, ellipsoid, primitives)], mt, 'Material');
    tree.addNode('Apply a checkerboard material', [new Sandbox.CheckerboardSensorMaterial(scene, ellipsoid, primitives)], mt, 'Material');
    tree.addNode('Apply a dot material', [new Sandbox.DotSensorMaterial(scene, ellipsoid, primitives)], mt, 'Material');
    tree.addNode('Apply a tie-dye material', [new Sandbox.TieDyeSensorMaterial(scene, ellipsoid, primitives)], mt, 'Material');
    tree.addNode('Apply a facet material', [new Sandbox.FacetSensorMaterial(scene, ellipsoid, primitives)], mt, 'Material');
    tree.addNode('Apply a blob material', [new Sandbox.BlobSensorMaterial(scene, ellipsoid, primitives)], mt, 'Material');
    tree.addNode('Apply multiple materials to a conic sensor', [new Sandbox.SensorMaterialPerSurface(scene, ellipsoid, primitives)], mt, 'Material');
    var anim = tree.addNode('Animation', '', sens, 'Animation');
    tree.addNode('Use an erosion animation', [new Sandbox.ErosionSensorAnimation(scene, ellipsoid, primitives)], anim, 'Animation');
    tree.addNode('Use an alpha animation', [new Sandbox.AlphaSensorAnimation(scene, ellipsoid, primitives)], anim, 'Animation');
    tree.addNode('Animate stripes', [new Sandbox.AnimateSensorStripes(scene, ellipsoid, primitives)], anim, 'Animation');

    var comp = tree.addNode('Composite', '', null, 'Composite');
    tree.addNode('Layer primitives on top of each other', [new Sandbox.CompositeLayering(scene, ellipsoid, primitives)], comp, 'Composite');

    var cam = tree.addNode('Camera', '', null, 'Camera');
    tree.addNode('Fly to Los Angeles', [new Sandbox.CameraFlyToLosAngeles(scene, ellipsoid, primitives)], cam, 'Camera');
    tree.addNode('Set the camera reference frame', [new Sandbox.CameraReferenceFrame(scene, ellipsoid, primitives)], cam, 'Camera');
    tree.addNode('View an extent', [new Sandbox.ViewExtent(scene, ellipsoid, primitives)], cam, 'Camera');

    var pick = tree.addNode('Picking', '', null, 'Picking');
    tree.addNode('Show cartographic position on mouse-over', [new Sandbox.PickingCartographicMouseOver(scene, ellipsoid, primitives)], pick, 'Picking');
    tree.addNode('Highlight a billboard on mouse-over', [new Sandbox.PickingBillboardMouseOver(scene, ellipsoid, primitives)], pick, 'Picking');
    tree.addNode('Highlight a polyline on mouse-over', [new Sandbox.PickingPolylineMouseOver(scene, ellipsoid, primitives)], pick, 'Picking');
    var ani = tree.addNode('Animations', '', pick, 'Animation');
    tree.addNode('Animate highlighting a billboard on mouse-over', [new Sandbox.PickingBillboardAnimationMouseOver(scene, ellipsoid, primitives)], ani, 'Animation');
    tree.addNode('Animate highlighting a polygon on mouse-over', [new Sandbox.PickingPolygonAnimationMouseOver(scene, ellipsoid, primitives)], ani, 'Animation');
    tree.addNode('Erode a sensor on double-click', [new Sandbox.PickingErodeSensorDoubleClick(scene, ellipsoid, primitives)], ani, 'Animation');

    var cenbod = tree.addNode('Central Body', '', null, 'Central Body');
    tree.addNode('Toggle clouds', [new Sandbox.CentralBodyShowClouds(cb), new Sandbox.CentralBodyHideClouds(cb)], cenbod, 'CentralBody');
    tree.addNode('Toggle cloud shadows', [new Sandbox.CentralBodyShowCloudShadows(cb), new Sandbox.CentralBodyHideCloudShadows(cb)], cenbod, 'CentralBody');
    tree.addNode('Toggle bumps', [new Sandbox.CentralBodyShowBumps(cb), new Sandbox.CentralBodyHideBumps(cb)], cenbod, 'CentralBody');
    tree.addNode('Toggle specular', [new Sandbox.CentralBodyShowSpecular(cb), new Sandbox.CentralBodyHideSpecular(cb)], cenbod, 'CentralBody');
    tree.addNode('Toggle sky atmosphere', [new Sandbox.CentralBodyShowSkyAtmosphere(cb), new Sandbox.CentralBodyHideSkyAtmosphere(cb)], cenbod, 'CentralBody');
    tree.addNode('Toggle ground atmosphere', [new Sandbox.CentralBodyShowGroundAtmosphere(cb), new Sandbox.CentralBodyHideGroundAtmosphere(cb)], cenbod, 'CentralBody');

    var imagery = tree.addNode('Imagery', '', null, 'Imagery');
    tree.addNode('Use Bing Maps imagery', [new Sandbox.BingMaps(scene, ellipsoid, primitives)], imagery, 'Imagery');
    tree.addNode('Use ArcGIS World Street Maps imagery', [new Sandbox.ArcGIS(scene, ellipsoid, primitives)], imagery, 'Imagery');
    tree.addNode('Use OpenStreetMaps imagery', [new Sandbox.OSM(scene, ellipsoid, primitives)], imagery, 'Imagery');
    tree.addNode('Use MapQuest OpenStreetMaps imagery', [new Sandbox.MQOSM(scene, ellipsoid, primitives)], imagery, 'Imagery');
    tree.addNode('Use MapQuest Aerial OpenStreetMaps imagery', [new Sandbox.MQAerialOSM(scene, ellipsoid, primitives)], imagery, 'Imagery');
    tree.addNode('Use Stamen maps', [new Sandbox.Stamen(scene, ellipsoid, primitives)], imagery, 'Imagery');

    tree.addNode('Use a single texture', [new Sandbox.Single(scene, ellipsoid, primitives)], imagery, 'Imagery');
    tree.addNode('Use a composite imagery', [new Sandbox.CompositeTiler(scene, ellipsoid, primitives)], imagery, 'Imagery');

    var adv = tree.addNode('Advanced', '', null, 'Advanced');
    tree.addNode('Draw a box using custom rendering', [new Sandbox.CustomRendering(scene, ellipsoid, primitives)], adv, 'Advanced');
    tree.addNode('Draw a box across all scene modes using custom rendering', [new Sandbox.CustomRenderingAcrossModes(scene, ellipsoid, primitives)], adv, 'Advanced');

    tree.publish();

    var currentCodeSnippet;

    // TODO:  This is temporary.
    Cesium.Sandbox.getCurrentCodeSnippet = function() {
        return currentCodeSnippet;
    };

    Sandbox.reset = function() {
        Sandbox.TextOverlay.removeAll();
        sb.clearScene();
    };

    function connectTreeToCodeSnippets(tree) {
        dojo.connect(tree.getTree(), 'onClick', function(item, node, evt) {

            if (currentCodeSnippet && currentCodeSnippet.clear) {
                currentCodeSnippet.clear();
            }

            currentCodeSnippet = tree.getStore().getValue(item, 'codeSnippet', 'null');

            if (currentCodeSnippet && currentCodeSnippet.code) {
                editor.display(Sandbox.beautify(currentCodeSnippet.code.toString().replace('(undefined);', '();')));

                scene.getCamera().lookAt(currentCodeSnippet.camera || {
                    eye : new Cesium.Cartesian3(2203128.2853925996, -7504680.128731707, 5615591.201449535),
                    target : Cesium.Cartesian3.ZERO,
                    up : new Cesium.Cartesian3(-0.1642824655609347, 0.5596076102188919, 0.8123118822806428)
                });
            } else {
                editor.display(sampleMessage);
            }
        });
    }

    connectTreeToCodeSnippets(tree);
    initializeOverlayCreator(sb);

    // Ignore syntax errors as the user types
    window.onerror = function() {
        return true;
    };

    function recompile() {
        /*jslint evil : true*/
        var func = new Function('scene', 'ellipsoid', 'primitives', 'cb', editor.getValue());

        Sandbox.reset();
        func.apply(currentCodeSnippet, [scene, ellipsoid, primitives, cb]);
        compileTimer = undefined;
    }

    editor.on('change', function(event) {
        if (currentCodeSnippet) {
            if (typeof compileTimer !== 'undefined') {
                window.clearTimeout(compileTimer);
            }
            compileTimer = window.setTimeout(recompile, 200);
        }
    });

    // Search
    var searchBox = document.getElementById('searchBox');
    searchBox.onkeyup = function() {
        treeContainer.removeChild(document.getElementById('tree' + (divNum).toString()));
        divNum++;
        var newTree = document.createElement('div');
        newTree.id = 'tree' + (divNum).toString();
        treeContainer.appendChild(newTree);
        var searchResultsTree = new Sandbox.Tree(newTree.id, tree.search(searchBox.value));
        searchResultsTree.publish();
        connectTreeToCodeSnippets(searchResultsTree);

        var fadeOut = dojo.fadeOut({
            node : 'tree',
            duration : 1
        });
        var fadeIn = dojo.fadeIn({
            node : 'tree',
            duration : 500
        });
        dojo.fx.chain([fadeOut, fadeIn]).play();
    };
    searchBox.onsubmit = searchBox.onkeyup;

    // Load Help Content
    var downloadFile = function(url) {
        var request = new XMLHttpRequest();
        request.open('GET', url, false);
        request.send(null);
        if (request.status !== 200) {
            throw new Cesium.RuntimeError('Could not download file:  ' + url + '.');
        }
        return request.responseText;
    };
    var helpFile = downloadFile('./help.html');
    var helpBox = document.getElementById('help');
    helpBox.innerHTML = helpFile;

    // Resize Editor
    function watchSplitters(borderContainer, region) {
        var moveConnects = {};
        var spl = borderContainer.getSplitter(region);

        dojo.connect(spl, '_startDrag', function() {
            moveConnects[spl.widgetId] = dojo.connect(spl.domNode, 'onmousemove', function(evt) {
                editor.resize();
            });
        });
        dojo.connect(spl, '_stopDrag', function(evt) {
            editor.resize();
            dojo.disconnect(moveConnects[spl.widgetId]);
            delete moveConnects[spl.widgetId];
        });
    }
    dojo.ready(function() {
        dojo.style(dojo.byId('sandboxExamples').parentNode, 'overflow', 'hidden');
        editor.resize();
        watchSplitters(dijit.byId('appLayout'), 'left');
        watchSplitters(dijit.byId('inner'), 'bottom');
        var editorContainer = dijit.byId('editorContainer');
        dojo.connect(editorContainer, 'onMouseEnter', function(evt) {
            editor.resize();
        });
        dojo.connect(editorContainer, 'onFocus', function(evt) {
            editor.resize();
        });
    });

}());

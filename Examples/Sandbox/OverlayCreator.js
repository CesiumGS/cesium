function initializeOverlayCreator(sb) {
    "use strict";
    /*global Sandbox,dojo,dijit,display*/

    dojo.addOnLoad(function() {
        var userOverlays = [];

        // Create Position Drop Down Menu
        var position = {
            'top' : '10px',
            'right' : '10px'
        };
        var positionMenu = new dijit.Menu({
            style : 'display: none;'
        });
        var topLeft = new dijit.MenuItem({
            label : 'Top Left',
            onClick : function() {
                position = {
                    'top' : '10px',
                    'left' : '10px'
                };
            }
        });
        var topCenter = new dijit.MenuItem({
            label : 'Top Center',
            onClick : function() {
                position = {
                    'top' : '10px',
                    'left' : '45%'
                };
            }
        });
        var topRight = new dijit.MenuItem({
            label : 'Top Right',
            onClick : function() {
                position = {
                    'top' : '10px',
                    'right' : '10px'
                };
            }
        });
        var rightCenter = new dijit.MenuItem({
            label : 'Right Center',
            onClick : function() {
                position = {
                    'top' : '40%',
                    'right' : '10px'
                };
            }
        });
        var bottomRight = new dijit.MenuItem({
            label : 'Bottom Right',
            onClick : function() {
                position = {
                    'bottom' : '40px',
                    'right' : '10px'
                };
            }
        });
        var bottomCenter = new dijit.MenuItem({
            label : 'Bottom Center',
            onClick : function() {
                position = {
                    'bottom' : '40px',
                    'left' : '40%'
                };
            }
        });
        var bottomLeft = new dijit.MenuItem({
            label : 'Bottom Left',
            onClick : function() {
                position = {
                    'bottom' : '40px',
                    'left' : '10px'
                };
            }
        });
        var leftCenter = new dijit.MenuItem({
            label : 'Left Center',
            onClick : function() {
                position = {
                    'top' : '40%',
                    'left' : '10px'
                };
            }
        });

        positionMenu.addChild(topLeft);
        positionMenu.addChild(topCenter);
        positionMenu.addChild(topRight);
        positionMenu.addChild(rightCenter);
        positionMenu.addChild(bottomRight);
        positionMenu.addChild(bottomCenter);
        positionMenu.addChild(bottomLeft);
        positionMenu.addChild(leftCenter);

        var positionSelect = new dijit.form.DropDownButton({
            label : 'Select Position',
            style : 'right: 18%; top: 90%; position: absolute;',
            dropDown : positionMenu
        });
        dojo.byId('positionSelect').appendChild(positionSelect.domNode);

        var overlayEditor = new Sandbox.Editor('overlayEditor');
        dojo.connect(dijit.byId('overlayEditorContainer'), 'onmouseover', function(evt) {
            overlayEditor.resize();
        });
        overlayEditor.display('// Use the function display() to print formatted or evaluated output.');

        var overlayId = new dijit.form.TextBox({
            style : 'width: 31%; left: 31%; top: 91%; position: absolute;',
            placeHolder : 'Enter a unique ID'
        }, 'overlayId');

        var removeOverlaysMenu = new dijit.Menu({
            style : 'width: 100%; border-color: #FFFFFF;'
        });
        removeOverlaysMenu.startup();
        dojo.byId('removeOverlaysMenu').appendChild(removeOverlaysMenu.domNode);

        // Create overlays menu and add examples
        var overlayMenu = new dijit.Menu({
            style : 'width: 100%; border-color: #FFFFFF'
        });
        overlayMenu.startup();
        dojo.byId('overlayMenu').appendChild(overlayMenu.domNode);

        //Add Preset Overlay Examples
        function getCamera() {
            var camera = sb.getScene().getCamera();
            display('Position: ' + camera.position + '\n' + 'Direction: ' + camera.direction + '\n' + 'Up: ' + camera.up);
        }

        function numPrimitives() {
            display('Number of Primitives: ' + (sb.getScene().getPrimitives().getLength() - 1)); // Do not include atmosphere
        }
        userOverlays.push(new Sandbox.Overlay('Camera Coordinates', Sandbox.beautify(getCamera.toString()), sb));
        userOverlays.push(new Sandbox.Overlay('Number of Primtiives', Sandbox.beautify(numPrimitives.toString()), sb));

        var displayOverlayInfo = function() {
            overlayEditor.display(this.overlay.getContent());
            overlayId.set('value', this.label);
        };

        for ( var overlay = 0; overlay < userOverlays.length; overlay++) {
            var menuItem = new dijit.MenuItem({
                label : userOverlays[overlay].getId(),
                overlay : userOverlays[overlay],
                onClick : displayOverlayInfo
            });
            overlayMenu.addChild(menuItem);
        }

        for ( var i = 0; i < userOverlays.length; i++) {
            userOverlays[i].getDiv().style.visibility = 'hidden';
        }

        // Create the overlay and update the dialog menus
        /*jslint nonew : false*/
        new dijit.form.Button({
            label : 'Submit Overlay',
            style : 'right: 10px; top: 90%; position: absolute;',
            onClick : function() {

                var content = overlayEditor.getValue();
                var id = overlayId.get('value');
                if (!id.length) {
                    id = content;
                }
                var overlay = new Sandbox.Overlay(id, content, sb);
                overlay.getDiv().style.visibility = 'visible';
                overlay.setPosition(position);
                dijit.byId('overlayDialog').hide();

                var numUserOverlays = userOverlays.length;
                var found = false;
                for ( var i = 0; i < numUserOverlays; i++) {
                    if (userOverlays[i].getId() === id) {
                        found = true;
                        userOverlays[i].update(content);
                        break;
                    }
                }
                if (!found) {
                    userOverlays.push(overlay);
                    overlayMenu.addChild(new dijit.MenuItem({
                        label : id,
                        overlay : overlay,
                        onClick : function() {
                            overlayEditor.display(overlay.getContent());
                            overlayId.set('value', id);
                        }
                    }));
                }
                overlayEditor.display('');
                overlayId.set('value', '');

                found = false;
                var removeMenuItems = removeOverlaysMenu.getChildren();
                var numMenuItems = removeMenuItems.length;
                for (i = 0; i < numMenuItems; i++) {
                    if (removeMenuItems[i].overlay.getId() === id) {
                        found = true;
                    }
                }
                if (!found) {
                    removeOverlaysMenu.addChild(new dijit.CheckedMenuItem({
                        label : id,
                        overlay : overlay
                    }));
                }
            }
        }, 'createOverlayButton');

        // Remove Overlay Dialog Features
        new dijit.form.Button({
            label : 'Select All',
            style : 'padding-left: 35px;',
            onClick : function() {
                var removeMenuItems = removeOverlaysMenu.getChildren();
                var numMenuItems = removeMenuItems.length;
                for ( var i = 0; i < numMenuItems; i++) {
                    if (!removeMenuItems[i].get('checked')) {
                        removeMenuItems[i].set('checked', true);
                    }
                }
            }
        }, 'selectAll');

        new dijit.form.Button({
            label : 'Remove Overlay(s)',
            onClick : function() {
                var removeMenuItems = removeOverlaysMenu.getChildren();
                var numMenuItems = removeMenuItems.length;
                for ( var i = 0; i < numMenuItems; i++) {
                    if (removeMenuItems[i].get('checked')) {
                        removeMenuItems[i].overlay.remove();
                        removeMenuItems[i].destroyRecursive();
                    }
                }
            }
        }, 'removeOverlayButton');
    });
}
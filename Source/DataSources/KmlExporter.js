define([
    '../Core/defined'
], function(
    defined) {
        'use strict';
        /**
         * @alias KmlExporter
         * @constructor
         *
         * @param {EntityCollection} entities The EntityCollection to export as KML
         * @param {Function} externalFileCallback A callback that will be called with the URL of external files
         */
        function KmlExporter(entities, externalFileCallback) {
            var kmlDoc = this._kmlDoc = document.implementation.createDocument(null, 'kml');
            var kmlElement = kmlDoc.documentElement;
            var kmlDocumentElement = kmlDoc.createElement('Document');
            kmlElement.appendChild(kmlDocumentElement);

            var rootEntities = entities.values.filter(function(entity) {
                return !defined(entity.parent);
            });
            recurseEntities(kmlDoc, kmlDocumentElement, rootEntities);
        }

        KmlExporter.prototype.toString = function() {
            var serializer = new XMLSerializer();
            return serializer.serializeToString(this._kmlDoc);
        };

        function recurseEntities(kmlDoc, parentNode, entities) {
            var count = entities.length;
            var placemark;
            var geometry;
            for (var i = 0; i < count; ++i) {
                var entity = entities[i];
                placemark = undefined;
                geometry = undefined;

                // TODO: Handle multiple geometries
                if (defined(entity.point) || defined(entity.billboard)) {
                    placemark = kmlDoc.createElement('Placemark');
                    geometry = kmlDoc.createElement('Point');
                } else if (defined(entity.polygon)) {
                    placemark = kmlDoc.createElement('Placemark');
                    geometry = kmlDoc.createElement('Polygon');
                } else if (defined(entity.polyline)) {
                    placemark = kmlDoc.createElement('Placemark');
                    geometry = kmlDoc.createElement('LineString');
                } else if (defined(entity.rectangle)) {
                    placemark = kmlDoc.createElement('Placemark');
                    geometry = kmlDoc.createElement('Polygon');
                }

                if (defined(placemark)) {
                    placemark.appendChild(geometry);
                    parentNode.appendChild(placemark);

                    placemark.setAttribute('id', entity.id);
                    placemark.setAttribute('name', entity.name);
                }

                var children = entity._children;
                if (children.length > 0) {
                    var folderNode = kmlDoc.createElement('Folder');
                    parentNode.appendChild(folderNode);
                    recurseEntities(kmlDoc, folderNode, children);
                }
            }
        }

        return KmlExporter;
    });

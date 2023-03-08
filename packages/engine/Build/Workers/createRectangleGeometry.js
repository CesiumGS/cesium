define(['./defaultValue-0a909f67', './Matrix3-315394f6', './Matrix2-13178034', './Transforms-26539bce', './Check-666ab1a0', './ComponentDatatype-f7b11d02', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryInstance-451dc1cd', './GeometryOffsetAttribute-04332ce7', './GeometryPipeline-0166905d', './IndexDatatype-a55ceaa1', './Math-2dbd6b93', './PolygonPipeline-f59a8f0a', './RectangleGeometryLibrary-0768db63', './VertexFormat-6b480673', './RuntimeError-06c93819', './combine-ca22a614', './WebGLConstants-a8cc3e8c', './AttributeCompression-b646d393', './EncodedCartesian3-81f70735', './IntersectionTests-a93d3de9', './Plane-900aa728', './EllipsoidRhumbLine-19756602'], (function (defaultValue, Matrix3, Matrix2, Transforms, Check, ComponentDatatype, GeometryAttribute, GeometryAttributes, GeometryInstance, GeometryOffsetAttribute, GeometryPipeline, IndexDatatype, Math$1, PolygonPipeline, RectangleGeometryLibrary, VertexFormat, RuntimeError, combine, WebGLConstants, AttributeCompression, EncodedCartesian3, IntersectionTests, Plane, EllipsoidRhumbLine) { 'use strict';

  const positionScratch = new Matrix3.Cartesian3();
  const normalScratch = new Matrix3.Cartesian3();
  const tangentScratch = new Matrix3.Cartesian3();
  const bitangentScratch = new Matrix3.Cartesian3();
  const rectangleScratch = new Matrix2.Rectangle();
  const stScratch = new Matrix2.Cartesian2();
  const bottomBoundingSphere = new Transforms.BoundingSphere();
  const topBoundingSphere = new Transforms.BoundingSphere();

  function createAttributes(vertexFormat, attributes) {
    const geo = new GeometryAttribute.Geometry({
      attributes: new GeometryAttributes.GeometryAttributes(),
      primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
    });

    geo.attributes.position = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: attributes.positions,
    });
    if (vertexFormat.normal) {
      geo.attributes.normal = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: attributes.normals,
      });
    }
    if (vertexFormat.tangent) {
      geo.attributes.tangent = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: attributes.tangents,
      });
    }
    if (vertexFormat.bitangent) {
      geo.attributes.bitangent = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: attributes.bitangents,
      });
    }
    return geo;
  }

  function calculateAttributes(
    positions,
    vertexFormat,
    ellipsoid,
    tangentRotationMatrix
  ) {
    const length = positions.length;

    const normals = vertexFormat.normal ? new Float32Array(length) : undefined;
    const tangents = vertexFormat.tangent ? new Float32Array(length) : undefined;
    const bitangents = vertexFormat.bitangent
      ? new Float32Array(length)
      : undefined;

    let attrIndex = 0;
    const bitangent = bitangentScratch;
    const tangent = tangentScratch;
    let normal = normalScratch;
    if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
      for (let i = 0; i < length; i += 3) {
        const p = Matrix3.Cartesian3.fromArray(positions, i, positionScratch);
        const attrIndex1 = attrIndex + 1;
        const attrIndex2 = attrIndex + 2;

        normal = ellipsoid.geodeticSurfaceNormal(p, normal);
        if (vertexFormat.tangent || vertexFormat.bitangent) {
          Matrix3.Cartesian3.cross(Matrix3.Cartesian3.UNIT_Z, normal, tangent);
          Matrix3.Matrix3.multiplyByVector(tangentRotationMatrix, tangent, tangent);
          Matrix3.Cartesian3.normalize(tangent, tangent);

          if (vertexFormat.bitangent) {
            Matrix3.Cartesian3.normalize(
              Matrix3.Cartesian3.cross(normal, tangent, bitangent),
              bitangent
            );
          }
        }

        if (vertexFormat.normal) {
          normals[attrIndex] = normal.x;
          normals[attrIndex1] = normal.y;
          normals[attrIndex2] = normal.z;
        }
        if (vertexFormat.tangent) {
          tangents[attrIndex] = tangent.x;
          tangents[attrIndex1] = tangent.y;
          tangents[attrIndex2] = tangent.z;
        }
        if (vertexFormat.bitangent) {
          bitangents[attrIndex] = bitangent.x;
          bitangents[attrIndex1] = bitangent.y;
          bitangents[attrIndex2] = bitangent.z;
        }
        attrIndex += 3;
      }
    }
    return createAttributes(vertexFormat, {
      positions: positions,
      normals: normals,
      tangents: tangents,
      bitangents: bitangents,
    });
  }

  const v1Scratch = new Matrix3.Cartesian3();
  const v2Scratch = new Matrix3.Cartesian3();

  function calculateAttributesWall(positions, vertexFormat, ellipsoid) {
    const length = positions.length;

    const normals = vertexFormat.normal ? new Float32Array(length) : undefined;
    const tangents = vertexFormat.tangent ? new Float32Array(length) : undefined;
    const bitangents = vertexFormat.bitangent
      ? new Float32Array(length)
      : undefined;

    let normalIndex = 0;
    let tangentIndex = 0;
    let bitangentIndex = 0;
    let recomputeNormal = true;

    let bitangent = bitangentScratch;
    let tangent = tangentScratch;
    let normal = normalScratch;
    if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
      for (let i = 0; i < length; i += 6) {
        const p = Matrix3.Cartesian3.fromArray(positions, i, positionScratch);
        const p1 = Matrix3.Cartesian3.fromArray(positions, (i + 6) % length, v1Scratch);
        if (recomputeNormal) {
          const p2 = Matrix3.Cartesian3.fromArray(positions, (i + 3) % length, v2Scratch);
          Matrix3.Cartesian3.subtract(p1, p, p1);
          Matrix3.Cartesian3.subtract(p2, p, p2);
          normal = Matrix3.Cartesian3.normalize(Matrix3.Cartesian3.cross(p2, p1, normal), normal);
          recomputeNormal = false;
        }

        if (Matrix3.Cartesian3.equalsEpsilon(p1, p, Math$1.CesiumMath.EPSILON10)) {
          // if we've reached a corner
          recomputeNormal = true;
        }

        if (vertexFormat.tangent || vertexFormat.bitangent) {
          bitangent = ellipsoid.geodeticSurfaceNormal(p, bitangent);
          if (vertexFormat.tangent) {
            tangent = Matrix3.Cartesian3.normalize(
              Matrix3.Cartesian3.cross(bitangent, normal, tangent),
              tangent
            );
          }
        }

        if (vertexFormat.normal) {
          normals[normalIndex++] = normal.x;
          normals[normalIndex++] = normal.y;
          normals[normalIndex++] = normal.z;
          normals[normalIndex++] = normal.x;
          normals[normalIndex++] = normal.y;
          normals[normalIndex++] = normal.z;
        }

        if (vertexFormat.tangent) {
          tangents[tangentIndex++] = tangent.x;
          tangents[tangentIndex++] = tangent.y;
          tangents[tangentIndex++] = tangent.z;
          tangents[tangentIndex++] = tangent.x;
          tangents[tangentIndex++] = tangent.y;
          tangents[tangentIndex++] = tangent.z;
        }

        if (vertexFormat.bitangent) {
          bitangents[bitangentIndex++] = bitangent.x;
          bitangents[bitangentIndex++] = bitangent.y;
          bitangents[bitangentIndex++] = bitangent.z;
          bitangents[bitangentIndex++] = bitangent.x;
          bitangents[bitangentIndex++] = bitangent.y;
          bitangents[bitangentIndex++] = bitangent.z;
        }
      }
    }

    return createAttributes(vertexFormat, {
      positions: positions,
      normals: normals,
      tangents: tangents,
      bitangents: bitangents,
    });
  }

  function constructRectangle(rectangleGeometry, computedOptions) {
    const vertexFormat = rectangleGeometry._vertexFormat;
    const ellipsoid = rectangleGeometry._ellipsoid;
    const height = computedOptions.height;
    const width = computedOptions.width;
    const northCap = computedOptions.northCap;
    const southCap = computedOptions.southCap;

    let rowStart = 0;
    let rowEnd = height;
    let rowHeight = height;
    let size = 0;
    if (northCap) {
      rowStart = 1;
      rowHeight -= 1;
      size += 1;
    }
    if (southCap) {
      rowEnd -= 1;
      rowHeight -= 1;
      size += 1;
    }
    size += width * rowHeight;

    const positions = vertexFormat.position
      ? new Float64Array(size * 3)
      : undefined;
    const textureCoordinates = vertexFormat.st
      ? new Float32Array(size * 2)
      : undefined;

    let posIndex = 0;
    let stIndex = 0;

    const position = positionScratch;
    const st = stScratch;

    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = -Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;

    for (let row = rowStart; row < rowEnd; ++row) {
      for (let col = 0; col < width; ++col) {
        RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
          computedOptions,
          ellipsoid,
          vertexFormat.st,
          row,
          col,
          position,
          st
        );

        positions[posIndex++] = position.x;
        positions[posIndex++] = position.y;
        positions[posIndex++] = position.z;

        if (vertexFormat.st) {
          textureCoordinates[stIndex++] = st.x;
          textureCoordinates[stIndex++] = st.y;

          minX = Math.min(minX, st.x);
          minY = Math.min(minY, st.y);
          maxX = Math.max(maxX, st.x);
          maxY = Math.max(maxY, st.y);
        }
      }
    }
    if (northCap) {
      RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
        computedOptions,
        ellipsoid,
        vertexFormat.st,
        0,
        0,
        position,
        st
      );

      positions[posIndex++] = position.x;
      positions[posIndex++] = position.y;
      positions[posIndex++] = position.z;

      if (vertexFormat.st) {
        textureCoordinates[stIndex++] = st.x;
        textureCoordinates[stIndex++] = st.y;

        minX = st.x;
        minY = st.y;
        maxX = st.x;
        maxY = st.y;
      }
    }
    if (southCap) {
      RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
        computedOptions,
        ellipsoid,
        vertexFormat.st,
        height - 1,
        0,
        position,
        st
      );

      positions[posIndex++] = position.x;
      positions[posIndex++] = position.y;
      positions[posIndex] = position.z;

      if (vertexFormat.st) {
        textureCoordinates[stIndex++] = st.x;
        textureCoordinates[stIndex] = st.y;

        minX = Math.min(minX, st.x);
        minY = Math.min(minY, st.y);
        maxX = Math.max(maxX, st.x);
        maxY = Math.max(maxY, st.y);
      }
    }

    if (
      vertexFormat.st &&
      (minX < 0.0 || minY < 0.0 || maxX > 1.0 || maxY > 1.0)
    ) {
      for (let k = 0; k < textureCoordinates.length; k += 2) {
        textureCoordinates[k] = (textureCoordinates[k] - minX) / (maxX - minX);
        textureCoordinates[k + 1] =
          (textureCoordinates[k + 1] - minY) / (maxY - minY);
      }
    }

    const geo = calculateAttributes(
      positions,
      vertexFormat,
      ellipsoid,
      computedOptions.tangentRotationMatrix
    );

    let indicesSize = 6 * (width - 1) * (rowHeight - 1);
    if (northCap) {
      indicesSize += 3 * (width - 1);
    }
    if (southCap) {
      indicesSize += 3 * (width - 1);
    }
    const indices = IndexDatatype.IndexDatatype.createTypedArray(size, indicesSize);
    let index = 0;
    let indicesIndex = 0;
    let i;
    for (i = 0; i < rowHeight - 1; ++i) {
      for (let j = 0; j < width - 1; ++j) {
        const upperLeft = index;
        const lowerLeft = upperLeft + width;
        const lowerRight = lowerLeft + 1;
        const upperRight = upperLeft + 1;
        indices[indicesIndex++] = upperLeft;
        indices[indicesIndex++] = lowerLeft;
        indices[indicesIndex++] = upperRight;
        indices[indicesIndex++] = upperRight;
        indices[indicesIndex++] = lowerLeft;
        indices[indicesIndex++] = lowerRight;
        ++index;
      }
      ++index;
    }
    if (northCap || southCap) {
      let northIndex = size - 1;
      const southIndex = size - 1;
      if (northCap && southCap) {
        northIndex = size - 2;
      }

      let p1;
      let p2;
      index = 0;

      if (northCap) {
        for (i = 0; i < width - 1; i++) {
          p1 = index;
          p2 = p1 + 1;
          indices[indicesIndex++] = northIndex;
          indices[indicesIndex++] = p1;
          indices[indicesIndex++] = p2;
          ++index;
        }
      }
      if (southCap) {
        index = (rowHeight - 1) * width;
        for (i = 0; i < width - 1; i++) {
          p1 = index;
          p2 = p1 + 1;
          indices[indicesIndex++] = p1;
          indices[indicesIndex++] = southIndex;
          indices[indicesIndex++] = p2;
          ++index;
        }
      }
    }

    geo.indices = indices;
    if (vertexFormat.st) {
      geo.attributes.st = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: textureCoordinates,
      });
    }

    return geo;
  }

  function addWallPositions(
    wallPositions,
    posIndex,
    i,
    topPositions,
    bottomPositions
  ) {
    wallPositions[posIndex++] = topPositions[i];
    wallPositions[posIndex++] = topPositions[i + 1];
    wallPositions[posIndex++] = topPositions[i + 2];
    wallPositions[posIndex++] = bottomPositions[i];
    wallPositions[posIndex++] = bottomPositions[i + 1];
    wallPositions[posIndex] = bottomPositions[i + 2];
    return wallPositions;
  }

  function addWallTextureCoordinates(wallTextures, stIndex, i, st) {
    wallTextures[stIndex++] = st[i];
    wallTextures[stIndex++] = st[i + 1];
    wallTextures[stIndex++] = st[i];
    wallTextures[stIndex] = st[i + 1];
    return wallTextures;
  }

  const scratchVertexFormat = new VertexFormat.VertexFormat();

  function constructExtrudedRectangle(rectangleGeometry, computedOptions) {
    const shadowVolume = rectangleGeometry._shadowVolume;
    const offsetAttributeValue = rectangleGeometry._offsetAttribute;
    const vertexFormat = rectangleGeometry._vertexFormat;
    const minHeight = rectangleGeometry._extrudedHeight;
    const maxHeight = rectangleGeometry._surfaceHeight;
    const ellipsoid = rectangleGeometry._ellipsoid;

    const height = computedOptions.height;
    const width = computedOptions.width;

    let i;

    if (shadowVolume) {
      const newVertexFormat = VertexFormat.VertexFormat.clone(
        vertexFormat,
        scratchVertexFormat
      );
      newVertexFormat.normal = true;
      rectangleGeometry._vertexFormat = newVertexFormat;
    }

    const topBottomGeo = constructRectangle(rectangleGeometry, computedOptions);

    if (shadowVolume) {
      rectangleGeometry._vertexFormat = vertexFormat;
    }

    let topPositions = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
      topBottomGeo.attributes.position.values,
      maxHeight,
      ellipsoid,
      false
    );
    topPositions = new Float64Array(topPositions);
    let length = topPositions.length;
    const newLength = length * 2;
    const positions = new Float64Array(newLength);
    positions.set(topPositions);
    const bottomPositions = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
      topBottomGeo.attributes.position.values,
      minHeight,
      ellipsoid
    );
    positions.set(bottomPositions, length);
    topBottomGeo.attributes.position.values = positions;

    const normals = vertexFormat.normal ? new Float32Array(newLength) : undefined;
    const tangents = vertexFormat.tangent
      ? new Float32Array(newLength)
      : undefined;
    const bitangents = vertexFormat.bitangent
      ? new Float32Array(newLength)
      : undefined;
    const textures = vertexFormat.st
      ? new Float32Array((newLength / 3) * 2)
      : undefined;
    let topSt;
    let topNormals;
    if (vertexFormat.normal) {
      topNormals = topBottomGeo.attributes.normal.values;
      normals.set(topNormals);
      for (i = 0; i < length; i++) {
        topNormals[i] = -topNormals[i];
      }
      normals.set(topNormals, length);
      topBottomGeo.attributes.normal.values = normals;
    }
    if (shadowVolume) {
      topNormals = topBottomGeo.attributes.normal.values;
      if (!vertexFormat.normal) {
        topBottomGeo.attributes.normal = undefined;
      }
      const extrudeNormals = new Float32Array(newLength);
      for (i = 0; i < length; i++) {
        topNormals[i] = -topNormals[i];
      }
      extrudeNormals.set(topNormals, length); //only get normals for bottom layer that's going to be pushed down
      topBottomGeo.attributes.extrudeDirection = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: extrudeNormals,
      });
    }

    let offsetValue;
    const hasOffsets = defaultValue.defined(offsetAttributeValue);
    if (hasOffsets) {
      const size = (length / 3) * 2;
      let offsetAttribute = new Uint8Array(size);
      if (offsetAttributeValue === GeometryOffsetAttribute.GeometryOffsetAttribute.TOP) {
        offsetAttribute = offsetAttribute.fill(1, 0, size / 2);
      } else {
        offsetValue =
          offsetAttributeValue === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE ? 0 : 1;
        offsetAttribute = offsetAttribute.fill(offsetValue);
      }

      topBottomGeo.attributes.applyOffset = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: offsetAttribute,
      });
    }

    if (vertexFormat.tangent) {
      const topTangents = topBottomGeo.attributes.tangent.values;
      tangents.set(topTangents);
      for (i = 0; i < length; i++) {
        topTangents[i] = -topTangents[i];
      }
      tangents.set(topTangents, length);
      topBottomGeo.attributes.tangent.values = tangents;
    }
    if (vertexFormat.bitangent) {
      const topBitangents = topBottomGeo.attributes.bitangent.values;
      bitangents.set(topBitangents);
      bitangents.set(topBitangents, length);
      topBottomGeo.attributes.bitangent.values = bitangents;
    }
    if (vertexFormat.st) {
      topSt = topBottomGeo.attributes.st.values;
      textures.set(topSt);
      textures.set(topSt, (length / 3) * 2);
      topBottomGeo.attributes.st.values = textures;
    }

    const indices = topBottomGeo.indices;
    const indicesLength = indices.length;
    const posLength = length / 3;
    const newIndices = IndexDatatype.IndexDatatype.createTypedArray(
      newLength / 3,
      indicesLength * 2
    );
    newIndices.set(indices);
    for (i = 0; i < indicesLength; i += 3) {
      newIndices[i + indicesLength] = indices[i + 2] + posLength;
      newIndices[i + 1 + indicesLength] = indices[i + 1] + posLength;
      newIndices[i + 2 + indicesLength] = indices[i] + posLength;
    }
    topBottomGeo.indices = newIndices;

    const northCap = computedOptions.northCap;
    const southCap = computedOptions.southCap;

    let rowHeight = height;
    let widthMultiplier = 2;
    let perimeterPositions = 0;
    let corners = 4;
    let dupliateCorners = 4;
    if (northCap) {
      widthMultiplier -= 1;
      rowHeight -= 1;
      perimeterPositions += 1;
      corners -= 2;
      dupliateCorners -= 1;
    }
    if (southCap) {
      widthMultiplier -= 1;
      rowHeight -= 1;
      perimeterPositions += 1;
      corners -= 2;
      dupliateCorners -= 1;
    }
    perimeterPositions += widthMultiplier * width + 2 * rowHeight - corners;

    const wallCount = (perimeterPositions + dupliateCorners) * 2;

    let wallPositions = new Float64Array(wallCount * 3);
    const wallExtrudeNormals = shadowVolume
      ? new Float32Array(wallCount * 3)
      : undefined;
    let wallOffsetAttribute = hasOffsets ? new Uint8Array(wallCount) : undefined;
    let wallTextures = vertexFormat.st
      ? new Float32Array(wallCount * 2)
      : undefined;

    const computeTopOffsets =
      offsetAttributeValue === GeometryOffsetAttribute.GeometryOffsetAttribute.TOP;
    if (hasOffsets && !computeTopOffsets) {
      offsetValue = offsetAttributeValue === GeometryOffsetAttribute.GeometryOffsetAttribute.ALL ? 1 : 0;
      wallOffsetAttribute = wallOffsetAttribute.fill(offsetValue);
    }

    let posIndex = 0;
    let stIndex = 0;
    let extrudeNormalIndex = 0;
    let wallOffsetIndex = 0;
    const area = width * rowHeight;
    let threeI;
    for (i = 0; i < area; i += width) {
      threeI = i * 3;
      wallPositions = addWallPositions(
        wallPositions,
        posIndex,
        threeI,
        topPositions,
        bottomPositions
      );
      posIndex += 6;
      if (vertexFormat.st) {
        wallTextures = addWallTextureCoordinates(
          wallTextures,
          stIndex,
          i * 2,
          topSt
        );
        stIndex += 4;
      }
      if (shadowVolume) {
        extrudeNormalIndex += 3;
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
      }
      if (computeTopOffsets) {
        wallOffsetAttribute[wallOffsetIndex++] = 1;
        wallOffsetIndex += 1;
      }
    }

    if (!southCap) {
      for (i = area - width; i < area; i++) {
        threeI = i * 3;
        wallPositions = addWallPositions(
          wallPositions,
          posIndex,
          threeI,
          topPositions,
          bottomPositions
        );
        posIndex += 6;
        if (vertexFormat.st) {
          wallTextures = addWallTextureCoordinates(
            wallTextures,
            stIndex,
            i * 2,
            topSt
          );
          stIndex += 4;
        }
        if (shadowVolume) {
          extrudeNormalIndex += 3;
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
        }
        if (computeTopOffsets) {
          wallOffsetAttribute[wallOffsetIndex++] = 1;
          wallOffsetIndex += 1;
        }
      }
    } else {
      const southIndex = northCap ? area + 1 : area;
      threeI = southIndex * 3;

      for (i = 0; i < 2; i++) {
        // duplicate corner points
        wallPositions = addWallPositions(
          wallPositions,
          posIndex,
          threeI,
          topPositions,
          bottomPositions
        );
        posIndex += 6;
        if (vertexFormat.st) {
          wallTextures = addWallTextureCoordinates(
            wallTextures,
            stIndex,
            southIndex * 2,
            topSt
          );
          stIndex += 4;
        }
        if (shadowVolume) {
          extrudeNormalIndex += 3;
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
        }
        if (computeTopOffsets) {
          wallOffsetAttribute[wallOffsetIndex++] = 1;
          wallOffsetIndex += 1;
        }
      }
    }

    for (i = area - 1; i > 0; i -= width) {
      threeI = i * 3;
      wallPositions = addWallPositions(
        wallPositions,
        posIndex,
        threeI,
        topPositions,
        bottomPositions
      );
      posIndex += 6;
      if (vertexFormat.st) {
        wallTextures = addWallTextureCoordinates(
          wallTextures,
          stIndex,
          i * 2,
          topSt
        );
        stIndex += 4;
      }
      if (shadowVolume) {
        extrudeNormalIndex += 3;
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
      }
      if (computeTopOffsets) {
        wallOffsetAttribute[wallOffsetIndex++] = 1;
        wallOffsetIndex += 1;
      }
    }

    if (!northCap) {
      for (i = width - 1; i >= 0; i--) {
        threeI = i * 3;
        wallPositions = addWallPositions(
          wallPositions,
          posIndex,
          threeI,
          topPositions,
          bottomPositions
        );
        posIndex += 6;
        if (vertexFormat.st) {
          wallTextures = addWallTextureCoordinates(
            wallTextures,
            stIndex,
            i * 2,
            topSt
          );
          stIndex += 4;
        }
        if (shadowVolume) {
          extrudeNormalIndex += 3;
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
        }
        if (computeTopOffsets) {
          wallOffsetAttribute[wallOffsetIndex++] = 1;
          wallOffsetIndex += 1;
        }
      }
    } else {
      const northIndex = area;
      threeI = northIndex * 3;

      for (i = 0; i < 2; i++) {
        // duplicate corner points
        wallPositions = addWallPositions(
          wallPositions,
          posIndex,
          threeI,
          topPositions,
          bottomPositions
        );
        posIndex += 6;
        if (vertexFormat.st) {
          wallTextures = addWallTextureCoordinates(
            wallTextures,
            stIndex,
            northIndex * 2,
            topSt
          );
          stIndex += 4;
        }
        if (shadowVolume) {
          extrudeNormalIndex += 3;
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
          wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
        }
        if (computeTopOffsets) {
          wallOffsetAttribute[wallOffsetIndex++] = 1;
          wallOffsetIndex += 1;
        }
      }
    }

    let geo = calculateAttributesWall(wallPositions, vertexFormat, ellipsoid);

    if (vertexFormat.st) {
      geo.attributes.st = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: wallTextures,
      });
    }
    if (shadowVolume) {
      geo.attributes.extrudeDirection = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: wallExtrudeNormals,
      });
    }
    if (hasOffsets) {
      geo.attributes.applyOffset = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: wallOffsetAttribute,
      });
    }

    const wallIndices = IndexDatatype.IndexDatatype.createTypedArray(
      wallCount,
      perimeterPositions * 6
    );

    let upperLeft;
    let lowerLeft;
    let lowerRight;
    let upperRight;
    length = wallPositions.length / 3;
    let index = 0;
    for (i = 0; i < length - 1; i += 2) {
      upperLeft = i;
      upperRight = (upperLeft + 2) % length;
      const p1 = Matrix3.Cartesian3.fromArray(wallPositions, upperLeft * 3, v1Scratch);
      const p2 = Matrix3.Cartesian3.fromArray(wallPositions, upperRight * 3, v2Scratch);
      if (Matrix3.Cartesian3.equalsEpsilon(p1, p2, Math$1.CesiumMath.EPSILON10)) {
        continue;
      }
      lowerLeft = (upperLeft + 1) % length;
      lowerRight = (lowerLeft + 2) % length;
      wallIndices[index++] = upperLeft;
      wallIndices[index++] = lowerLeft;
      wallIndices[index++] = upperRight;
      wallIndices[index++] = upperRight;
      wallIndices[index++] = lowerLeft;
      wallIndices[index++] = lowerRight;
    }

    geo.indices = wallIndices;

    geo = GeometryPipeline.GeometryPipeline.combineInstances([
      new GeometryInstance.GeometryInstance({
        geometry: topBottomGeo,
      }),
      new GeometryInstance.GeometryInstance({
        geometry: geo,
      }),
    ]);

    return geo[0];
  }

  const scratchRectanglePoints = [
    new Matrix3.Cartesian3(),
    new Matrix3.Cartesian3(),
    new Matrix3.Cartesian3(),
    new Matrix3.Cartesian3(),
  ];
  const nwScratch = new Matrix3.Cartographic();
  const stNwScratch = new Matrix3.Cartographic();
  function computeRectangle(rectangle, granularity, rotation, ellipsoid, result) {
    if (rotation === 0.0) {
      return Matrix2.Rectangle.clone(rectangle, result);
    }

    const computedOptions = RectangleGeometryLibrary.RectangleGeometryLibrary.computeOptions(
      rectangle,
      granularity,
      rotation,
      0,
      rectangleScratch,
      nwScratch
    );

    const height = computedOptions.height;
    const width = computedOptions.width;

    const positions = scratchRectanglePoints;
    RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
      computedOptions,
      ellipsoid,
      false,
      0,
      0,
      positions[0]
    );
    RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
      computedOptions,
      ellipsoid,
      false,
      0,
      width - 1,
      positions[1]
    );
    RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
      computedOptions,
      ellipsoid,
      false,
      height - 1,
      0,
      positions[2]
    );
    RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
      computedOptions,
      ellipsoid,
      false,
      height - 1,
      width - 1,
      positions[3]
    );

    return Matrix2.Rectangle.fromCartesianArray(positions, ellipsoid, result);
  }

  /**
   * A description of a cartographic rectangle on an ellipsoid centered at the origin. Rectangle geometry can be rendered with both {@link Primitive} and {@link GroundPrimitive}.
   *
   * @alias RectangleGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {Rectangle} options.rectangle A cartographic rectangle with north, south, east and west properties in radians.
   * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle lies.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {Number} [options.height=0.0] The distance in meters between the rectangle and the ellipsoid surface.
   * @param {Number} [options.rotation=0.0] The rotation of the rectangle, in radians. A positive rotation is counter-clockwise.
   * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
   * @param {Number} [options.extrudedHeight] The distance in meters between the rectangle's extruded face and the ellipsoid surface.
   *
   * @exception {DeveloperError} <code>options.rectangle.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
   * @exception {DeveloperError} <code>options.rectangle.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
   * @exception {DeveloperError} <code>options.rectangle.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
   * @exception {DeveloperError} <code>options.rectangle.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
   * @exception {DeveloperError} <code>options.rectangle.north</code> must be greater than <code>options.rectangle.south</code>.
   *
   * @see RectangleGeometry#createGeometry
   *
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Rectangle.html|Cesium Sandcastle Rectangle Demo}
   *
   * @example
   * // 1. create a rectangle
   * const rectangle = new Cesium.RectangleGeometry({
   *   ellipsoid : Cesium.Ellipsoid.WGS84,
   *   rectangle : Cesium.Rectangle.fromDegrees(-80.0, 39.0, -74.0, 42.0),
   *   height : 10000.0
   * });
   * const geometry = Cesium.RectangleGeometry.createGeometry(rectangle);
   *
   * // 2. create an extruded rectangle without a top
   * const rectangle = new Cesium.RectangleGeometry({
   *   ellipsoid : Cesium.Ellipsoid.WGS84,
   *   rectangle : Cesium.Rectangle.fromDegrees(-80.0, 39.0, -74.0, 42.0),
   *   height : 10000.0,
   *   extrudedHeight: 300000
   * });
   * const geometry = Cesium.RectangleGeometry.createGeometry(rectangle);
   */
  function RectangleGeometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    const rectangle = options.rectangle;

    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    Matrix2.Rectangle.validate(rectangle);
    if (rectangle.north < rectangle.south) {
      throw new Check.DeveloperError(
        "options.rectangle.north must be greater than or equal to options.rectangle.south"
      );
    }
    //>>includeEnd('debug');

    const height = defaultValue.defaultValue(options.height, 0.0);
    const extrudedHeight = defaultValue.defaultValue(options.extrudedHeight, height);

    this._rectangle = Matrix2.Rectangle.clone(rectangle);
    this._granularity = defaultValue.defaultValue(
      options.granularity,
      Math$1.CesiumMath.RADIANS_PER_DEGREE
    );
    this._ellipsoid = Matrix3.Ellipsoid.clone(
      defaultValue.defaultValue(options.ellipsoid, Matrix3.Ellipsoid.WGS84)
    );
    this._surfaceHeight = Math.max(height, extrudedHeight);
    this._rotation = defaultValue.defaultValue(options.rotation, 0.0);
    this._stRotation = defaultValue.defaultValue(options.stRotation, 0.0);
    this._vertexFormat = VertexFormat.VertexFormat.clone(
      defaultValue.defaultValue(options.vertexFormat, VertexFormat.VertexFormat.DEFAULT)
    );
    this._extrudedHeight = Math.min(height, extrudedHeight);
    this._shadowVolume = defaultValue.defaultValue(options.shadowVolume, false);
    this._workerName = "createRectangleGeometry";
    this._offsetAttribute = options.offsetAttribute;
    this._rotatedRectangle = undefined;

    this._textureCoordinateRotationPoints = undefined;
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  RectangleGeometry.packedLength =
    Matrix2.Rectangle.packedLength +
    Matrix3.Ellipsoid.packedLength +
    VertexFormat.VertexFormat.packedLength +
    7;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {RectangleGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  RectangleGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    Matrix2.Rectangle.pack(value._rectangle, array, startingIndex);
    startingIndex += Matrix2.Rectangle.packedLength;

    Matrix3.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
    startingIndex += Matrix3.Ellipsoid.packedLength;

    VertexFormat.VertexFormat.pack(value._vertexFormat, array, startingIndex);
    startingIndex += VertexFormat.VertexFormat.packedLength;

    array[startingIndex++] = value._granularity;
    array[startingIndex++] = value._surfaceHeight;
    array[startingIndex++] = value._rotation;
    array[startingIndex++] = value._stRotation;
    array[startingIndex++] = value._extrudedHeight;
    array[startingIndex++] = value._shadowVolume ? 1.0 : 0.0;
    array[startingIndex] = defaultValue.defaultValue(value._offsetAttribute, -1);

    return array;
  };

  const scratchRectangle = new Matrix2.Rectangle();
  const scratchEllipsoid = Matrix3.Ellipsoid.clone(Matrix3.Ellipsoid.UNIT_SPHERE);
  const scratchOptions = {
    rectangle: scratchRectangle,
    ellipsoid: scratchEllipsoid,
    vertexFormat: scratchVertexFormat,
    granularity: undefined,
    height: undefined,
    rotation: undefined,
    stRotation: undefined,
    extrudedHeight: undefined,
    shadowVolume: undefined,
    offsetAttribute: undefined,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {RectangleGeometry} [result] The object into which to store the result.
   * @returns {RectangleGeometry} The modified result parameter or a new RectangleGeometry instance if one was not provided.
   */
  RectangleGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const rectangle = Matrix2.Rectangle.unpack(array, startingIndex, scratchRectangle);
    startingIndex += Matrix2.Rectangle.packedLength;

    const ellipsoid = Matrix3.Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
    startingIndex += Matrix3.Ellipsoid.packedLength;

    const vertexFormat = VertexFormat.VertexFormat.unpack(
      array,
      startingIndex,
      scratchVertexFormat
    );
    startingIndex += VertexFormat.VertexFormat.packedLength;

    const granularity = array[startingIndex++];
    const surfaceHeight = array[startingIndex++];
    const rotation = array[startingIndex++];
    const stRotation = array[startingIndex++];
    const extrudedHeight = array[startingIndex++];
    const shadowVolume = array[startingIndex++] === 1.0;
    const offsetAttribute = array[startingIndex];

    if (!defaultValue.defined(result)) {
      scratchOptions.granularity = granularity;
      scratchOptions.height = surfaceHeight;
      scratchOptions.rotation = rotation;
      scratchOptions.stRotation = stRotation;
      scratchOptions.extrudedHeight = extrudedHeight;
      scratchOptions.shadowVolume = shadowVolume;
      scratchOptions.offsetAttribute =
        offsetAttribute === -1 ? undefined : offsetAttribute;

      return new RectangleGeometry(scratchOptions);
    }

    result._rectangle = Matrix2.Rectangle.clone(rectangle, result._rectangle);
    result._ellipsoid = Matrix3.Ellipsoid.clone(ellipsoid, result._ellipsoid);
    result._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat, result._vertexFormat);
    result._granularity = granularity;
    result._surfaceHeight = surfaceHeight;
    result._rotation = rotation;
    result._stRotation = stRotation;
    result._extrudedHeight = extrudedHeight;
    result._shadowVolume = shadowVolume;
    result._offsetAttribute =
      offsetAttribute === -1 ? undefined : offsetAttribute;

    return result;
  };

  /**
   * Computes the bounding rectangle based on the provided options
   *
   * @param {Object} options Object with the following properties:
   * @param {Rectangle} options.rectangle A cartographic rectangle with north, south, east and west properties in radians.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle lies.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {Number} [options.rotation=0.0] The rotation of the rectangle, in radians. A positive rotation is counter-clockwise.
   * @param {Rectangle} [result] An object in which to store the result.
   *
   * @returns {Rectangle} The result rectangle
   */
  RectangleGeometry.computeRectangle = function (options, result) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    const rectangle = options.rectangle;

    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    Matrix2.Rectangle.validate(rectangle);
    if (rectangle.north < rectangle.south) {
      throw new Check.DeveloperError(
        "options.rectangle.north must be greater than or equal to options.rectangle.south"
      );
    }
    //>>includeEnd('debug');

    const granularity = defaultValue.defaultValue(
      options.granularity,
      Math$1.CesiumMath.RADIANS_PER_DEGREE
    );
    const ellipsoid = defaultValue.defaultValue(options.ellipsoid, Matrix3.Ellipsoid.WGS84);
    const rotation = defaultValue.defaultValue(options.rotation, 0.0);

    return computeRectangle(rectangle, granularity, rotation, ellipsoid, result);
  };

  const tangentRotationMatrixScratch = new Matrix3.Matrix3();
  const quaternionScratch = new Transforms.Quaternion();
  const centerScratch = new Matrix3.Cartographic();
  /**
   * Computes the geometric representation of a rectangle, including its vertices, indices, and a bounding sphere.
   *
   * @param {RectangleGeometry} rectangleGeometry A description of the rectangle.
   * @returns {Geometry|undefined} The computed vertices and indices.
   *
   * @exception {DeveloperError} Rotated rectangle is invalid.
   */
  RectangleGeometry.createGeometry = function (rectangleGeometry) {
    if (
      Math$1.CesiumMath.equalsEpsilon(
        rectangleGeometry._rectangle.north,
        rectangleGeometry._rectangle.south,
        Math$1.CesiumMath.EPSILON10
      ) ||
      Math$1.CesiumMath.equalsEpsilon(
        rectangleGeometry._rectangle.east,
        rectangleGeometry._rectangle.west,
        Math$1.CesiumMath.EPSILON10
      )
    ) {
      return undefined;
    }

    let rectangle = rectangleGeometry._rectangle;
    const ellipsoid = rectangleGeometry._ellipsoid;
    const rotation = rectangleGeometry._rotation;
    const stRotation = rectangleGeometry._stRotation;
    const vertexFormat = rectangleGeometry._vertexFormat;

    const computedOptions = RectangleGeometryLibrary.RectangleGeometryLibrary.computeOptions(
      rectangle,
      rectangleGeometry._granularity,
      rotation,
      stRotation,
      rectangleScratch,
      nwScratch,
      stNwScratch
    );

    const tangentRotationMatrix = tangentRotationMatrixScratch;
    if (stRotation !== 0 || rotation !== 0) {
      const center = Matrix2.Rectangle.center(rectangle, centerScratch);
      const axis = ellipsoid.geodeticSurfaceNormalCartographic(center, v1Scratch);
      Transforms.Quaternion.fromAxisAngle(axis, -stRotation, quaternionScratch);
      Matrix3.Matrix3.fromQuaternion(quaternionScratch, tangentRotationMatrix);
    } else {
      Matrix3.Matrix3.clone(Matrix3.Matrix3.IDENTITY, tangentRotationMatrix);
    }

    const surfaceHeight = rectangleGeometry._surfaceHeight;
    const extrudedHeight = rectangleGeometry._extrudedHeight;
    const extrude = !Math$1.CesiumMath.equalsEpsilon(
      surfaceHeight,
      extrudedHeight,
      0,
      Math$1.CesiumMath.EPSILON2
    );

    computedOptions.lonScalar = 1.0 / rectangleGeometry._rectangle.width;
    computedOptions.latScalar = 1.0 / rectangleGeometry._rectangle.height;
    computedOptions.tangentRotationMatrix = tangentRotationMatrix;

    let geometry;
    let boundingSphere;
    rectangle = rectangleGeometry._rectangle;
    if (extrude) {
      geometry = constructExtrudedRectangle(rectangleGeometry, computedOptions);
      const topBS = Transforms.BoundingSphere.fromRectangle3D(
        rectangle,
        ellipsoid,
        surfaceHeight,
        topBoundingSphere
      );
      const bottomBS = Transforms.BoundingSphere.fromRectangle3D(
        rectangle,
        ellipsoid,
        extrudedHeight,
        bottomBoundingSphere
      );
      boundingSphere = Transforms.BoundingSphere.union(topBS, bottomBS);
    } else {
      geometry = constructRectangle(rectangleGeometry, computedOptions);
      geometry.attributes.position.values = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
        geometry.attributes.position.values,
        surfaceHeight,
        ellipsoid,
        false
      );

      if (defaultValue.defined(rectangleGeometry._offsetAttribute)) {
        const length = geometry.attributes.position.values.length;
        const offsetValue =
          rectangleGeometry._offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE
            ? 0
            : 1;
        const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
        geometry.attributes.applyOffset = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 1,
          values: applyOffset,
        });
      }

      boundingSphere = Transforms.BoundingSphere.fromRectangle3D(
        rectangle,
        ellipsoid,
        surfaceHeight
      );
    }

    if (!vertexFormat.position) {
      delete geometry.attributes.position;
    }

    return new GeometryAttribute.Geometry({
      attributes: geometry.attributes,
      indices: geometry.indices,
      primitiveType: geometry.primitiveType,
      boundingSphere: boundingSphere,
      offsetAttribute: rectangleGeometry._offsetAttribute,
    });
  };

  /**
   * @private
   */
  RectangleGeometry.createShadowVolume = function (
    rectangleGeometry,
    minHeightFunc,
    maxHeightFunc
  ) {
    const granularity = rectangleGeometry._granularity;
    const ellipsoid = rectangleGeometry._ellipsoid;

    const minHeight = minHeightFunc(granularity, ellipsoid);
    const maxHeight = maxHeightFunc(granularity, ellipsoid);

    return new RectangleGeometry({
      rectangle: rectangleGeometry._rectangle,
      rotation: rectangleGeometry._rotation,
      ellipsoid: ellipsoid,
      stRotation: rectangleGeometry._stRotation,
      granularity: granularity,
      extrudedHeight: maxHeight,
      height: minHeight,
      vertexFormat: VertexFormat.VertexFormat.POSITION_ONLY,
      shadowVolume: true,
    });
  };

  const unrotatedTextureRectangleScratch = new Matrix2.Rectangle();
  const points2DScratch = [new Matrix2.Cartesian2(), new Matrix2.Cartesian2(), new Matrix2.Cartesian2()];
  const rotation2DScratch = new Matrix2.Matrix2();
  const rectangleCenterScratch = new Matrix3.Cartographic();

  function textureCoordinateRotationPoints(rectangleGeometry) {
    if (rectangleGeometry._stRotation === 0.0) {
      return [0, 0, 0, 1, 1, 0];
    }

    const rectangle = Matrix2.Rectangle.clone(
      rectangleGeometry._rectangle,
      unrotatedTextureRectangleScratch
    );
    const granularity = rectangleGeometry._granularity;
    const ellipsoid = rectangleGeometry._ellipsoid;

    // Rotate to align the texture coordinates with ENU
    const rotation = rectangleGeometry._rotation - rectangleGeometry._stRotation;

    const unrotatedTextureRectangle = computeRectangle(
      rectangle,
      granularity,
      rotation,
      ellipsoid,
      unrotatedTextureRectangleScratch
    );

    // Assume a computed "east-north" texture coordinate system based on spherical or planar tricks, bounded by `boundingRectangle`.
    // The "desired" texture coordinate system forms an oriented rectangle (un-oriented computed) around the geometry that completely and tightly bounds it.
    // We want to map from the "east-north" texture coordinate system into the "desired" system using a pair of lines (analagous planes in 2D)
    // Compute 3 corners of the "desired" texture coordinate system in "east-north" texture space by the following in cartographic space:
    // - rotate 3 of the corners in unrotatedTextureRectangle by stRotation around the center of the bounding rectangle
    // - apply the "east-north" system's normalization formula to the rotated cartographics, even though this is likely to produce values outside [0-1].
    // This gives us a set of points in the "east-north" texture coordinate system that can be used to map "east-north" texture coordinates to "desired."

    const points2D = points2DScratch;
    points2D[0].x = unrotatedTextureRectangle.west;
    points2D[0].y = unrotatedTextureRectangle.south;

    points2D[1].x = unrotatedTextureRectangle.west;
    points2D[1].y = unrotatedTextureRectangle.north;

    points2D[2].x = unrotatedTextureRectangle.east;
    points2D[2].y = unrotatedTextureRectangle.south;

    const boundingRectangle = rectangleGeometry.rectangle;
    const toDesiredInComputed = Matrix2.Matrix2.fromRotation(
      rectangleGeometry._stRotation,
      rotation2DScratch
    );
    const boundingRectangleCenter = Matrix2.Rectangle.center(
      boundingRectangle,
      rectangleCenterScratch
    );

    for (let i = 0; i < 3; ++i) {
      const point2D = points2D[i];
      point2D.x -= boundingRectangleCenter.longitude;
      point2D.y -= boundingRectangleCenter.latitude;
      Matrix2.Matrix2.multiplyByVector(toDesiredInComputed, point2D, point2D);
      point2D.x += boundingRectangleCenter.longitude;
      point2D.y += boundingRectangleCenter.latitude;

      // Convert point into east-north texture coordinate space
      point2D.x = (point2D.x - boundingRectangle.west) / boundingRectangle.width;
      point2D.y =
        (point2D.y - boundingRectangle.south) / boundingRectangle.height;
    }

    const minXYCorner = points2D[0];
    const maxYCorner = points2D[1];
    const maxXCorner = points2D[2];
    const result = new Array(6);
    Matrix2.Cartesian2.pack(minXYCorner, result);
    Matrix2.Cartesian2.pack(maxYCorner, result, 2);
    Matrix2.Cartesian2.pack(maxXCorner, result, 4);
    return result;
  }

  Object.defineProperties(RectangleGeometry.prototype, {
    /**
     * @private
     */
    rectangle: {
      get: function () {
        if (!defaultValue.defined(this._rotatedRectangle)) {
          this._rotatedRectangle = computeRectangle(
            this._rectangle,
            this._granularity,
            this._rotation,
            this._ellipsoid
          );
        }
        return this._rotatedRectangle;
      },
    },
    /**
     * For remapping texture coordinates when rendering RectangleGeometries as GroundPrimitives.
     * This version permits skew in textures by computing offsets directly in cartographic space and
     * more accurately approximates rendering RectangleGeometries with height as standard Primitives.
     * @see Geometry#_textureCoordinateRotationPoints
     * @private
     */
    textureCoordinateRotationPoints: {
      get: function () {
        if (!defaultValue.defined(this._textureCoordinateRotationPoints)) {
          this._textureCoordinateRotationPoints = textureCoordinateRotationPoints(
            this
          );
        }
        return this._textureCoordinateRotationPoints;
      },
    },
  });

  function createRectangleGeometry(rectangleGeometry, offset) {
    if (defaultValue.defined(offset)) {
      rectangleGeometry = RectangleGeometry.unpack(rectangleGeometry, offset);
    }
    rectangleGeometry._ellipsoid = Matrix3.Ellipsoid.clone(rectangleGeometry._ellipsoid);
    rectangleGeometry._rectangle = Matrix2.Rectangle.clone(rectangleGeometry._rectangle);
    return RectangleGeometry.createGeometry(rectangleGeometry);
  }

  return createRectangleGeometry;

}));

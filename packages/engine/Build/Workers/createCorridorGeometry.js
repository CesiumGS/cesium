define(['./arrayRemoveDuplicates-c2038105', './Transforms-26539bce', './Matrix3-315394f6', './Check-666ab1a0', './ComponentDatatype-f7b11d02', './PolylineVolumeGeometryLibrary-125d2edf', './CorridorGeometryLibrary-7cbae7a0', './defaultValue-0a909f67', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryOffsetAttribute-04332ce7', './IndexDatatype-a55ceaa1', './Math-2dbd6b93', './PolygonPipeline-f59a8f0a', './Matrix2-13178034', './VertexFormat-6b480673', './combine-ca22a614', './RuntimeError-06c93819', './WebGLConstants-a8cc3e8c', './EllipsoidTangentPlane-cfb50678', './AxisAlignedBoundingBox-a4321399', './IntersectionTests-a93d3de9', './Plane-900aa728', './PolylinePipeline-d8e6bd9b', './EllipsoidGeodesic-98c62a56', './EllipsoidRhumbLine-19756602'], (function (arrayRemoveDuplicates, Transforms, Matrix3, Check, ComponentDatatype, PolylineVolumeGeometryLibrary, CorridorGeometryLibrary, defaultValue, GeometryAttribute, GeometryAttributes, GeometryOffsetAttribute, IndexDatatype, Math$1, PolygonPipeline, Matrix2, VertexFormat, combine$1, RuntimeError, WebGLConstants, EllipsoidTangentPlane, AxisAlignedBoundingBox, IntersectionTests, Plane, PolylinePipeline, EllipsoidGeodesic, EllipsoidRhumbLine) { 'use strict';

  const cartesian1 = new Matrix3.Cartesian3();
  const cartesian2 = new Matrix3.Cartesian3();
  const cartesian3 = new Matrix3.Cartesian3();
  const cartesian4 = new Matrix3.Cartesian3();
  const cartesian5 = new Matrix3.Cartesian3();
  const cartesian6 = new Matrix3.Cartesian3();

  const scratch1 = new Matrix3.Cartesian3();
  const scratch2 = new Matrix3.Cartesian3();

  function scaleToSurface(positions, ellipsoid) {
    for (let i = 0; i < positions.length; i++) {
      positions[i] = ellipsoid.scaleToGeodeticSurface(positions[i], positions[i]);
    }
    return positions;
  }

  function addNormals(attr, normal, left, front, back, vertexFormat) {
    const normals = attr.normals;
    const tangents = attr.tangents;
    const bitangents = attr.bitangents;
    const forward = Matrix3.Cartesian3.normalize(
      Matrix3.Cartesian3.cross(left, normal, scratch1),
      scratch1
    );
    if (vertexFormat.normal) {
      CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(normals, normal, front, back);
    }
    if (vertexFormat.tangent) {
      CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(tangents, forward, front, back);
    }
    if (vertexFormat.bitangent) {
      CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(bitangents, left, front, back);
    }
  }

  function combine(computedPositions, vertexFormat, ellipsoid) {
    const positions = computedPositions.positions;
    const corners = computedPositions.corners;
    const endPositions = computedPositions.endPositions;
    const computedLefts = computedPositions.lefts;
    const computedNormals = computedPositions.normals;
    const attributes = new GeometryAttributes.GeometryAttributes();
    let corner;
    let leftCount = 0;
    let rightCount = 0;
    let i;
    let indicesLength = 0;
    let length;
    for (i = 0; i < positions.length; i += 2) {
      length = positions[i].length - 3;
      leftCount += length; //subtracting 3 to account for duplicate points at corners
      indicesLength += length * 2;
      rightCount += positions[i + 1].length - 3;
    }
    leftCount += 3; //add back count for end positions
    rightCount += 3;
    for (i = 0; i < corners.length; i++) {
      corner = corners[i];
      const leftSide = corners[i].leftPositions;
      if (defaultValue.defined(leftSide)) {
        length = leftSide.length;
        leftCount += length;
        indicesLength += length;
      } else {
        length = corners[i].rightPositions.length;
        rightCount += length;
        indicesLength += length;
      }
    }

    const addEndPositions = defaultValue.defined(endPositions);
    let endPositionLength;
    if (addEndPositions) {
      endPositionLength = endPositions[0].length - 3;
      leftCount += endPositionLength;
      rightCount += endPositionLength;
      endPositionLength /= 3;
      indicesLength += endPositionLength * 6;
    }
    const size = leftCount + rightCount;
    const finalPositions = new Float64Array(size);
    const normals = vertexFormat.normal ? new Float32Array(size) : undefined;
    const tangents = vertexFormat.tangent ? new Float32Array(size) : undefined;
    const bitangents = vertexFormat.bitangent
      ? new Float32Array(size)
      : undefined;
    const attr = {
      normals: normals,
      tangents: tangents,
      bitangents: bitangents,
    };
    let front = 0;
    let back = size - 1;
    let UL, LL, UR, LR;
    let normal = cartesian1;
    let left = cartesian2;
    let rightPos, leftPos;
    const halfLength = endPositionLength / 2;

    const indices = IndexDatatype.IndexDatatype.createTypedArray(size / 3, indicesLength);
    let index = 0;
    if (addEndPositions) {
      // add rounded end
      leftPos = cartesian3;
      rightPos = cartesian4;
      const firstEndPositions = endPositions[0];
      normal = Matrix3.Cartesian3.fromArray(computedNormals, 0, normal);
      left = Matrix3.Cartesian3.fromArray(computedLefts, 0, left);
      for (i = 0; i < halfLength; i++) {
        leftPos = Matrix3.Cartesian3.fromArray(
          firstEndPositions,
          (halfLength - 1 - i) * 3,
          leftPos
        );
        rightPos = Matrix3.Cartesian3.fromArray(
          firstEndPositions,
          (halfLength + i) * 3,
          rightPos
        );
        CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(finalPositions, rightPos, front);
        CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
          finalPositions,
          leftPos,
          undefined,
          back
        );
        addNormals(attr, normal, left, front, back, vertexFormat);

        LL = front / 3;
        LR = LL + 1;
        UL = (back - 2) / 3;
        UR = UL - 1;
        indices[index++] = UL;
        indices[index++] = LL;
        indices[index++] = UR;
        indices[index++] = UR;
        indices[index++] = LL;
        indices[index++] = LR;

        front += 3;
        back -= 3;
      }
    }

    let posIndex = 0;
    let compIndex = 0;
    let rightEdge = positions[posIndex++]; //add first two edges
    let leftEdge = positions[posIndex++];
    finalPositions.set(rightEdge, front);
    finalPositions.set(leftEdge, back - leftEdge.length + 1);

    left = Matrix3.Cartesian3.fromArray(computedLefts, compIndex, left);
    let rightNormal;
    let leftNormal;
    length = leftEdge.length - 3;
    for (i = 0; i < length; i += 3) {
      rightNormal = ellipsoid.geodeticSurfaceNormal(
        Matrix3.Cartesian3.fromArray(rightEdge, i, scratch1),
        scratch1
      );
      leftNormal = ellipsoid.geodeticSurfaceNormal(
        Matrix3.Cartesian3.fromArray(leftEdge, length - i, scratch2),
        scratch2
      );
      normal = Matrix3.Cartesian3.normalize(
        Matrix3.Cartesian3.add(rightNormal, leftNormal, normal),
        normal
      );
      addNormals(attr, normal, left, front, back, vertexFormat);

      LL = front / 3;
      LR = LL + 1;
      UL = (back - 2) / 3;
      UR = UL - 1;
      indices[index++] = UL;
      indices[index++] = LL;
      indices[index++] = UR;
      indices[index++] = UR;
      indices[index++] = LL;
      indices[index++] = LR;

      front += 3;
      back -= 3;
    }

    rightNormal = ellipsoid.geodeticSurfaceNormal(
      Matrix3.Cartesian3.fromArray(rightEdge, length, scratch1),
      scratch1
    );
    leftNormal = ellipsoid.geodeticSurfaceNormal(
      Matrix3.Cartesian3.fromArray(leftEdge, length, scratch2),
      scratch2
    );
    normal = Matrix3.Cartesian3.normalize(
      Matrix3.Cartesian3.add(rightNormal, leftNormal, normal),
      normal
    );
    compIndex += 3;
    for (i = 0; i < corners.length; i++) {
      let j;
      corner = corners[i];
      const l = corner.leftPositions;
      const r = corner.rightPositions;
      let pivot;
      let start;
      let outsidePoint = cartesian6;
      let previousPoint = cartesian3;
      let nextPoint = cartesian4;
      normal = Matrix3.Cartesian3.fromArray(computedNormals, compIndex, normal);
      if (defaultValue.defined(l)) {
        addNormals(attr, normal, left, undefined, back, vertexFormat);
        back -= 3;
        pivot = LR;
        start = UR;
        for (j = 0; j < l.length / 3; j++) {
          outsidePoint = Matrix3.Cartesian3.fromArray(l, j * 3, outsidePoint);
          indices[index++] = pivot;
          indices[index++] = start - j - 1;
          indices[index++] = start - j;
          CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
            finalPositions,
            outsidePoint,
            undefined,
            back
          );
          previousPoint = Matrix3.Cartesian3.fromArray(
            finalPositions,
            (start - j - 1) * 3,
            previousPoint
          );
          nextPoint = Matrix3.Cartesian3.fromArray(finalPositions, pivot * 3, nextPoint);
          left = Matrix3.Cartesian3.normalize(
            Matrix3.Cartesian3.subtract(previousPoint, nextPoint, left),
            left
          );
          addNormals(attr, normal, left, undefined, back, vertexFormat);
          back -= 3;
        }
        outsidePoint = Matrix3.Cartesian3.fromArray(
          finalPositions,
          pivot * 3,
          outsidePoint
        );
        previousPoint = Matrix3.Cartesian3.subtract(
          Matrix3.Cartesian3.fromArray(finalPositions, start * 3, previousPoint),
          outsidePoint,
          previousPoint
        );
        nextPoint = Matrix3.Cartesian3.subtract(
          Matrix3.Cartesian3.fromArray(finalPositions, (start - j) * 3, nextPoint),
          outsidePoint,
          nextPoint
        );
        left = Matrix3.Cartesian3.normalize(
          Matrix3.Cartesian3.add(previousPoint, nextPoint, left),
          left
        );
        addNormals(attr, normal, left, front, undefined, vertexFormat);
        front += 3;
      } else {
        addNormals(attr, normal, left, front, undefined, vertexFormat);
        front += 3;
        pivot = UR;
        start = LR;
        for (j = 0; j < r.length / 3; j++) {
          outsidePoint = Matrix3.Cartesian3.fromArray(r, j * 3, outsidePoint);
          indices[index++] = pivot;
          indices[index++] = start + j;
          indices[index++] = start + j + 1;
          CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
            finalPositions,
            outsidePoint,
            front
          );
          previousPoint = Matrix3.Cartesian3.fromArray(
            finalPositions,
            pivot * 3,
            previousPoint
          );
          nextPoint = Matrix3.Cartesian3.fromArray(
            finalPositions,
            (start + j) * 3,
            nextPoint
          );
          left = Matrix3.Cartesian3.normalize(
            Matrix3.Cartesian3.subtract(previousPoint, nextPoint, left),
            left
          );
          addNormals(attr, normal, left, front, undefined, vertexFormat);
          front += 3;
        }
        outsidePoint = Matrix3.Cartesian3.fromArray(
          finalPositions,
          pivot * 3,
          outsidePoint
        );
        previousPoint = Matrix3.Cartesian3.subtract(
          Matrix3.Cartesian3.fromArray(finalPositions, (start + j) * 3, previousPoint),
          outsidePoint,
          previousPoint
        );
        nextPoint = Matrix3.Cartesian3.subtract(
          Matrix3.Cartesian3.fromArray(finalPositions, start * 3, nextPoint),
          outsidePoint,
          nextPoint
        );
        left = Matrix3.Cartesian3.normalize(
          Matrix3.Cartesian3.negate(Matrix3.Cartesian3.add(nextPoint, previousPoint, left), left),
          left
        );
        addNormals(attr, normal, left, undefined, back, vertexFormat);
        back -= 3;
      }
      rightEdge = positions[posIndex++];
      leftEdge = positions[posIndex++];
      rightEdge.splice(0, 3); //remove duplicate points added by corner
      leftEdge.splice(leftEdge.length - 3, 3);
      finalPositions.set(rightEdge, front);
      finalPositions.set(leftEdge, back - leftEdge.length + 1);
      length = leftEdge.length - 3;

      compIndex += 3;
      left = Matrix3.Cartesian3.fromArray(computedLefts, compIndex, left);
      for (j = 0; j < leftEdge.length; j += 3) {
        rightNormal = ellipsoid.geodeticSurfaceNormal(
          Matrix3.Cartesian3.fromArray(rightEdge, j, scratch1),
          scratch1
        );
        leftNormal = ellipsoid.geodeticSurfaceNormal(
          Matrix3.Cartesian3.fromArray(leftEdge, length - j, scratch2),
          scratch2
        );
        normal = Matrix3.Cartesian3.normalize(
          Matrix3.Cartesian3.add(rightNormal, leftNormal, normal),
          normal
        );
        addNormals(attr, normal, left, front, back, vertexFormat);

        LR = front / 3;
        LL = LR - 1;
        UR = (back - 2) / 3;
        UL = UR + 1;
        indices[index++] = UL;
        indices[index++] = LL;
        indices[index++] = UR;
        indices[index++] = UR;
        indices[index++] = LL;
        indices[index++] = LR;

        front += 3;
        back -= 3;
      }
      front -= 3;
      back += 3;
    }
    normal = Matrix3.Cartesian3.fromArray(
      computedNormals,
      computedNormals.length - 3,
      normal
    );
    addNormals(attr, normal, left, front, back, vertexFormat);

    if (addEndPositions) {
      // add rounded end
      front += 3;
      back -= 3;
      leftPos = cartesian3;
      rightPos = cartesian4;
      const lastEndPositions = endPositions[1];
      for (i = 0; i < halfLength; i++) {
        leftPos = Matrix3.Cartesian3.fromArray(
          lastEndPositions,
          (endPositionLength - i - 1) * 3,
          leftPos
        );
        rightPos = Matrix3.Cartesian3.fromArray(lastEndPositions, i * 3, rightPos);
        CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
          finalPositions,
          leftPos,
          undefined,
          back
        );
        CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(finalPositions, rightPos, front);
        addNormals(attr, normal, left, front, back, vertexFormat);

        LR = front / 3;
        LL = LR - 1;
        UR = (back - 2) / 3;
        UL = UR + 1;
        indices[index++] = UL;
        indices[index++] = LL;
        indices[index++] = UR;
        indices[index++] = UR;
        indices[index++] = LL;
        indices[index++] = LR;

        front += 3;
        back -= 3;
      }
    }

    attributes.position = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: finalPositions,
    });

    if (vertexFormat.st) {
      const st = new Float32Array((size / 3) * 2);
      let rightSt;
      let leftSt;
      let stIndex = 0;
      if (addEndPositions) {
        leftCount /= 3;
        rightCount /= 3;
        const theta = Math.PI / (endPositionLength + 1);
        leftSt = 1 / (leftCount - endPositionLength + 1);
        rightSt = 1 / (rightCount - endPositionLength + 1);
        let a;
        const halfEndPos = endPositionLength / 2;
        for (i = halfEndPos + 1; i < endPositionLength + 1; i++) {
          // lower left rounded end
          a = Math$1.CesiumMath.PI_OVER_TWO + theta * i;
          st[stIndex++] = rightSt * (1 + Math.cos(a));
          st[stIndex++] = 0.5 * (1 + Math.sin(a));
        }
        for (i = 1; i < rightCount - endPositionLength + 1; i++) {
          // bottom edge
          st[stIndex++] = i * rightSt;
          st[stIndex++] = 0;
        }
        for (i = endPositionLength; i > halfEndPos; i--) {
          // lower right rounded end
          a = Math$1.CesiumMath.PI_OVER_TWO - i * theta;
          st[stIndex++] = 1 - rightSt * (1 + Math.cos(a));
          st[stIndex++] = 0.5 * (1 + Math.sin(a));
        }
        for (i = halfEndPos; i > 0; i--) {
          // upper right rounded end
          a = Math$1.CesiumMath.PI_OVER_TWO - theta * i;
          st[stIndex++] = 1 - leftSt * (1 + Math.cos(a));
          st[stIndex++] = 0.5 * (1 + Math.sin(a));
        }
        for (i = leftCount - endPositionLength; i > 0; i--) {
          // top edge
          st[stIndex++] = i * leftSt;
          st[stIndex++] = 1;
        }
        for (i = 1; i < halfEndPos + 1; i++) {
          // upper left rounded end
          a = Math$1.CesiumMath.PI_OVER_TWO + theta * i;
          st[stIndex++] = leftSt * (1 + Math.cos(a));
          st[stIndex++] = 0.5 * (1 + Math.sin(a));
        }
      } else {
        leftCount /= 3;
        rightCount /= 3;
        leftSt = 1 / (leftCount - 1);
        rightSt = 1 / (rightCount - 1);
        for (i = 0; i < rightCount; i++) {
          // bottom edge
          st[stIndex++] = i * rightSt;
          st[stIndex++] = 0;
        }
        for (i = leftCount; i > 0; i--) {
          // top edge
          st[stIndex++] = (i - 1) * leftSt;
          st[stIndex++] = 1;
        }
      }

      attributes.st = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: st,
      });
    }

    if (vertexFormat.normal) {
      attributes.normal = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: attr.normals,
      });
    }

    if (vertexFormat.tangent) {
      attributes.tangent = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: attr.tangents,
      });
    }

    if (vertexFormat.bitangent) {
      attributes.bitangent = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: attr.bitangents,
      });
    }

    return {
      attributes: attributes,
      indices: indices,
    };
  }

  function extrudedAttributes(attributes, vertexFormat) {
    if (
      !vertexFormat.normal &&
      !vertexFormat.tangent &&
      !vertexFormat.bitangent &&
      !vertexFormat.st
    ) {
      return attributes;
    }
    const positions = attributes.position.values;
    let topNormals;
    let topBitangents;
    if (vertexFormat.normal || vertexFormat.bitangent) {
      topNormals = attributes.normal.values;
      topBitangents = attributes.bitangent.values;
    }
    const size = attributes.position.values.length / 18;
    const threeSize = size * 3;
    const twoSize = size * 2;
    const sixSize = threeSize * 2;
    let i;
    if (vertexFormat.normal || vertexFormat.bitangent || vertexFormat.tangent) {
      const normals = vertexFormat.normal
        ? new Float32Array(threeSize * 6)
        : undefined;
      const tangents = vertexFormat.tangent
        ? new Float32Array(threeSize * 6)
        : undefined;
      const bitangents = vertexFormat.bitangent
        ? new Float32Array(threeSize * 6)
        : undefined;
      let topPosition = cartesian1;
      let bottomPosition = cartesian2;
      let previousPosition = cartesian3;
      let normal = cartesian4;
      let tangent = cartesian5;
      let bitangent = cartesian6;
      let attrIndex = sixSize;
      for (i = 0; i < threeSize; i += 3) {
        const attrIndexOffset = attrIndex + sixSize;
        topPosition = Matrix3.Cartesian3.fromArray(positions, i, topPosition);
        bottomPosition = Matrix3.Cartesian3.fromArray(
          positions,
          i + threeSize,
          bottomPosition
        );
        previousPosition = Matrix3.Cartesian3.fromArray(
          positions,
          (i + 3) % threeSize,
          previousPosition
        );
        bottomPosition = Matrix3.Cartesian3.subtract(
          bottomPosition,
          topPosition,
          bottomPosition
        );
        previousPosition = Matrix3.Cartesian3.subtract(
          previousPosition,
          topPosition,
          previousPosition
        );
        normal = Matrix3.Cartesian3.normalize(
          Matrix3.Cartesian3.cross(bottomPosition, previousPosition, normal),
          normal
        );
        if (vertexFormat.normal) {
          CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(normals, normal, attrIndexOffset);
          CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
            normals,
            normal,
            attrIndexOffset + 3
          );
          CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(normals, normal, attrIndex);
          CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(normals, normal, attrIndex + 3);
        }
        if (vertexFormat.tangent || vertexFormat.bitangent) {
          bitangent = Matrix3.Cartesian3.fromArray(topNormals, i, bitangent);
          if (vertexFormat.bitangent) {
            CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
              bitangents,
              bitangent,
              attrIndexOffset
            );
            CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
              bitangents,
              bitangent,
              attrIndexOffset + 3
            );
            CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
              bitangents,
              bitangent,
              attrIndex
            );
            CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
              bitangents,
              bitangent,
              attrIndex + 3
            );
          }

          if (vertexFormat.tangent) {
            tangent = Matrix3.Cartesian3.normalize(
              Matrix3.Cartesian3.cross(bitangent, normal, tangent),
              tangent
            );
            CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
              tangents,
              tangent,
              attrIndexOffset
            );
            CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
              tangents,
              tangent,
              attrIndexOffset + 3
            );
            CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(tangents, tangent, attrIndex);
            CorridorGeometryLibrary.CorridorGeometryLibrary.addAttribute(
              tangents,
              tangent,
              attrIndex + 3
            );
          }
        }
        attrIndex += 6;
      }

      if (vertexFormat.normal) {
        normals.set(topNormals); //top
        for (i = 0; i < threeSize; i += 3) {
          //bottom normals
          normals[i + threeSize] = -topNormals[i];
          normals[i + threeSize + 1] = -topNormals[i + 1];
          normals[i + threeSize + 2] = -topNormals[i + 2];
        }
        attributes.normal.values = normals;
      } else {
        attributes.normal = undefined;
      }

      if (vertexFormat.bitangent) {
        bitangents.set(topBitangents); //top
        bitangents.set(topBitangents, threeSize); //bottom
        attributes.bitangent.values = bitangents;
      } else {
        attributes.bitangent = undefined;
      }

      if (vertexFormat.tangent) {
        const topTangents = attributes.tangent.values;
        tangents.set(topTangents); //top
        tangents.set(topTangents, threeSize); //bottom
        attributes.tangent.values = tangents;
      }
    }
    if (vertexFormat.st) {
      const topSt = attributes.st.values;
      const st = new Float32Array(twoSize * 6);
      st.set(topSt); //top
      st.set(topSt, twoSize); //bottom
      let index = twoSize * 2;

      for (let j = 0; j < 2; j++) {
        st[index++] = topSt[0];
        st[index++] = topSt[1];
        for (i = 2; i < twoSize; i += 2) {
          const s = topSt[i];
          const t = topSt[i + 1];
          st[index++] = s;
          st[index++] = t;
          st[index++] = s;
          st[index++] = t;
        }
        st[index++] = topSt[0];
        st[index++] = topSt[1];
      }
      attributes.st.values = st;
    }

    return attributes;
  }

  function addWallPositions(positions, index, wallPositions) {
    wallPositions[index++] = positions[0];
    wallPositions[index++] = positions[1];
    wallPositions[index++] = positions[2];
    for (let i = 3; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      wallPositions[index++] = x;
      wallPositions[index++] = y;
      wallPositions[index++] = z;
      wallPositions[index++] = x;
      wallPositions[index++] = y;
      wallPositions[index++] = z;
    }
    wallPositions[index++] = positions[0];
    wallPositions[index++] = positions[1];
    wallPositions[index++] = positions[2];

    return wallPositions;
  }

  function computePositionsExtruded(params, vertexFormat) {
    const topVertexFormat = new VertexFormat.VertexFormat({
      position: vertexFormat.position,
      normal:
        vertexFormat.normal || vertexFormat.bitangent || params.shadowVolume,
      tangent: vertexFormat.tangent,
      bitangent: vertexFormat.normal || vertexFormat.bitangent,
      st: vertexFormat.st,
    });
    const ellipsoid = params.ellipsoid;
    const computedPositions = CorridorGeometryLibrary.CorridorGeometryLibrary.computePositions(params);
    const attr = combine(computedPositions, topVertexFormat, ellipsoid);
    const height = params.height;
    const extrudedHeight = params.extrudedHeight;
    let attributes = attr.attributes;
    const indices = attr.indices;
    let positions = attributes.position.values;
    let length = positions.length;
    const newPositions = new Float64Array(length * 6);
    let extrudedPositions = new Float64Array(length);
    extrudedPositions.set(positions);
    let wallPositions = new Float64Array(length * 4);

    positions = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
      positions,
      height,
      ellipsoid
    );
    wallPositions = addWallPositions(positions, 0, wallPositions);
    extrudedPositions = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
      extrudedPositions,
      extrudedHeight,
      ellipsoid
    );
    wallPositions = addWallPositions(
      extrudedPositions,
      length * 2,
      wallPositions
    );
    newPositions.set(positions);
    newPositions.set(extrudedPositions, length);
    newPositions.set(wallPositions, length * 2);
    attributes.position.values = newPositions;

    attributes = extrudedAttributes(attributes, vertexFormat);
    let i;
    const size = length / 3;
    if (params.shadowVolume) {
      const topNormals = attributes.normal.values;
      length = topNormals.length;

      let extrudeNormals = new Float32Array(length * 6);
      for (i = 0; i < length; i++) {
        topNormals[i] = -topNormals[i];
      }
      //only get normals for bottom layer that's going to be pushed down
      extrudeNormals.set(topNormals, length); //bottom face
      extrudeNormals = addWallPositions(topNormals, length * 4, extrudeNormals); //bottom wall
      attributes.extrudeDirection = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: extrudeNormals,
      });
      if (!vertexFormat.normal) {
        attributes.normal = undefined;
      }
    }
    if (defaultValue.defined(params.offsetAttribute)) {
      let applyOffset = new Uint8Array(size * 6);
      if (params.offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.TOP) {
        applyOffset = applyOffset
          .fill(1, 0, size) // top face
          .fill(1, size * 2, size * 4); // top wall
      } else {
        const applyOffsetValue =
          params.offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE ? 0 : 1;
        applyOffset = applyOffset.fill(applyOffsetValue);
      }
      attributes.applyOffset = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: applyOffset,
      });
    }

    const iLength = indices.length;
    const twoSize = size + size;
    const newIndices = IndexDatatype.IndexDatatype.createTypedArray(
      newPositions.length / 3,
      iLength * 2 + twoSize * 3
    );
    newIndices.set(indices);
    let index = iLength;
    for (i = 0; i < iLength; i += 3) {
      // bottom indices
      const v0 = indices[i];
      const v1 = indices[i + 1];
      const v2 = indices[i + 2];
      newIndices[index++] = v2 + size;
      newIndices[index++] = v1 + size;
      newIndices[index++] = v0 + size;
    }

    let UL, LL, UR, LR;

    for (i = 0; i < twoSize; i += 2) {
      //wall indices
      UL = i + twoSize;
      LL = UL + twoSize;
      UR = UL + 1;
      LR = LL + 1;
      newIndices[index++] = UL;
      newIndices[index++] = LL;
      newIndices[index++] = UR;
      newIndices[index++] = UR;
      newIndices[index++] = LL;
      newIndices[index++] = LR;
    }

    return {
      attributes: attributes,
      indices: newIndices,
    };
  }

  const scratchCartesian1 = new Matrix3.Cartesian3();
  const scratchCartesian2 = new Matrix3.Cartesian3();
  const scratchCartographic = new Matrix3.Cartographic();

  function computeOffsetPoints(
    position1,
    position2,
    ellipsoid,
    halfWidth,
    min,
    max
  ) {
    // Compute direction of offset the point
    const direction = Matrix3.Cartesian3.subtract(
      position2,
      position1,
      scratchCartesian1
    );
    Matrix3.Cartesian3.normalize(direction, direction);
    const normal = ellipsoid.geodeticSurfaceNormal(position1, scratchCartesian2);
    const offsetDirection = Matrix3.Cartesian3.cross(
      direction,
      normal,
      scratchCartesian1
    );
    Matrix3.Cartesian3.multiplyByScalar(offsetDirection, halfWidth, offsetDirection);

    let minLat = min.latitude;
    let minLon = min.longitude;
    let maxLat = max.latitude;
    let maxLon = max.longitude;

    // Compute 2 offset points
    Matrix3.Cartesian3.add(position1, offsetDirection, scratchCartesian2);
    ellipsoid.cartesianToCartographic(scratchCartesian2, scratchCartographic);

    let lat = scratchCartographic.latitude;
    let lon = scratchCartographic.longitude;
    minLat = Math.min(minLat, lat);
    minLon = Math.min(minLon, lon);
    maxLat = Math.max(maxLat, lat);
    maxLon = Math.max(maxLon, lon);

    Matrix3.Cartesian3.subtract(position1, offsetDirection, scratchCartesian2);
    ellipsoid.cartesianToCartographic(scratchCartesian2, scratchCartographic);

    lat = scratchCartographic.latitude;
    lon = scratchCartographic.longitude;
    minLat = Math.min(minLat, lat);
    minLon = Math.min(minLon, lon);
    maxLat = Math.max(maxLat, lat);
    maxLon = Math.max(maxLon, lon);

    min.latitude = minLat;
    min.longitude = minLon;
    max.latitude = maxLat;
    max.longitude = maxLon;
  }

  const scratchCartesianOffset = new Matrix3.Cartesian3();
  const scratchCartesianEnds = new Matrix3.Cartesian3();
  const scratchCartographicMin = new Matrix3.Cartographic();
  const scratchCartographicMax = new Matrix3.Cartographic();

  function computeRectangle(positions, ellipsoid, width, cornerType, result) {
    positions = scaleToSurface(positions, ellipsoid);
    const cleanPositions = arrayRemoveDuplicates.arrayRemoveDuplicates(
      positions,
      Matrix3.Cartesian3.equalsEpsilon
    );
    const length = cleanPositions.length;
    if (length < 2 || width <= 0) {
      return new Matrix2.Rectangle();
    }
    const halfWidth = width * 0.5;

    scratchCartographicMin.latitude = Number.POSITIVE_INFINITY;
    scratchCartographicMin.longitude = Number.POSITIVE_INFINITY;
    scratchCartographicMax.latitude = Number.NEGATIVE_INFINITY;
    scratchCartographicMax.longitude = Number.NEGATIVE_INFINITY;

    let lat, lon;
    if (cornerType === PolylineVolumeGeometryLibrary.CornerType.ROUNDED) {
      // Compute start cap
      const first = cleanPositions[0];
      Matrix3.Cartesian3.subtract(first, cleanPositions[1], scratchCartesianOffset);
      Matrix3.Cartesian3.normalize(scratchCartesianOffset, scratchCartesianOffset);
      Matrix3.Cartesian3.multiplyByScalar(
        scratchCartesianOffset,
        halfWidth,
        scratchCartesianOffset
      );
      Matrix3.Cartesian3.add(first, scratchCartesianOffset, scratchCartesianEnds);

      ellipsoid.cartesianToCartographic(
        scratchCartesianEnds,
        scratchCartographic
      );
      lat = scratchCartographic.latitude;
      lon = scratchCartographic.longitude;
      scratchCartographicMin.latitude = Math.min(
        scratchCartographicMin.latitude,
        lat
      );
      scratchCartographicMin.longitude = Math.min(
        scratchCartographicMin.longitude,
        lon
      );
      scratchCartographicMax.latitude = Math.max(
        scratchCartographicMax.latitude,
        lat
      );
      scratchCartographicMax.longitude = Math.max(
        scratchCartographicMax.longitude,
        lon
      );
    }

    // Compute the rest
    for (let i = 0; i < length - 1; ++i) {
      computeOffsetPoints(
        cleanPositions[i],
        cleanPositions[i + 1],
        ellipsoid,
        halfWidth,
        scratchCartographicMin,
        scratchCartographicMax
      );
    }

    // Compute ending point
    const last = cleanPositions[length - 1];
    Matrix3.Cartesian3.subtract(last, cleanPositions[length - 2], scratchCartesianOffset);
    Matrix3.Cartesian3.normalize(scratchCartesianOffset, scratchCartesianOffset);
    Matrix3.Cartesian3.multiplyByScalar(
      scratchCartesianOffset,
      halfWidth,
      scratchCartesianOffset
    );
    Matrix3.Cartesian3.add(last, scratchCartesianOffset, scratchCartesianEnds);
    computeOffsetPoints(
      last,
      scratchCartesianEnds,
      ellipsoid,
      halfWidth,
      scratchCartographicMin,
      scratchCartographicMax
    );

    if (cornerType === PolylineVolumeGeometryLibrary.CornerType.ROUNDED) {
      // Compute end cap
      ellipsoid.cartesianToCartographic(
        scratchCartesianEnds,
        scratchCartographic
      );
      lat = scratchCartographic.latitude;
      lon = scratchCartographic.longitude;
      scratchCartographicMin.latitude = Math.min(
        scratchCartographicMin.latitude,
        lat
      );
      scratchCartographicMin.longitude = Math.min(
        scratchCartographicMin.longitude,
        lon
      );
      scratchCartographicMax.latitude = Math.max(
        scratchCartographicMax.latitude,
        lat
      );
      scratchCartographicMax.longitude = Math.max(
        scratchCartographicMax.longitude,
        lon
      );
    }

    const rectangle = defaultValue.defined(result) ? result : new Matrix2.Rectangle();
    rectangle.north = scratchCartographicMax.latitude;
    rectangle.south = scratchCartographicMin.latitude;
    rectangle.east = scratchCartographicMax.longitude;
    rectangle.west = scratchCartographicMin.longitude;

    return rectangle;
  }

  /**
   * A description of a corridor. Corridor geometry can be rendered with both {@link Primitive} and {@link GroundPrimitive}.
   *
   * @alias CorridorGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {Cartesian3[]} options.positions An array of positions that define the center of the corridor.
   * @param {Number} options.width The distance between the edges of the corridor in meters.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {Number} [options.height=0] The distance in meters between the ellipsoid surface and the positions.
   * @param {Number} [options.extrudedHeight] The distance in meters between the ellipsoid surface and the extruded face.
   * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
   * @param {CornerType} [options.cornerType=CornerType.ROUNDED] Determines the style of the corners.
   *
   * @see CorridorGeometry.createGeometry
   * @see Packable
   *
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Corridor.html|Cesium Sandcastle Corridor Demo}
   *
   * @example
   * const corridor = new Cesium.CorridorGeometry({
   *   vertexFormat : Cesium.VertexFormat.POSITION_ONLY,
   *   positions : Cesium.Cartesian3.fromDegreesArray([-72.0, 40.0, -70.0, 35.0]),
   *   width : 100000
   * });
   */
  function CorridorGeometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);
    const positions = options.positions;
    const width = options.width;

    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("options.positions", positions);
    Check.Check.defined("options.width", width);
    //>>includeEnd('debug');

    const height = defaultValue.defaultValue(options.height, 0.0);
    const extrudedHeight = defaultValue.defaultValue(options.extrudedHeight, height);

    this._positions = positions;
    this._ellipsoid = Matrix3.Ellipsoid.clone(
      defaultValue.defaultValue(options.ellipsoid, Matrix3.Ellipsoid.WGS84)
    );
    this._vertexFormat = VertexFormat.VertexFormat.clone(
      defaultValue.defaultValue(options.vertexFormat, VertexFormat.VertexFormat.DEFAULT)
    );
    this._width = width;
    this._height = Math.max(height, extrudedHeight);
    this._extrudedHeight = Math.min(height, extrudedHeight);
    this._cornerType = defaultValue.defaultValue(options.cornerType, PolylineVolumeGeometryLibrary.CornerType.ROUNDED);
    this._granularity = defaultValue.defaultValue(
      options.granularity,
      Math$1.CesiumMath.RADIANS_PER_DEGREE
    );
    this._shadowVolume = defaultValue.defaultValue(options.shadowVolume, false);
    this._workerName = "createCorridorGeometry";
    this._offsetAttribute = options.offsetAttribute;
    this._rectangle = undefined;

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    this.packedLength =
      1 +
      positions.length * Matrix3.Cartesian3.packedLength +
      Matrix3.Ellipsoid.packedLength +
      VertexFormat.VertexFormat.packedLength +
      7;
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {CorridorGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  CorridorGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const positions = value._positions;
    const length = positions.length;
    array[startingIndex++] = length;

    for (let i = 0; i < length; ++i, startingIndex += Matrix3.Cartesian3.packedLength) {
      Matrix3.Cartesian3.pack(positions[i], array, startingIndex);
    }

    Matrix3.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
    startingIndex += Matrix3.Ellipsoid.packedLength;

    VertexFormat.VertexFormat.pack(value._vertexFormat, array, startingIndex);
    startingIndex += VertexFormat.VertexFormat.packedLength;

    array[startingIndex++] = value._width;
    array[startingIndex++] = value._height;
    array[startingIndex++] = value._extrudedHeight;
    array[startingIndex++] = value._cornerType;
    array[startingIndex++] = value._granularity;
    array[startingIndex++] = value._shadowVolume ? 1.0 : 0.0;
    array[startingIndex] = defaultValue.defaultValue(value._offsetAttribute, -1);

    return array;
  };

  const scratchEllipsoid = Matrix3.Ellipsoid.clone(Matrix3.Ellipsoid.UNIT_SPHERE);
  const scratchVertexFormat = new VertexFormat.VertexFormat();
  const scratchOptions = {
    positions: undefined,
    ellipsoid: scratchEllipsoid,
    vertexFormat: scratchVertexFormat,
    width: undefined,
    height: undefined,
    extrudedHeight: undefined,
    cornerType: undefined,
    granularity: undefined,
    shadowVolume: undefined,
    offsetAttribute: undefined,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {CorridorGeometry} [result] The object into which to store the result.
   * @returns {CorridorGeometry} The modified result parameter or a new CorridorGeometry instance if one was not provided.
   */
  CorridorGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const length = array[startingIndex++];
    const positions = new Array(length);

    for (let i = 0; i < length; ++i, startingIndex += Matrix3.Cartesian3.packedLength) {
      positions[i] = Matrix3.Cartesian3.unpack(array, startingIndex);
    }

    const ellipsoid = Matrix3.Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
    startingIndex += Matrix3.Ellipsoid.packedLength;

    const vertexFormat = VertexFormat.VertexFormat.unpack(
      array,
      startingIndex,
      scratchVertexFormat
    );
    startingIndex += VertexFormat.VertexFormat.packedLength;

    const width = array[startingIndex++];
    const height = array[startingIndex++];
    const extrudedHeight = array[startingIndex++];
    const cornerType = array[startingIndex++];
    const granularity = array[startingIndex++];
    const shadowVolume = array[startingIndex++] === 1.0;
    const offsetAttribute = array[startingIndex];

    if (!defaultValue.defined(result)) {
      scratchOptions.positions = positions;
      scratchOptions.width = width;
      scratchOptions.height = height;
      scratchOptions.extrudedHeight = extrudedHeight;
      scratchOptions.cornerType = cornerType;
      scratchOptions.granularity = granularity;
      scratchOptions.shadowVolume = shadowVolume;
      scratchOptions.offsetAttribute =
        offsetAttribute === -1 ? undefined : offsetAttribute;

      return new CorridorGeometry(scratchOptions);
    }

    result._positions = positions;
    result._ellipsoid = Matrix3.Ellipsoid.clone(ellipsoid, result._ellipsoid);
    result._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat, result._vertexFormat);
    result._width = width;
    result._height = height;
    result._extrudedHeight = extrudedHeight;
    result._cornerType = cornerType;
    result._granularity = granularity;
    result._shadowVolume = shadowVolume;
    result._offsetAttribute =
      offsetAttribute === -1 ? undefined : offsetAttribute;

    return result;
  };

  /**
   * Computes the bounding rectangle given the provided options
   *
   * @param {Object} options Object with the following properties:
   * @param {Cartesian3[]} options.positions An array of positions that define the center of the corridor.
   * @param {Number} options.width The distance between the edges of the corridor in meters.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   * @param {CornerType} [options.cornerType=CornerType.ROUNDED] Determines the style of the corners.
   * @param {Rectangle} [result] An object in which to store the result.
   *
   * @returns {Rectangle} The result rectangle.
   */
  CorridorGeometry.computeRectangle = function (options, result) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);
    const positions = options.positions;
    const width = options.width;

    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("options.positions", positions);
    Check.Check.defined("options.width", width);
    //>>includeEnd('debug');

    const ellipsoid = defaultValue.defaultValue(options.ellipsoid, Matrix3.Ellipsoid.WGS84);
    const cornerType = defaultValue.defaultValue(options.cornerType, PolylineVolumeGeometryLibrary.CornerType.ROUNDED);

    return computeRectangle(positions, ellipsoid, width, cornerType, result);
  };

  /**
   * Computes the geometric representation of a corridor, including its vertices, indices, and a bounding sphere.
   *
   * @param {CorridorGeometry} corridorGeometry A description of the corridor.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  CorridorGeometry.createGeometry = function (corridorGeometry) {
    let positions = corridorGeometry._positions;
    const width = corridorGeometry._width;
    const ellipsoid = corridorGeometry._ellipsoid;

    positions = scaleToSurface(positions, ellipsoid);
    const cleanPositions = arrayRemoveDuplicates.arrayRemoveDuplicates(
      positions,
      Matrix3.Cartesian3.equalsEpsilon
    );

    if (cleanPositions.length < 2 || width <= 0) {
      return;
    }

    const height = corridorGeometry._height;
    const extrudedHeight = corridorGeometry._extrudedHeight;
    const extrude = !Math$1.CesiumMath.equalsEpsilon(
      height,
      extrudedHeight,
      0,
      Math$1.CesiumMath.EPSILON2
    );

    const vertexFormat = corridorGeometry._vertexFormat;
    const params = {
      ellipsoid: ellipsoid,
      positions: cleanPositions,
      width: width,
      cornerType: corridorGeometry._cornerType,
      granularity: corridorGeometry._granularity,
      saveAttributes: true,
    };
    let attr;
    if (extrude) {
      params.height = height;
      params.extrudedHeight = extrudedHeight;
      params.shadowVolume = corridorGeometry._shadowVolume;
      params.offsetAttribute = corridorGeometry._offsetAttribute;
      attr = computePositionsExtruded(params, vertexFormat);
    } else {
      const computedPositions = CorridorGeometryLibrary.CorridorGeometryLibrary.computePositions(params);
      attr = combine(computedPositions, vertexFormat, ellipsoid);
      attr.attributes.position.values = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
        attr.attributes.position.values,
        height,
        ellipsoid
      );

      if (defaultValue.defined(corridorGeometry._offsetAttribute)) {
        const applyOffsetValue =
          corridorGeometry._offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE
            ? 0
            : 1;
        const length = attr.attributes.position.values.length;
        const applyOffset = new Uint8Array(length / 3).fill(applyOffsetValue);
        attr.attributes.applyOffset = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 1,
          values: applyOffset,
        });
      }
    }
    const attributes = attr.attributes;
    const boundingSphere = Transforms.BoundingSphere.fromVertices(
      attributes.position.values,
      undefined,
      3
    );
    if (!vertexFormat.position) {
      attr.attributes.position.values = undefined;
    }

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: attr.indices,
      primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
      boundingSphere: boundingSphere,
      offsetAttribute: corridorGeometry._offsetAttribute,
    });
  };

  /**
   * @private
   */
  CorridorGeometry.createShadowVolume = function (
    corridorGeometry,
    minHeightFunc,
    maxHeightFunc
  ) {
    const granularity = corridorGeometry._granularity;
    const ellipsoid = corridorGeometry._ellipsoid;

    const minHeight = minHeightFunc(granularity, ellipsoid);
    const maxHeight = maxHeightFunc(granularity, ellipsoid);

    return new CorridorGeometry({
      positions: corridorGeometry._positions,
      width: corridorGeometry._width,
      cornerType: corridorGeometry._cornerType,
      ellipsoid: ellipsoid,
      granularity: granularity,
      extrudedHeight: minHeight,
      height: maxHeight,
      vertexFormat: VertexFormat.VertexFormat.POSITION_ONLY,
      shadowVolume: true,
    });
  };

  Object.defineProperties(CorridorGeometry.prototype, {
    /**
     * @private
     */
    rectangle: {
      get: function () {
        if (!defaultValue.defined(this._rectangle)) {
          this._rectangle = computeRectangle(
            this._positions,
            this._ellipsoid,
            this._width,
            this._cornerType
          );
        }
        return this._rectangle;
      },
    },
    /**
     * For remapping texture coordinates when rendering CorridorGeometries as GroundPrimitives.
     *
     * Corridors don't support stRotation,
     * so just return the corners of the original system.
     * @private
     */
    textureCoordinateRotationPoints: {
      get: function () {
        return [0, 0, 0, 1, 1, 0];
      },
    },
  });

  function createCorridorGeometry(corridorGeometry, offset) {
    if (defaultValue.defined(offset)) {
      corridorGeometry = CorridorGeometry.unpack(corridorGeometry, offset);
    }
    corridorGeometry._ellipsoid = Matrix3.Ellipsoid.clone(corridorGeometry._ellipsoid);
    return CorridorGeometry.createGeometry(corridorGeometry);
  }

  return createCorridorGeometry;

}));

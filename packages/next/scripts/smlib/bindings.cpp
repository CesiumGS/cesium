// The JavaScript-facing layer over SMLib's SM_API (scripts/smlib/README.md).
// SM_API is C++ (overloads, references, SmTArray), so each entry point here is
// a plain C function on numbers and pointers. Breps and meshes are opaque
// pointers the caller frees. No exception crosses into JavaScript: each entry
// catches, records the status (smlib_status) and returns 0 or null.
#include <cstdint>
#include <unordered_map>
#include <vector>

#include <emscripten/emscripten.h>

#include <SmSmlibAll.h>
#include <SmPoly.h>
#include <SmApiBrep.h>
#include <SmApiGeneral.h>
#include <SmApiPrimitives.h>
#include <SmApiQueries.h>

namespace {

// The last entry point's status: 0 on success, SM_API's status on failure,
// -1 for an exception and -2 for invalid input.
long gStatus = 0;

constexpr long kException = -1;
constexpr long kInvalid = -2;

// A tessellated brep, as tessellateBrep's faces: unwelded between faces, each
// vertex carrying its face's index in the brep (SmApiGetFaces order).
struct Mesh {
  std::vector<double> positions;
  std::vector<float> normals;
  std::vector<uint32_t> indices;
  std::vector<uint32_t> featureIds;
};

template <typename F>
auto guarded(F&& f) -> decltype(f()) {
  try {
    return f();
  } catch (...) {
    gStatus = kException;
    return decltype(f())();
  }
}

SmBrep* checked(SmApiStatus status, SmBrep* brep) {
  gStatus = status;
  if (status != SM_SUCCESS) {
    delete brep;
    return nullptr;
  }
  return brep;
}

SmVector3d unitOr(const SmVector3d& v, const SmVector3d& fallback) {
  const double length = v.Length();
  return length > 1e-30 ? v / length : fallback;
}

// The vertex's normal on `face`, else the mean of its normals.
SmVector3d normalOn(SmPolyVertex* vertex, SmFace* face) {
  const auto& normals = vertex->GetNormalsRef();
  const auto& faces = vertex->GetFacesRef();
  for (ULONG i = 0; i < faces.GetSize() && i < normals.GetSize(); ++i) {
    if (faces[i] == static_cast<SmTopology*>(face)) {
      return unitOr(normals[i], SmVector3d(0, 0, 1));
    }
  }
  SmVector3d sum(0, 0, 0);
  for (ULONG i = 0; i < normals.GetSize(); ++i) {
    sum += normals[i];
  }
  return unitOr(sum, SmVector3d(0, 0, 1));
}

}  // namespace

extern "C" {

/** The last call's status: 0 is success. */
EMSCRIPTEN_KEEPALIVE long smlib_status() { return gStatus; }

/** Creates SMLib's default context; call once before anything else. */
EMSCRIPTEN_KEEPALIVE int smlib_init() {
  return guarded([] {
    SmApiCreateContext();
    gStatus = SM_SUCCESS;
    return 1;
  });
}

EMSCRIPTEN_KEEPALIVE SmBrep* smlib_box(double x, double y, double z,
                                       double length, double width,
                                       double height) {
  return guarded([&] {
    SmBrep* brep = nullptr;
    return checked(
        SmApiCreateBox(SmVector3d(x, y, z), length, width, height, brep),
        brep);
  });
}

EMSCRIPTEN_KEEPALIVE SmBrep* smlib_cylinder(double x, double y, double z,
                                            double radius, double height) {
  return guarded([&] {
    SmBrep* brep = nullptr;
    return checked(
        SmApiCreateCylinder(SmVector3d(x, y, z), radius, height, brep), brep);
  });
}

EMSCRIPTEN_KEEPALIVE SmBrep* smlib_cone(double x, double y, double z,
                                        double radiusBase, double radiusTop,
                                        double height) {
  return guarded([&] {
    SmBrep* brep = nullptr;
    return checked(SmApiCreateCone(SmVector3d(x, y, z), radiusBase, radiusTop,
                                   height, brep),
                   brep);
  });
}

EMSCRIPTEN_KEEPALIVE SmBrep* smlib_sphere(double x, double y, double z,
                                          double radius) {
  return guarded([&] {
    SmBrep* brep = nullptr;
    return checked(SmApiCreateSphere(SmVector3d(x, y, z), radius, brep), brep);
  });
}

EMSCRIPTEN_KEEPALIVE SmBrep* smlib_torus(double x, double y, double z,
                                         double radiusMajor,
                                         double radiusMinor) {
  return guarded([&] {
    SmBrep* brep = nullptr;
    return checked(SmApiCreateTorus(SmVector3d(x, y, z), radiusMajor,
                                    radiusMinor, brep),
                   brep);
  });
}

/** Moves the brep in place. Returns 1 on success. */
EMSCRIPTEN_KEEPALIVE int smlib_translate(SmBrep* brep, double dx, double dy,
                                         double dz) {
  return guarded([&] {
    if (!brep) {
      gStatus = kInvalid;
      return 0;
    }
    gStatus = SmApiTranslate(brep, SmVector3d(dx, dy, dz));
    return gStatus == SM_SUCCESS ? 1 : 0;
  });
}

/**
 * A boolean of `a` and `b`: 0 union, 1 difference (a - b), 2 intersection.
 * On success it returns `a`, changed in place, and `b` is deleted. On failure
 * it returns null and both stay allocated (possibly changed); the caller
 * deletes them.
 */
EMSCRIPTEN_KEEPALIVE SmBrep* smlib_boolean(int operation, SmBrep* a,
                                           SmBrep* b) {
  return guarded([&]() -> SmBrep* {
    if (!a || !b || a == b) {
      gStatus = kInvalid;
      return nullptr;
    }
    SmBrep* result = nullptr;
    switch (operation) {
      case 0:
        gStatus = SmApiBooleanUnion(a, b, result);
        break;
      case 1:
        gStatus = SmApiBooleanDifference(a, b, result);
        break;
      case 2:
        gStatus = SmApiBooleanIntersection(a, b, result);
        break;
      default:
        gStatus = kInvalid;
        return nullptr;
    }
    return gStatus == SM_SUCCESS ? result : nullptr;
  });
}

EMSCRIPTEN_KEEPALIVE void smlib_brep_delete(SmBrep* brep) { delete brep; }

EMSCRIPTEN_KEEPALIVE int smlib_brep_face_count(SmBrep* brep) {
  return guarded([&] {
    SmTArray<SmFace*> faces;
    gStatus = brep ? SmApiGetFaces(brep, faces) : kInvalid;
    return gStatus == SM_SUCCESS ? static_cast<int>(faces.GetSize()) : -1;
  });
}

/** 1 if the brep is a manifold solid, 0 if not, -1 on failure. */
EMSCRIPTEN_KEEPALIVE int smlib_brep_is_manifold_solid(SmBrep* brep) {
  return guarded([&] {
    SmBoolean solid = FALSE;
    gStatus = brep ? SmApiBrepIsManifoldSolid(brep, solid) : kInvalid;
    return gStatus == SM_SUCCESS ? (solid ? 1 : 0) : -1;
  });
}

/** The enclosed volume, or NaN on failure. */
EMSCRIPTEN_KEEPALIVE double smlib_brep_volume(SmBrep* brep,
                                              double relativeAccuracy) {
  return guarded([&] {
    double volume = 0.0;
    gStatus = brep ? SmApiBrepComputeVolume(brep, relativeAccuracy, volume)
                   : kInvalid;
    return gStatus == SM_SUCCESS ? volume : __builtin_nan("");
  });
}

/**
 * Tessellates the brep. Each tolerance is SmTessellationParams' and 0 turns
 * it off: chord height and the longest edge in the brep's units, angles in
 * degrees. Returns a mesh the caller frees with smlib_mesh_delete.
 */
EMSCRIPTEN_KEEPALIVE Mesh* smlib_tessellate(SmBrep* brep, double chordHeight,
                                            double curveAngleDeg,
                                            double surfaceAngleDeg,
                                            double maxEdgeLength) {
  return guarded([&]() -> Mesh* {
    if (!brep) {
      gStatus = kInvalid;
      return nullptr;
    }
    SmTArray<SmFace*> faces;
    gStatus = SmApiGetFaces(brep, faces);
    if (gStatus != SM_SUCCESS) {
      return nullptr;
    }
    std::unordered_map<SmFace*, uint32_t> faceIndex;
    for (ULONG i = 0; i < faces.GetSize(); ++i) {
      faceIndex[faces[i]] = static_cast<uint32_t>(i);
    }

    SmTessellationParams params;
    params.dChordHeightTol = chordHeight;
    params.dCurveAngleTolDeg = curveAngleDeg;
    params.dSurfaceAngleTolDeg = surfaceAngleDeg;
    params.dMaxEdgeLength = maxEdgeLength;
    SmPolyBrep* poly = nullptr;
    gStatus = SmApiTessellate(brep, poly, params);
    if (gStatus != SM_SUCCESS || !poly) {
      delete poly;
      return nullptr;
    }

    auto* mesh = new Mesh();
    SmTArray<SmPolyFace*> polyFaces;
    poly->GetPolyFaces(polyFaces);
    // One vertex per (poly vertex, face), so faces don't share normals.
    std::unordered_map<SmPolyVertex*, uint32_t> vertexOnFace;
    SmFace* currentFace = nullptr;
    for (ULONG f = 0; f < polyFaces.GetSize(); ++f) {
      SmPolyFace* polyFace = polyFaces[f];
      SmFace* face = polyFace->GetOriginalFace();
      if (face != currentFace) {
        vertexOnFace.clear();
        currentFace = face;
      }
      const auto found = faceIndex.find(face);
      const uint32_t id =
          found == faceIndex.end() ? UINT32_MAX : found->second;
      SmPolyLoop* loop = polyFace->GetOuterPolyLoop();
      if (!loop) {
        continue;
      }
      SmTArray<SmPolyEdge*> edges;
      loop->GetPolyEdges(edges);
      std::vector<uint32_t> corners;
      corners.reserve(edges.GetSize());
      for (ULONG e = 0; e < edges.GetSize(); ++e) {
        SmPolyVertex* vertex = edges[e]->GetStartPolyVertex();
        auto [it, added] = vertexOnFace.try_emplace(
            vertex, static_cast<uint32_t>(mesh->featureIds.size()));
        if (added) {
          const SmPoint3d& p = vertex->GetPoint();
          const SmVector3d n = normalOn(vertex, face);
          mesh->positions.insert(mesh->positions.end(), {p.x, p.y, p.z});
          mesh->normals.insert(mesh->normals.end(),
                               {static_cast<float>(n.x),
                                static_cast<float>(n.y),
                                static_cast<float>(n.z)});
          mesh->featureIds.push_back(id);
        }
        corners.push_back(it->second);
      }
      // Tessellation gives triangles; fan anything larger.
      for (size_t c = 1; c + 1 < corners.size(); ++c) {
        mesh->indices.insert(mesh->indices.end(),
                             {corners[0], corners[c], corners[c + 1]});
      }
    }
    delete poly;
    return mesh;
  });
}

EMSCRIPTEN_KEEPALIVE void smlib_mesh_delete(Mesh* mesh) { delete mesh; }

EMSCRIPTEN_KEEPALIVE int smlib_mesh_vertex_count(const Mesh* mesh) {
  return static_cast<int>(mesh->featureIds.size());
}

EMSCRIPTEN_KEEPALIVE int smlib_mesh_index_count(const Mesh* mesh) {
  return static_cast<int>(mesh->indices.size());
}

/** 3 doubles per vertex. */
EMSCRIPTEN_KEEPALIVE const double* smlib_mesh_positions(const Mesh* mesh) {
  return mesh->positions.data();
}

/** 3 floats per vertex. */
EMSCRIPTEN_KEEPALIVE const float* smlib_mesh_normals(const Mesh* mesh) {
  return mesh->normals.data();
}

EMSCRIPTEN_KEEPALIVE const uint32_t* smlib_mesh_indices(const Mesh* mesh) {
  return mesh->indices.data();
}

/** Each vertex's face index in the brep (UINT32_MAX if unknown). */
EMSCRIPTEN_KEEPALIVE const uint32_t* smlib_mesh_feature_ids(const Mesh* mesh) {
  return mesh->featureIds.data();
}

}  // extern "C"

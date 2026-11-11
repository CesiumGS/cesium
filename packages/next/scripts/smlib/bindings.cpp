// The JavaScript-facing layer over SMLib's SM_API (scripts/smlib/README.md).
// SM_API is C++ (overloads, references, SmTArray), so each entry point here is
// a plain C function on numbers and pointers. Breps and meshes are opaque
// pointers the caller frees. No exception crosses into JavaScript: each entry
// catches, records the status (smlib_status) and returns 0 or null.
#include <algorithm>
#include <cstdint>
#include <memory>
#include <unordered_map>
#include <vector>

#include <emscripten/emscripten.h>

#include <SmSmlibAll.h>
#include <SmPoly.h>
#include <nurbs.h>
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
// Unsupported geometry in an export: a surface with no exact B-spline form.
constexpr long kUnsupported = -3;

// An application attribute (ids above 10000 are the application's) holding
// the tag smlib_brep_tag_faces gave a face. SM_AB_COPY attributes are copied
// to the pieces of a face a boolean splits.
constexpr ULONG kTagAttribute = 10001;

// The version of smlib_brep_export's layout (scripts/smlib/README.md).
constexpr double kExportVersion = 1;

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

// A flat record of a brep for smlib_brep_export, all doubles.
struct Export {
  std::vector<double> data;
};

// NLib marks a non-rational point's w with NL_NOW; its x, y, z are then
// Cartesian, else homogeneous.
void putPoint(std::vector<double>& out, const NL_CPOINT& p, int dimension) {
  const bool rational = p.w != NL_NOW;
  const double w = rational ? p.w : 1.0;
  out.push_back(p.x / w);
  out.push_back(p.y / w);
  if (dimension == 3) {
    out.push_back(p.z / w);
  }
  out.push_back(w);
}

// degree, count, knot count, knots, then count × (dimension + 1): Cartesian
// coordinates and weight.
void putCurve(std::vector<double>& out, SmBSplineCurve* curve, int dimension) {
  gw_CURVE* nurb = curve->GetOrCreateGwNurbPointer();
  const ULONG knots = nurb->knt->m + 1;
  const ULONG count = nurb->pol->n + 1;
  out.push_back(nurb->p);
  out.push_back(count);
  out.push_back(knots);
  for (ULONG i = 0; i < knots; ++i) {
    out.push_back(nurb->knt->U[i]);
  }
  for (ULONG i = 0; i < count; ++i) {
    putPoint(out, nurb->pol->Pw[i], dimension);
  }
}

// degree u, degree v, count u, count v, knot counts and knots in u then v,
// then countU × countV × 4 with u fastest.
void putSurface(std::vector<double>& out, SmBSplineSurface* surface) {
  NL_SURFACE* nurb = surface->GetOrCreateGwNurbPointer();
  const ULONG countU = nurb->net->n + 1;
  const ULONG countV = nurb->net->m + 1;
  const ULONG knotsU = nurb->knu->m + 1;
  const ULONG knotsV = nurb->knv->m + 1;
  out.insert(out.end(), {static_cast<double>(nurb->p),
                         static_cast<double>(nurb->q),
                         static_cast<double>(countU),
                         static_cast<double>(countV)});
  out.push_back(knotsU);
  for (ULONG i = 0; i < knotsU; ++i) {
    out.push_back(nurb->knu->U[i]);
  }
  out.push_back(knotsV);
  for (ULONG i = 0; i < knotsV; ++i) {
    out.push_back(nurb->knv->U[i]);
  }
  for (ULONG v = 0; v < countV; ++v) {
    for (ULONG u = 0; u < countU; ++u) {
      putPoint(out, nurb->net->Pw[u][v], 3);
    }
  }
}

// The tag smlib_brep_tag_faces gave a face, or -1.
double tagOf(const SmFace* face) {
  auto* tag =
      static_cast<SmLongAttribute*>(face->FindAttribute(kTagAttribute));
  return tag ? static_cast<double>(tag->GetValue()) : -1.0;
}

// 1 when the face's outward side is its surface's normal side, 0 when it's
// the other side, -1 when neither faceuse bounds a void (not a solid). A
// faceuse's normal points to its own side, and the solid's outside is the
// void region that side's shell bounds.
double outwardSame(SmFace* face) {
  SmFaceuse* uses[2] = {nullptr, nullptr};
  face->GetFaceuses(uses[0], uses[1]);
  for (SmFaceuse* use : uses) {
    SmRegion* region = use ? use->GetRegion() : nullptr;
    if (region && region->IsVoid()) {
      return use->GetOrientation() == SM_OT_SAME ? 1.0 : 0.0;
    }
  }
  return -1.0;
}

// Every face-side edge use's UV trim curve, made where it's missing, as
// SmBrep::CreateUVTrimCurvesParallel does (that one is only built with TBB).
SmStatus ensureUVTrimCurves(SmBrep* brep) {
  SmTArray<SmFace*> faces;
  SmStatus status = SmApiGetFaces(brep, faces);
  for (ULONG f = 0; status == SM_SUCCESS && f < faces.GetSize(); ++f) {
    SmTArray<SmEdgeuse*> uses;
    faces[f]->GetUpwardEdgeuses(uses);
    for (ULONG u = 0; status == SM_SUCCESS && u < uses.GetSize(); ++u) {
      SmCurve* curve = nullptr;
      double distance = 0.0;
      double deviation = 0.0;
      status = uses[u]->GetOrCreateUVTrimCurve(curve, &distance, &deviation,
                                               TRUE);
    }
  }
  return status;
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

/**
 * Tags every face of the brep with `tag` (an application attribute), so the
 * faces a boolean makes from them can say where they came from. Returns 1.
 */
EMSCRIPTEN_KEEPALIVE int smlib_brep_tag_faces(SmBrep* brep, long tag) {
  return guarded([&] {
    SmTArray<SmFace*> faces;
    gStatus = brep ? SmApiGetFaces(brep, faces) : kInvalid;
    if (gStatus != SM_SUCCESS) {
      return 0;
    }
    const SmContext& context = *SmApiGetOrCreateContext();
    for (ULONG i = 0; i < faces.GetSize(); ++i) {
      if (SmAttribute* old = faces[i]->FindAttribute(kTagAttribute)) {
        faces[i]->RemoveAttribute(old);
      }
      faces[i]->AddAttribute(
          new (context) SmLongAttribute(kTagAttribute, tag, SM_AB_COPY));
    }
    return 1;
  });
}

/**
 * The brep's topology and exact geometry as one record of doubles, for the
 * TypeScript reader (src/brep/smlib.ts) to build a BrepForm from. Every
 * surface and curve is a NURBS, as SMLib holds it: its analytic surfaces are
 * B-splines, and trim curves live in their NURBS parameterization.
 *
 *   header   version, surfaces, vertices, edges, faces, loops, uses,
 *            the largest gap from approximating a curve (m)
 *   surface  degree u, degree v, count u, count v, knot count u, knots u,
 *            knot count v, knots v, then count u × count v × (x, y, z, w),
 *            u fastest
 *   vertex   x, y, z, tolerance
 *   edge     start vertex, end vertex, t0, t1, tolerance, then its 3D
 *            curve: degree, count, knot count, knots, count × (x, y, z, w).
 *            The edge runs over [t0, t1] of the curve.
 *   face     surface, outward (1: the surface's normal side, 0: the other,
 *            -1: not known), tag (-1 for none), first loop, loop count.
 *            The first loop is the outer one.
 *   loop     first use, use count
 *   use      type (0 an edge, 3 a pole), edge or vertex, same (1 when the
 *            use runs along its edge), then its UV curve oriented as the
 *            edge: has curve (0 or 1), degree, count, knot count, knots,
 *            count × (u, v, w)
 *
 * Returns null and sets the status on failure.
 */
EMSCRIPTEN_KEEPALIVE Export* smlib_brep_export(SmBrep* brep) {
  return guarded([&]() -> Export* {
    if (!brep) {
      gStatus = kInvalid;
      return nullptr;
    }
    gStatus = ensureUVTrimCurves(brep);
    if (gStatus != SM_SUCCESS) {
      return nullptr;
    }
    SmBrepData data;
    SmTArray<SmAttribute*> attributes;
    gStatus = data.FromBrep(*brep, attributes);
    if (gStatus != SM_SUCCESS) {
      return nullptr;
    }
    const SmContext& context = *SmApiGetOrCreateContext();
    auto out = std::make_unique<Export>();
    std::vector<double>& d = out->data;
    const ULONG surfaces = data.m_vSurfaces.GetSize();
    const ULONG vertices = data.m_vVertices.GetSize();
    const ULONG edges = data.m_vEdges.GetSize();
    const ULONG faces = data.m_vFaces.GetSize();
    const ULONG loops = data.m_vLoops.GetSize();
    const ULONG uses = data.m_vEdgeuses.GetSize();
    d.insert(d.end(), {kExportVersion, static_cast<double>(surfaces),
                       static_cast<double>(vertices),
                       static_cast<double>(edges), static_cast<double>(faces),
                       static_cast<double>(loops), static_cast<double>(uses),
                       0.0});
    const size_t gapAt = d.size() - 1;

    for (ULONG i = 0; i < surfaces; ++i) {
      SmSurface* surface = data.m_vSurfaces[i];
      if (!surface || !surface->IsKindOf(SmBSplineSurface_TYPE)) {
        gStatus = kUnsupported;
        return nullptr;
      }
      putSurface(d, static_cast<SmBSplineSurface*>(surface));
    }

    for (ULONG i = 0; i < vertices; ++i) {
      const SmVertexData& vertex = data.m_vVertices[i];
      const double tolerance =
          vertex.m_pVertex ? static_cast<double>(vertex.m_pVertex->GetTolerance())
                           : 0.0;
      d.insert(d.end(), {vertex.m_vPoint.x, vertex.m_vPoint.y,
                         vertex.m_vPoint.z, tolerance});
    }

    for (ULONG i = 0; i < edges; ++i) {
      const SmEdgeData& edge = data.m_vEdges[i];
      SmCurve* curve = data.m_v3DCurves[edge.m_lCurve];
      double t0 = edge.m_vInterval.GetMin();
      double t1 = edge.m_vInterval.GetMax();
      double tolerance =
          edge.m_pEdge ? static_cast<double>(edge.m_pEdge->GetTolerance()) : 0.0;
      SmBSplineCurve* bspline = nullptr;
      std::unique_ptr<SmBSplineCurve> approximation;
      if (curve && curve->IsKindOf(SmBSplineCurve_TYPE)) {
        bspline = static_cast<SmBSplineCurve*>(curve);
      } else if (curve) {
        // As usd-brep does for curves that aren't B-splines (intersection
        // curves on surfaces): approximate over the edge, and widen the
        // edge's tolerance by the gap.
        SmTArray<double> breaks;
        breaks.Add(t0);
        breaks.Add(t1);
        double gap = 0.0;
        gStatus = curve->ApproximateCurve(context, breaks, SM_APPROX_TOL_3D,
                                          gap, bspline);
        if (gStatus != SM_SUCCESS || !bspline) {
          return nullptr;
        }
        approximation.reset(bspline);
        gw_CURVE* nurb = bspline->GetOrCreateGwNurbPointer();
        t0 = nurb->knt->U[0];
        t1 = nurb->knt->U[nurb->knt->m];
        tolerance = std::max(tolerance, gap);
        d[gapAt] = std::max(d[gapAt], gap);
      } else {
        gStatus = kUnsupported;
        return nullptr;
      }
      d.insert(d.end(), {static_cast<double>(edge.m_lStartVertex),
                         static_cast<double>(edge.m_lEndVertex), t0, t1,
                         tolerance});
      putCurve(d, bspline, 3);
    }

    for (ULONG i = 0; i < faces; ++i) {
      const SmFaceData& face = data.m_vFaces[i];
      d.insert(d.end(),
               {static_cast<double>(face.m_lSurface),
                face.m_pFace ? outwardSame(face.m_pFace) : -1.0,
                face.m_pFace ? tagOf(face.m_pFace) : -1.0,
                static_cast<double>(face.m_lStartLoop),
                static_cast<double>(face.m_lNumLoops)});
    }

    for (ULONG i = 0; i < loops; ++i) {
      const SmLoopData& loop = data.m_vLoops[i];
      const bool edgeLoop = loop.m_lLoopType == 0;
      d.insert(d.end(), {edgeLoop ? static_cast<double>(loop.m_lStartEU) : 0.0,
                         edgeLoop ? static_cast<double>(loop.m_lNumEU) : 0.0});
    }

    const ULONG uvCurves = data.m_vUVCurves.GetSize();
    for (ULONG i = 0; i < uses; ++i) {
      const SmEUData& use = data.m_vEdgeuses[i];
      const bool onEdge = use.m_lEUType == 0;
      d.insert(d.end(),
               {static_cast<double>(use.m_lEUType),
                static_cast<double>(onEdge ? use.m_lEdge : use.m_lVertex),
                use.m_bOrientation == TRUE ? 1.0 : 0.0});
      SmCurve* uv =
          use.m_lUVCurve < uvCurves ? data.m_vUVCurves[use.m_lUVCurve] : nullptr;
      if (uv && uv->IsKindOf(SmBSplineCurve_TYPE)) {
        d.push_back(1);
        putCurve(d, static_cast<SmBSplineCurve*>(uv), 2);
      } else {
        d.push_back(0);
      }
    }
    return out.release();
  });
}

EMSCRIPTEN_KEEPALIVE void smlib_export_delete(Export* record) { delete record; }

EMSCRIPTEN_KEEPALIVE int smlib_export_length(const Export* record) {
  return static_cast<int>(record->data.size());
}

EMSCRIPTEN_KEEPALIVE const double* smlib_export_data(const Export* record) {
  return record->data.data();
}

}  // extern "C"

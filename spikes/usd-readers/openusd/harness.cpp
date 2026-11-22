// OpenUSD in WebAssembly, for CS-900's comparison only: opens a stage from
// emscripten's in-memory file system and describes it as the prim records
// spikes/usd-readers/facts.ts counts. Built outside the repository by
// build.sh against an OpenUSD 26.11.1 wasm build; nothing here ships.
//
//   cs_open(path)  opens the stage with every payload loaded; returns the
//                  number of composed prims, or -1.
//   cs_describe()  the open stage as JSON: { upAxis, metersPerUnit,
//                  defaultPrim, prims: [...], errors: [...] }.
//   cs_close()     drops the stage.

#include <emscripten/emscripten.h>

#include <pxr/base/tf/diagnosticMgr.h>
#include <pxr/base/tf/errorMark.h>
#include <pxr/base/vt/array.h>
#include <pxr/usd/sdf/assetPath.h>
#include <pxr/usd/sdf/layer.h>
#include <pxr/usd/usd/attribute.h>
#include <pxr/usd/usd/prim.h>
#include <pxr/usd/usd/primRange.h>
#include <pxr/usd/usd/relationship.h>
#include <pxr/usd/usd/stage.h>
#include <pxr/usd/usd/tokens.h>
#include <pxr/usd/sdf/listOp.h>

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <sstream>
#include <string>

PXR_NAMESPACE_USING_DIRECTIVE

namespace {

UsdStageRefPtr g_stage;
std::string g_json;
std::vector<std::string> g_errors;

/**
 * Prints Tf's diagnostics to stderr: a fatal error's message never reaches
 * stderr otherwise here, because Arch's crash report can't make its file.
 */
class Printer : public TfDiagnosticMgr::Delegate {
public:
    void IssueError(const TfError &e) override {
        std::fprintf(stderr, "error: %s\n", e.GetCommentary().c_str());
    }
    void IssueFatalError(const TfCallContext &context,
                         const std::string &msg) override {
        std::fprintf(stderr, "fatal: %s (%s:%zu)\n", msg.c_str(),
                     context.GetFile(), context.GetLine());
    }
    void IssueStatus(const TfStatus &) override {}
    void IssueWarning(const TfWarning &w) override {
        std::fprintf(stderr, "warning: %s\n", w.GetCommentary().c_str());
    }
};

void InstallPrinter() {
    static Printer printer;
    static bool installed = false;
    if (!installed) {
        TfDiagnosticMgr::GetInstance().AddDelegate(&printer);
        installed = true;
    }
}

/** Token arrays longer than this are counted, not kept (as facts.ts). */
constexpr size_t SHORT = 64;

void Quote(std::ostringstream &o, const std::string &s) {
    o << '"';
    for (const unsigned char c : s) {
        switch (c) {
        case '"': o << "\\\""; break;
        case '\\': o << "\\\\"; break;
        case '\n': o << "\\n"; break;
        case '\r': o << "\\r"; break;
        case '\t': o << "\\t"; break;
        default:
            if (c < 0x20) {
                char buf[8];
                std::snprintf(buf, sizeof buf, "\\u%04x", c);
                o << buf;
            } else {
                o << c;
            }
        }
    }
    o << '"';
}

void Number(std::ostringstream &o, double v) {
    // JSON has no infinity or NaN (joint limits can be inf).
    if (!std::isfinite(v)) {
        o << "null";
        return;
    }
    char buf[32];
    std::snprintf(buf, sizeof buf, "%.17g", v);
    o << buf;
}

template <class T>
bool IntArray(std::ostringstream &o, const VtValue &v) {
    if (!v.IsHolding<VtArray<T>>()) {
        return false;
    }
    const auto &a = v.UncheckedGet<VtArray<T>>();
    double sum = 0;
    for (const T x : a) {
        sum += static_cast<double>(x);
    }
    o << ",\"count\":" << a.size() << ",\"sum\":";
    Number(o, sum);
    return true;
}

/** One attribute's record fields after "type": count, sum, value. */
void Value(std::ostringstream &o, const VtValue &v) {
    if (v.IsArrayValued()) {
        if (IntArray<int>(o, v) || IntArray<unsigned int>(o, v) ||
            IntArray<int64_t>(o, v) || IntArray<uint64_t>(o, v)) {
            return;
        }
        if (v.IsHolding<VtTokenArray>()) {
            const auto &a = v.UncheckedGet<VtTokenArray>();
            o << ",\"count\":" << a.size();
            if (a.size() <= SHORT) {
                o << ",\"value\":[";
                for (size_t i = 0; i < a.size(); i++) {
                    if (i) o << ',';
                    Quote(o, a[i].GetString());
                }
                o << ']';
            }
            return;
        }
        if (v.IsHolding<VtStringArray>()) {
            const auto &a = v.UncheckedGet<VtStringArray>();
            o << ",\"count\":" << a.size();
            if (a.size() <= SHORT) {
                o << ",\"value\":[";
                for (size_t i = 0; i < a.size(); i++) {
                    if (i) o << ',';
                    Quote(o, a[i]);
                }
                o << ']';
            }
            return;
        }
        o << ",\"count\":" << v.GetArraySize();
        return;
    }
    if (v.IsHolding<TfToken>()) {
        o << ",\"value\":";
        Quote(o, v.UncheckedGet<TfToken>().GetString());
    } else if (v.IsHolding<std::string>()) {
        o << ",\"value\":";
        Quote(o, v.UncheckedGet<std::string>());
    } else if (v.IsHolding<SdfAssetPath>()) {
        o << ",\"value\":";
        Quote(o, v.UncheckedGet<SdfAssetPath>().GetAssetPath());
    } else if (v.IsHolding<bool>()) {
        o << ",\"value\":" << (v.UncheckedGet<bool>() ? "true" : "false");
    } else if (v.IsHolding<float>()) {
        o << ",\"value\":";
        Number(o, v.UncheckedGet<float>());
    } else if (v.IsHolding<double>()) {
        o << ",\"value\":";
        Number(o, v.UncheckedGet<double>());
    } else if (v.IsHolding<int>()) {
        o << ",\"value\":" << v.UncheckedGet<int>();
    }
}

void Describe() {
    std::ostringstream o;
    const SdfLayerHandle root = g_stage->GetRootLayer();
    o << "{\"upAxis\":";
    TfToken up;
    if (g_stage->HasAuthoredMetadata(TfToken("upAxis")) &&
        g_stage->GetMetadata(TfToken("upAxis"), &up)) {
        Quote(o, up.GetString());
    } else {
        o << "null";
    }
    o << ",\"metersPerUnit\":";
    double mpu = 0;
    if (g_stage->HasAuthoredMetadata(TfToken("metersPerUnit")) &&
        g_stage->GetMetadata(TfToken("metersPerUnit"), &mpu)) {
        Number(o, mpu);
    } else {
        o << "null";
    }
    o << ",\"defaultPrim\":";
    const TfToken dp = root->GetDefaultPrim();
    if (dp.IsEmpty()) {
        o << "null";
    } else {
        Quote(o, dp.GetString());
    }
    o << ",\"prims\":[";
    bool firstPrim = true;
    // Instance proxies too: the other readers compose instanceable prims in place.
    for (const UsdPrim &prim : UsdPrimRange::Stage(
             g_stage, UsdTraverseInstanceProxies(UsdPrimDefaultPredicate))) {
        if (!firstPrim) o << ',';
        firstPrim = false;
        o << "{\"path\":";
        Quote(o, prim.GetPath().GetString());
        o << ",\"typeName\":";
        Quote(o, prim.GetTypeName().GetString());
        o << ",\"apiSchemas\":[";
        // The composed, authored list (as the other readers see the data),
        // then any the schema registry adds: GetAppliedSchemas alone leaves
        // out schemas it doesn't know, such as Isaac's SemanticsAPI.
        TfTokenVector schemas;
        SdfTokenListOp authored;
        if (prim.GetMetadata(UsdTokens->apiSchemas, &authored)) {
            authored.ApplyOperations(&schemas);
        }
        for (const TfToken &t : prim.GetAppliedSchemas()) {
            if (std::find(schemas.begin(), schemas.end(), t) == schemas.end()) {
                schemas.push_back(t);
            }
        }
        for (size_t i = 0; i < schemas.size(); i++) {
            if (i) o << ',';
            Quote(o, schemas[i].GetString());
        }
        o << "],\"attrs\":{";
        bool firstAttr = true;
        for (const UsdAttribute &a : prim.GetAuthoredAttributes()) {
            const bool connected = a.HasAuthoredConnections();
            VtValue v;
            const bool hasValue = a.HasAuthoredValue() &&
                                  a.Get(&v, UsdTimeCode::Default()) &&
                                  !v.IsEmpty();
            if (!hasValue && !connected) {
                continue;
            }
            if (!firstAttr) o << ',';
            firstAttr = false;
            Quote(o, a.GetName().GetString());
            o << ":{\"type\":";
            Quote(o, a.GetTypeName().GetAsToken().GetString());
            if (hasValue) {
                Value(o, v);
            }
            if (connected) {
                o << ",\"connection\":true";
            }
            o << '}';
        }
        o << "},\"rels\":{";
        bool firstRel = true;
        for (const UsdRelationship &r : prim.GetAuthoredRelationships()) {
            SdfPathVector targets;
            r.GetTargets(&targets);
            if (!firstRel) o << ',';
            firstRel = false;
            Quote(o, r.GetName().GetString());
            o << ":[";
            for (size_t i = 0; i < targets.size(); i++) {
                if (i) o << ',';
                Quote(o, targets[i].GetString());
            }
            o << ']';
        }
        o << "}}";
    }
    o << "],\"errors\":[";
    for (size_t i = 0; i < g_errors.size(); i++) {
        if (i) o << ',';
        Quote(o, g_errors[i]);
    }
    o << "]}";
    g_json = o.str();
}

} // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE int cs_open(const char *path) {
    InstallPrinter();
    g_stage = nullptr;
    g_json.clear();
    g_errors.clear();
    TfErrorMark mark;
    g_stage = UsdStage::Open(std::string(path), UsdStage::LoadAll);
    for (const TfError &e : mark) {
        g_errors.push_back(e.GetCommentary());
    }
    mark.Clear();
    if (!g_stage) {
        return -1;
    }
    for (const PcpErrorBasePtr &e : g_stage->GetCompositionErrors()) {
        g_errors.push_back(e->ToString());
    }
    int n = 0;
    for (const UsdPrim &prim : UsdPrimRange::Stage(
             g_stage, UsdTraverseInstanceProxies(UsdPrimDefaultPredicate))) {
        (void)prim;
        n++;
    }
    return n;
}

EMSCRIPTEN_KEEPALIVE const char *cs_describe() {
    if (!g_stage) {
        return "{\"error\":\"no stage\"}";
    }
    Describe();
    return g_json.c_str();
}

EMSCRIPTEN_KEEPALIVE void cs_close() {
    g_stage = nullptr;
    g_json.clear();
    g_errors.clear();
}

} // extern "C"

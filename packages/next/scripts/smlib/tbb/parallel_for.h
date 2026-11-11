// A serial stand-in for the parts of oneTBB SMLib uses (scripts/smlib/
// README.md): parallel_for over an index range, run in order on the
// calling thread, and task_arena, whose execute runs its function at once.
// SMLib runs one thread per worker in WebAssembly, so nothing here is
// concurrent.
#ifndef CESIUM_SMLIB_TBB_PARALLEL_FOR_H
#define CESIUM_SMLIB_TBB_PARALLEL_FOR_H

namespace tbb {

class task_arena {
 public:
  template <typename F>
  auto execute(F&& f) -> decltype(f()) {
    return f();
  }
};

template <typename Index, typename Function>
void parallel_for(Index first, Index last, const Function& f) {
  for (Index i = first; i < last; ++i) {
    f(i);
  }
}

}  // namespace tbb

#endif

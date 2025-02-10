function loaderProcess(loader, scene) {
  // Normally scene is responsible for resetting the job scheduler every frame
  // but since we're not calling scene.renderForSpecs we need to reset budgets
  // explicitly. This is only required for loaders that use the job scheduler
  // like GltfVertexBufferLoader, GltfIndexBufferLoader, and GltfTextureLoader
  scene.jobScheduler.resetBudgets();
  const ready = loader.process(scene.frameState);
  scene.jobScheduler.resetBudgets();
  return ready;
}

export default loaderProcess;

/**
 * 渲染队列的优先级控制
 */
import freezeObject from '../Core/freezeObject.js';

    /**
     * The render pass for a command.
     * 绘制命令的权重（控制渲染的优先级）  Pass值越小优先渲染
     * @private
     */
    var Pass = {
        // If you add/modify/remove Pass constants, also change the automatic GLSL constants
        // that start with 'czm_pass'
        //
        // Commands are executed in order by pass up to the translucent pass.
        // Translucent geometry needs special handling (sorting/OIT). The compute pass
        // is executed first and the overlay pass is executed last. Both are not sorted
        // by frustum.
        ENVIRONMENT : 0, // 环境：大气，雾，雨雪，天空盒子
        COMPUTE : 1,     // 计算
        GLOBE : 2,  // 地球
        TERRAIN_CLASSIFICATION : 3, // 分类地形
        CESIUM_3D_TILE : 4,   // 3dtile 地物
        CESIUM_3D_TILE_CLASSIFICATION : 5, // 分类3dtile
        CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW : 6,  // 隐藏显示的3dtile
        OPAQUE : 7, // 不透明的
        TRANSLUCENT : 8, // 半透明的
        OVERLAY : 9,  // 延迟加载的
        NUMBER_OF_PASSES : 10
    };
export default freezeObject(Pass);

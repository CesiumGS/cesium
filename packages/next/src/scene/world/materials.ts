// A world's materials and texture sets.
import { textureOf, isDestroyed } from "../../gpu/textureTracking.ts";
import {
  writeMaterial,
  MATERIAL_WORDS,
  ALL_VIEWS,
  MATERIAL_FLAGS_WORD,
  NO_TEXTURE,
  PROPERTY_TEXTURES,
  PROPERTY_TEXTURE_BINDING,
} from "../../render/layout.ts";
import { CapacityError } from "../CapacityError.ts";
import type { World } from "../World.ts";
import type { MaterialOptions, TextureSetOptions } from "./types.ts";
import { reserveMaterials, growMaterials } from "../../render/world/tables.ts";

export function addMaterial(world: World, options: MaterialOptions): number {
  const scratch = world.scene.materialScratch;
  writeMaterial(scratch.f32, scratch.u32, 0, {
    baseColor: options.baseColor ?? [1, 1, 1, 1],
    emissive: options.emissive ?? [0, 0, 0],
    metallic: options.metallic ?? 0,
    roughness: options.roughness ?? 1,
    alphaCutoff: options.alphaCutoff ?? 0.5,
    normalScale: options.normalScale ?? 1,
    occlusionStrength: options.occlusionStrength ?? 1,
    flags: options.flags ?? 0,
    ...(options.textures ? { textures: options.textures } : {}),
  });
  return internMaterial(world, scratch.u32);
}

/** A material record's index, shared by content (`addMaterial`). */
function internMaterial(world: World, words: Uint32Array): number {
  // The record's words are the key (NaN payloads and -0 included, so
  // equal keys are bit-identical records).
  const key = words.join(",");
  const shared = world.scene.materialByKey.get(key);
  if (shared !== undefined) {
    world.scene.materialReferences[shared]!++;
    return shared;
  }
  const index = world.scene.freeMaterials.pop() ?? world.scene.materialCount++;
  if (index >= world.maxMaterials) {
    world.scene.materialCount--;
    throw new CapacityError("material table");
  }
  reserveMaterials(world, index + 1);
  if (index >= world.raster.materialRows) {
    growMaterials(world, index + 1);
  }
  world.raster.materialsU32.set(words, index * MATERIAL_WORDS);
  world.scene.materialByKey.set(key, index);
  world.scene.materialKeys[index] = key;
  world.scene.materialReferences[index] = 1;
  world.raster.materialsDirty = true;
  world.version++;
  world.changedViews = ALL_VIEWS;
  return index;
}

export function removeMaterial(world: World, index: number): void {
  const references = world.scene.materialReferences[index] ?? 0;
  if (references <= 0) {
    return;
  }
  if (references > 1) {
    world.scene.materialReferences[index] = references - 1;
    return;
  }
  world.scene.materialReferences[index] = 0;
  const key = world.scene.materialKeys[index];
  if (key !== undefined) {
    world.scene.materialByKey.delete(key);
    world.scene.materialKeys[index] = undefined;
  }
  world.scene.freeMaterials.push(index);
}

export function materialWithFlags(
  world: World,
  material: number,
  flags: number,
): number {
  if (world.scene.materialReferences[material] === undefined || material < 0) {
    throw new RangeError(`materialWithFlags: no material ${material}`);
  }
  const scratch = world.scene.materialScratch;
  scratch.u32.set(
    world.raster.materialsU32.subarray(
      material * MATERIAL_WORDS,
      (material + 1) * MATERIAL_WORDS,
    ),
  );
  scratch.u32[MATERIAL_FLAGS_WORD] =
    (scratch.u32[MATERIAL_FLAGS_WORD]! | flags) >>> 0;
  return internMaterial(world, scratch.u32);
}

export function removeTextureSet(world: World, index: number): void {
  if (index > 0 && world.raster.textureSets[index]) {
    world.raster.textureSets[index] = undefined;
    world.raster.textureSetEntries[index] = undefined;
    for (const texture of world.raster.textureSetTextures[index] ?? []) {
      world.raster.setsOfTexture.get(texture)?.delete(index);
    }
    world.raster.textureSetTextures[index] = undefined;
    world.raster.brokenTextureSets.delete(index);
    world.raster.freeTextureSets.push(index);
    for (const key of world.raster.shaderGroups.keys()) {
      if (key.startsWith(`${index}|`)) {
        world.raster.shaderGroups.delete(key);
      }
    }
  }
}

export function textureRefs(
  world: World,
  options: TextureSetOptions,
): number[] {
  return [
    options.baseColor,
    options.metallicRoughness,
    options.normal,
    options.occlusion,
    options.emissive,
  ].map((binding, slot) => (binding ? slot : NO_TEXTURE));
}

export function createTextureSet(
  world: World,
  options: TextureSetOptions,
): number {
  const { defaults } = world.ctx;
  const slots = [
    options.baseColor,
    options.metallicRoughness,
    options.normal,
    options.occlusion,
    options.emissive,
  ];
  const entries: GPUBindGroupEntry[] = [];
  slots.forEach((slot, i) => {
    entries.push({ binding: i, resource: slot?.view ?? defaults.whiteView });
    entries.push({
      binding: 5 + i,
      resource: slot?.sampler ?? defaults.sampler,
    });
  });
  // Property textures (opaque.wgsl `propertyTexture0`, `1`).
  for (let k = 0; k < PROPERTY_TEXTURES; k++) {
    entries.push({
      binding: PROPERTY_TEXTURE_BINDING + k,
      resource: options.properties?.[k]?.view ?? defaults.whiteView,
    });
  }
  // The built-in pipelines' group has no property textures; custom
  // shaders reading metadata get them in their own group (setGroup).
  const group = world.ctx.device.createBindGroup({
    label: "world.textureSet",
    layout: world.ctx.pipelines.textureSetLayout,
    entries: entries.filter((e) => e.binding < PROPERTY_TEXTURE_BINDING),
  });
  let index = world.raster.freeTextureSets.pop();
  if (index !== undefined) {
    world.raster.textureSets[index] = group;
    world.raster.textureSetEntries[index] = entries;
  } else {
    world.raster.textureSets.push(group);
    world.raster.textureSetEntries.push(entries);
    index = world.raster.textureSets.length - 1;
  }
  trackTextureSet(world, index, entries);
  return index;
}

/** Records a texture set's textures, for `textureDestroyed`. */
function trackTextureSet(
  world: World,
  index: number,
  entries: GPUBindGroupEntry[],
): void {
  const textures: GPUTexture[] = [];
  for (const entry of entries) {
    const texture = textureOf(entry.resource as GPUTextureView);
    if (texture && !textures.includes(texture)) {
      textures.push(texture);
      let sets = world.raster.setsOfTexture.get(texture);
      if (!sets) {
        sets = new Set();
        world.raster.setsOfTexture.set(texture, sets);
      }
      sets.add(index);
      if (isDestroyed(texture)) {
        world.raster.brokenTextureSets.add(index);
        world.ctx.errors.report(
          "resource",
          `texture "${texture.label}" was bound after it was destroyed: that set's draws are skipped`,
        );
      }
    }
  }
  world.raster.textureSetTextures[index] = textures;
}

/**
 * A texture the engine made was destroyed: texture sets still binding it
 * are skipped from now on, and an imagery array bound still is unbound,
 * each reported (`Engine.errors`), so one bad resource costs its draws,
 * not the frame.
 */
export function textureDestroyed(world: World, texture: GPUTexture): void {
  const sets = world.raster.setsOfTexture.get(texture);
  let broke = false;
  for (const set of sets ?? []) {
    if (
      world.raster.textureSets[set] &&
      !world.raster.brokenTextureSets.has(set)
    ) {
      world.raster.brokenTextureSets.add(set);
      broke = true;
      world.ctx.errors.report(
        "resource",
        `texture "${texture.label}" was destroyed while a texture set still binds it: that set's draws are skipped until it is removed`,
      );
    }
  }
  if (broke) {
    world.raster.bundle = undefined;
    world.raster.translucentDraws = undefined;
    world.changedViews = ALL_VIEWS;
    world.version++;
  }
  if (textureOf(world.raster.imageryView) === texture) {
    world.ctx.errors.report(
      "resource",
      `the imagery array "${texture.label}" was destroyed while bound: the world binds none`,
    );
    world.setImageryArray(undefined);
  }
}

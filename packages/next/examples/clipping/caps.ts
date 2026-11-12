import {
  BrepCaps,
  MeshCaps,
  type BrepCapsReport,
  type BrepForm,
  type CapColor,
  type CapScheduler,
  type ClipSet,
  type DrawHandle,
  type MeshCapReport,
  type MeshCapSurfaceHit,
  type MeshCapTile,
  type SectionRunner,
  type World,
} from "@cesium/next";

/** A b-rep part as the caps need it: where it is drawn, and its coordinates in ITRF. */
export interface CapPart {
  readonly form: BrepForm;
  /** `World.addBrep`'s placement: the site, and the part's matrix with no translation of its own. */
  readonly origin: Float64Array;
  readonly model: Float64Array;
  /** The part's coordinates in ITRF (what `BrepCaps` takes): rotation, translation, uniform scale. */
  readonly formToFrame: Float64Array;
}

export interface CapsOptions {
  readonly world: World;
  readonly scheduler: CapScheduler;
  readonly parts: readonly CapPart[];
  readonly material: number;
  readonly color: () => CapColor;
  /** Names the caps' draws, for picks: `<name>: b-rep` and `<name>: mesh`. */
  readonly name: string;
  /** Sections the b-rep parts off the page's thread (the section worker). */
  readonly runner: SectionRunner;
}

/** What the caps of one clip set made, summed over the parts and the mesh tiles. */
export interface CapsReport {
  readonly brep: {
    readonly parts: number;
    readonly faces: number;
    readonly area: number;
    readonly unsupported: string | undefined;
    /** From a clip's change to the caps drawn. */
    readonly ms: number;
    /** Of it, the section (in the worker) and the page's drawing of the caps. */
    readonly sectionMs: number;
    readonly drawMs: number;
    /** Chains of a section that did not close, over the parts. */
    readonly openChains: number;
  };
  readonly mesh: {
    readonly tiles: number;
    readonly closedLoops: number;
    readonly openChains: number;
    readonly nearMisses: number;
    readonly pendingCuts: number;
    readonly unsupported: string | undefined;
    readonly ms: number;
  };
}

/**
 * The caps of one clip set: an exact one for each b-rep part, and the mesh
 * caps of every tile the application has fed (`setTile`). The application
 * makes and feeds them (nothing yet does it when a clip is added or a tile
 * loads), and the scheduler rebuilds them as the clip moves: the b-rep
 * sections in the section worker, the mesh cuts within the frame's budget.
 */
export class SectionCaps {
  private readonly brep: BrepCaps[];
  private readonly mesh: MeshCaps;
  private set: ClipSet | undefined;
  private brepOn = false;
  private meshOn = false;

  constructor(private readonly options: CapsOptions) {
    const { world, scheduler, color, material, name, runner } = options;
    this.brep = options.parts.map((part) => {
      const caps = new BrepCaps(world, {
        form: part.form,
        formToFrame: part.formToFrame,
        draw: {
          origin: part.origin,
          model: part.model,
          material,
          name: `${name}: b-rep`,
        },
        style: () => color(),
        runner,
      });
      scheduler.add(caps);
      return caps;
    });
    // A cap lies inside what it closes, so a view that doesn't clip never sees it.
    this.mesh = new MeshCaps(world, {
      place: (origin) => ({ origin }),
      material,
      name: `${name}: mesh`,
      style: () => color(),
      lineColor: [1, 0.25, 0.05, 1],
    });
    scheduler.add(this.mesh);
  }

  /** Follows `set` (none: no caps); each kind of cap only while its switch is on. */
  follow(set: ClipSet | undefined, brep: boolean, mesh: boolean): void {
    this.set = set;
    this.brepOn = brep;
    this.meshOn = mesh;
    for (const caps of this.brep) {
      caps.setClip(set && brep ? set : undefined);
    }
    this.mesh.setClip(set && mesh ? set : undefined);
  }

  /** Makes the caps again from the same set (the colour changed). */
  restyle(): void {
    this.follow(this.set, this.brepOn, this.meshOn);
  }

  setTile(tile: MeshCapTile): void {
    this.mesh.setTile(tile);
  }

  removeTile(id: string | number): void {
    this.mesh.removeTile(id);
  }

  /** The caps' form of part `i`, for exact queries, or undefined. */
  capForm(i: number) {
    return this.brep[i]?.capForm;
  }

  /** The first place the segment from `from` to `to` (ITRF, float64) meets the mesh caps, exactly; `keeps` drops what the view's clips remove. */
  meshHit(
    from: ArrayLike<number>,
    to: ArrayLike<number>,
    keeps?: (point: ArrayLike<number>) => boolean,
  ): MeshCapSurfaceHit | undefined {
    return this.mesh.rayHit(from, to, keeps);
  }

  /** Whether `draw` is one of these caps': which cap a pick landed on (the draws are named). */
  owns(draw: DrawHandle): boolean {
    return draw.name?.startsWith(`${this.options.name}: `) ?? false;
  }

  report(): CapsReport {
    const brep = this.brep.map((caps) => caps.report);
    const meshReport = this.mesh.report;
    const planes: readonly MeshCapReport[] = meshReport.planes;
    const sum = (f: (r: BrepCapsReport) => number) =>
      brep.reduce((n, r) => n + f(r), 0);
    return {
      brep: {
        parts: this.brep.length,
        faces: sum((r) => r.faces),
        area: sum((r) => r.area),
        unsupported: brep.find((r) => r.unsupported)?.unsupported,
        ms: sum((r) => r.ms),
        sectionMs: sum((r) => r.sectionMs),
        drawMs: sum((r) => r.drawMs),
        openChains: sum((r) => r.section?.openChains.length ?? 0),
      },
      mesh: {
        tiles: Math.max(0, ...planes.map((p) => p.tiles)),
        closedLoops: planes.reduce((n, p) => n + p.closedLoops, 0),
        openChains: planes.reduce((n, p) => n + p.openChains, 0),
        nearMisses: planes.reduce((n, p) => n + p.nearMisses, 0),
        pendingCuts: meshReport.pendingCuts,
        unsupported: meshReport.unsupported,
        ms: meshReport.ms,
      },
    };
  }

  dispose(): void {
    for (const caps of this.brep) {
      this.options.scheduler.remove(caps);
      caps.dispose();
    }
    this.options.scheduler.remove(this.mesh);
    this.mesh.dispose();
  }
}

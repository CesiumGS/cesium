/**
 * Second-order forward-mode automatic differentiation in two free variables
 * (s, t). A jet carries a value, its gradient and its Hessian. A map written
 * once over jets returns its value, J and H together, and maps composed over
 * jets compose by the chain rule, so a route's J and H come out of the same
 * code that draws it. Float64 throughout.
 */
export class Jet {
  constructor(
    readonly v: number,
    readonly ds = 0,
    readonly dt = 0,
    readonly dss = 0,
    readonly dst = 0,
    readonly dtt = 0,
  ) {}

  /** A constant. */
  static c(v: number): Jet {
    return new Jet(v);
  }

  /** The first free variable, at `v`. */
  static s(v: number): Jet {
    return new Jet(v, 1, 0);
  }

  /** The second free variable, at `v`. */
  static t(v: number): Jet {
    return new Jet(v, 0, 1);
  }

  /** u = F(this), from F, F′ and F″ at this value. */
  private chain(f0: number, f1: number, f2: number): Jet {
    return new Jet(
      f0,
      f1 * this.ds,
      f1 * this.dt,
      f2 * this.ds * this.ds + f1 * this.dss,
      f2 * this.ds * this.dt + f1 * this.dst,
      f2 * this.dt * this.dt + f1 * this.dtt,
    );
  }

  add(o: Jet | number): Jet {
    if (typeof o === "number") {
      return new Jet(
        this.v + o,
        this.ds,
        this.dt,
        this.dss,
        this.dst,
        this.dtt,
      );
    }
    return new Jet(
      this.v + o.v,
      this.ds + o.ds,
      this.dt + o.dt,
      this.dss + o.dss,
      this.dst + o.dst,
      this.dtt + o.dtt,
    );
  }

  sub(o: Jet | number): Jet {
    return this.add(typeof o === "number" ? -o : o.neg());
  }

  neg(): Jet {
    return this.scale(-1);
  }

  scale(k: number): Jet {
    return new Jet(
      k * this.v,
      k * this.ds,
      k * this.dt,
      k * this.dss,
      k * this.dst,
      k * this.dtt,
    );
  }

  mul(o: Jet | number): Jet {
    if (typeof o === "number") {
      return this.scale(o);
    }
    return new Jet(
      this.v * o.v,
      this.ds * o.v + this.v * o.ds,
      this.dt * o.v + this.v * o.dt,
      this.dss * o.v + 2 * this.ds * o.ds + this.v * o.dss,
      this.dst * o.v + this.ds * o.dt + this.dt * o.ds + this.v * o.dst,
      this.dtt * o.v + 2 * this.dt * o.dt + this.v * o.dtt,
    );
  }

  inv(): Jet {
    const r = 1 / this.v;
    return this.chain(r, -r * r, 2 * r * r * r);
  }

  div(o: Jet | number): Jet {
    return typeof o === "number" ? this.scale(1 / o) : this.mul(o.inv());
  }

  sq(): Jet {
    return this.mul(this);
  }

  sqrt(): Jet {
    const r = Math.sqrt(this.v);
    return this.chain(r, 0.5 / r, -0.25 / (r * this.v));
  }

  exp(): Jet {
    const e = Math.exp(this.v);
    return this.chain(e, e, e);
  }

  log(): Jet {
    return this.chain(Math.log(this.v), 1 / this.v, -1 / (this.v * this.v));
  }

  cosh(): Jet {
    return this.chain(Math.cosh(this.v), Math.sinh(this.v), Math.cosh(this.v));
  }

  sin(): Jet {
    const s = Math.sin(this.v);
    return this.chain(s, Math.cos(this.v), -s);
  }

  cos(): Jet {
    const c = Math.cos(this.v);
    return this.chain(c, -Math.sin(this.v), -c);
  }

  tanh(): Jet {
    const th = Math.tanh(this.v);
    const s2 = 1 - th * th;
    return this.chain(th, s2, -2 * th * s2);
  }

  /** log(1 + exp(this)), without overflow. */
  softplus(): Jet {
    if (this.v > 30) {
      return this;
    }
    const e = Math.exp(this.v);
    const sig = e / (1 + e);
    return this.chain(Math.log1p(e), sig, sig * (1 - sig));
  }
}

export type JetVec = readonly [Jet, Jet];

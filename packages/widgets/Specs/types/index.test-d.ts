import { expectType } from "tsd";

import { Viewer } from "@cesium/widgets";

expectType<Viewer>(new Viewer("test"));

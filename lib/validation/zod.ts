import { config } from "zod/v4/core";

// Configure before constructing schemas, including those imported by client bundles.
config({ jitless: true });

export { z } from "zod/v4";

import { z } from "zod";

// Configure before constructing schemas, including those imported by client bundles.
z.config({ jitless: true });

export { z };

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },

  // ── INVARIANT: Math.random() chỉ được dùng trong spin-resolver ──
  // Mọi nơi khác phải dùng resolveWeightedOutcome() từ lib/wheel-engine/spin-resolver.ts
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.object.name='Math'][callee.property.name='random']",
          message:
            "Math.random() bị cấm. Dùng resolveWeightedOutcome() từ lib/wheel-engine/spin-resolver.ts để đảm bảo randomness có thể test được.",
        },
      ],
    },
  },

  // Chỉ spin-resolver.ts được phép gọi Math.random()
  {
    files: ["lib/wheel-engine/spin-resolver.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },

  // ── INVARIANT: lib/ layer không được import React, Next.js, features, actions ──
  // lib/ phải là pure TypeScript không phụ thuộc UI framework
  {
    files: ["lib/**/*.ts", "lib/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*"],
              message: "lib/ không được import React. lib/ phải là pure TypeScript.",
            },
            {
              group: ["next", "next/*"],
              message: "lib/ không được import Next.js. lib/ phải là pure TypeScript.",
            },
            {
              group: ["framer-motion"],
              message: "lib/ không được import UI libraries.",
            },
            {
              group: ["@/features/*"],
              message: "lib/ không được import từ features/. Dependency phải đi từ features → lib, không ngược lại.",
            },
            {
              group: ["@/actions/*"],
              message: "lib/ không được import từ actions/.",
            },
            {
              group: ["@/components/*"],
              message: "lib/ không được import từ components/.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;

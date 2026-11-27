import ts from 'typescript';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { relative, join } from 'node:path';
const root = process.cwd();
const cfg = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const options = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root).options;
const files: string[] = [];
function walk(dir: string) { for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory())
        walk(join(dir, e.name));
    else if (/\.tsx?$/.test(e.name))
        files.push(join(dir, e.name));
} }
for (const dir of ['app', 'components', 'features', 'lib', 'types', 'actions'])
    walk(dir);
const cache = new Map<string, {
    client: boolean;
    server: boolean;
    imports: string[];
}>();
function moduleInfo(file: string) { if (cache.has(file))
    return cache.get(file)!; const raw = readFileSync(file, 'utf8'); const ast = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true); const info = { client: /^[\s\S]{0,100}['"]use client['"]/.test(raw), server: /^[\s\S]{0,100}['"]use server['"]/.test(raw), imports: [] as string[] }; for (const n of ast.statements) {
    let value = false;
    let mod: ts.Expression | undefined;
    if (ts.isImportDeclaration(n)) {
        value = !(n.importClause?.isTypeOnly) && (!n.importClause?.namedBindings || !ts.isNamedImports(n.importClause.namedBindings) || n.importClause.namedBindings.elements.some(e => !e.isTypeOnly));
        mod = n.moduleSpecifier;
    }
    else if (ts.isExportDeclaration(n)) {
        value = !n.isTypeOnly;
        mod = n.moduleSpecifier;
    }
    if (value && mod && ts.isStringLiteral(mod) && (mod.text.startsWith('.') || mod.text.startsWith('@/'))) {
        const r = ts.resolveModuleName(mod.text, file, options, ts.sys).resolvedModule?.resolvedFileName;
        if (r && !r.includes('node_modules') && existsSync(r))
            info.imports.push(r);
    }
} cache.set(file, info); return info; }
const paths = new Map<string, string[]>();
for (const start of files.filter(f => moduleInfo(f).client)) {
    const q = [[start]];
    const seen = new Set<string>();
    while (q.length) {
        const chain = q.shift()!;
        const f = chain.at(-1)!;
        if (seen.has(f))
            continue;
        seen.add(f);
        const m = moduleInfo(f);
        if (m.server)
            continue;
        const rel = relative(root, f).replaceAll('\\', '/');
        if (/lib\/wheel-engine\/(?:weight-calculator|weight-pools|ovr-calculator|physique-modifier|spin-resolver)|lib\/(?:transfer-economy(?:-core|-contracts|-approach)?|salary-negotiation|club-fit|positional-value)\.ts|features\/(?:quick-mode\/lib\/(?:quick-mode-engine|traits|quick-count)|quick-mode\/services\/|wheel\/services\/|wheel\/lib\/(?:career-wheel-resolver|competition-simulation-weights|growth-pools|growth-balance|wheel-team-params)|season\/services\/(?:season-simulator|award-simulator|journey-opponents|cup-journey|global-award)|career\/services\/legacy-ovr-recovery)/.test(rel)) {
            if (!paths.has(rel))
                paths.set(rel, chain.map(p => relative(root, p).replaceAll('\\', '/')));
        }
        for (const dep of m.imports)
            q.push([...chain, dep]);
    }
}
if (paths.size) {
    console.error(JSON.stringify([...paths], null, 2));
    throw new Error('Private game policy is reachable from client components');
}
console.log('Client boundary: no private simulation, weighting, OVR or transfer policy imports in client components.');

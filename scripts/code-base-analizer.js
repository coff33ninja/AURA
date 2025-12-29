/**
 * Codebase Architecture Analyzer
 * 
 * Scans all TypeScript/TSX files to:
 * 1. Find unused imports across the codebase
 * 2. Map dependencies between modules
 * 3. Generate architecture documentation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Directories to scan
const SCAN_DIRS = ['components', 'services', 'utils', 'types'];
// Directories to ignore
const IGNORE_DIRS = ['node_modules', 'dist', '.git', 'tests', '.kiro'];
// File extensions to analyze
const EXTENSIONS = ['.ts', '.tsx'];

// Results storage
const results = {
    files: [],
    unusedImports: [],
    dependencies: new Map(),
    exports: new Map(),
    circularDeps: [],
    orphanedFiles: [],
    stats: {
        totalFiles: 0,
        totalImports: 0,
        unusedImports: 0,
        totalExports: 0,
    }
};

/**
 * Recursively get all TypeScript files
 */
function getAllFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(item)) {
                getAllFiles(fullPath, files);
            }
        } else if (EXTENSIONS.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * Extract imports from file content
 */
function extractImports(content, filePath) {
    const imports = [];

    // Match various import patterns
    const patterns = [
        // import { a, b } from 'module'
        /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
        // import Default from 'module'
        /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
        // import * as Name from 'module'
        /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
        // import 'module' (side effect)
        /import\s+['"]([^'"]+)['"]/g,
    ];

    // Named imports
    const namedRegex = /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = namedRegex.exec(content)) !== null) {
        const names = match[1].split(',').map(n => {
            const cleaned = n.trim().replace(/^type\s+/, '');
            const parts = cleaned.split(/\s+as\s+/);
            return {
                name: parts[0].trim(),
                alias: parts[1]?.trim(),
                isType: n.includes('type ')
            };
        }).filter(n => n.name);

        imports.push({
            type: 'named',
            names,
            source: match[2],
            isRelative: match[2].startsWith('.'),
        });
    }

    // Default imports
    const defaultRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = defaultRegex.exec(content)) !== null) {
        // Skip if it's a named import we already caught
        if (content.includes(`import {`) && content.includes(match[0])) continue;
        if (match[1] === 'type') continue;

        imports.push({
            type: 'default',
            names: [{ name: match[1] }],
            source: match[2],
            isRelative: match[2].startsWith('.'),
        });
    }

    // Namespace imports
    const namespaceRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = namespaceRegex.exec(content)) !== null) {
        imports.push({
            type: 'namespace',
            names: [{ name: match[1] }],
            source: match[2],
            isRelative: match[2].startsWith('.'),
        });
    }

    return imports;
}

/**
 * Extract exports from file content
 */
function extractExports(content) {
    const exports = [];

    // export const/let/var/function/class
    const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
        exports.push({ name: match[1], type: 'named' });
    }

    // export { a, b }
    const exportListRegex = /export\s+{([^}]+)}/g;
    while ((match = exportListRegex.exec(content)) !== null) {
        const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
        names.forEach(name => {
            if (name) exports.push({ name, type: 'named' });
        });
    }

    // export default
    if (/export\s+default/.test(content)) {
        exports.push({ name: 'default', type: 'default' });
    }

    return exports;
}

/**
 * Check if an import is used in the file
 */
function isImportUsed(name, content, importEndIndex) {
    // Skip React and common globals
    if (['React', 'THREE'].includes(name)) return true;

    const afterImports = content.substring(importEndIndex);
    const regex = new RegExp(`\\b${name}\\b`, 'g');
    const matches = afterImports.match(regex);
    return matches && matches.length > 0;
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(ROOT_DIR, filePath);

    const imports = extractImports(content, filePath);
    const exports = extractExports(content);

    // Find where imports end
    const lastImportMatch = content.match(/from\s+['"][^'"]+['"]/g);
    const importEndIndex = lastImportMatch
        ? content.lastIndexOf(lastImportMatch[lastImportMatch.length - 1]) + 50
        : 0;

    // Check for unused imports
    const unusedImports = [];
    let totalImportCount = 0;

    for (const imp of imports) {
        for (const { name, alias } of imp.names) {
            totalImportCount++;
            const usedName = alias || name;
            if (!isImportUsed(usedName, content, importEndIndex)) {
                unusedImports.push({
                    name: usedName,
                    source: imp.source,
                    file: relativePath,
                });
            }
        }
    }

    return {
        path: relativePath,
        imports,
        exports,
        unusedImports,
        totalImports: totalImportCount,
    };
}

/**
 * Build dependency graph
 */
function buildDependencyGraph(fileResults) {
    const graph = new Map();
    const reverseGraph = new Map(); // Who depends on this file

    for (const file of fileResults) {
        const deps = [];
        for (const imp of file.imports) {
            if (imp.isRelative) {
                // Resolve relative path
                const fileDir = path.dirname(path.join(ROOT_DIR, file.path));
                let resolvedPath = path.resolve(fileDir, imp.source);

                // Try adding extensions
                for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
                    const tryPath = resolvedPath + ext;
                    if (fs.existsSync(tryPath)) {
                        resolvedPath = tryPath;
                        break;
                    }
                }

                const relativeDep = path.relative(ROOT_DIR, resolvedPath);
                deps.push(relativeDep);

                // Build reverse graph
                if (!reverseGraph.has(relativeDep)) {
                    reverseGraph.set(relativeDep, []);
                }
                reverseGraph.get(relativeDep).push(file.path);
            }
        }
        graph.set(file.path, deps);
    }

    return { graph, reverseGraph };
}

/**
 * Detect circular dependencies
 */
function detectCircularDeps(graph) {
    const circular = [];
    const visited = new Set();
    const recursionStack = new Set();

    function dfs(node, path = []) {
        if (recursionStack.has(node)) {
            const cycleStart = path.indexOf(node);
            circular.push(path.slice(cycleStart).concat(node));
            return;
        }
        if (visited.has(node)) return;

        visited.add(node);
        recursionStack.add(node);
        path.push(node);

        const deps = graph.get(node) || [];
        for (const dep of deps) {
            dfs(dep, [...path]);
        }

        recursionStack.delete(node);
    }

    for (const node of graph.keys()) {
        dfs(node);
    }

    return circular;
}

/**
 * Find orphaned files (not imported by anyone)
 */
function findOrphanedFiles(fileResults, reverseGraph) {
    const entryPoints = ['App.tsx', 'index.tsx', 'index.ts'];
    const orphaned = [];

    for (const file of fileResults) {
        const isEntryPoint = entryPoints.some(ep => file.path.endsWith(ep));
        const isImported = reverseGraph.has(file.path) && reverseGraph.get(file.path).length > 0;
        const isTestFile = file.path.includes('test');

        if (!isEntryPoint && !isImported && !isTestFile) {
            orphaned.push(file.path);
        }
    }

    return orphaned;
}

/**
 * Generate markdown documentation
 */
function generateDocs(fileResults, graph, reverseGraph, circular, orphaned) {
    const allUnused = fileResults.flatMap(f => f.unusedImports);
    const totalImports = fileResults.reduce((sum, f) => sum + f.totalImports, 0);

    let md = `# Codebase Architecture Analysis

Generated: ${new Date().toISOString()}

## Summary

| Metric | Count |
|--------|-------|
| Total Files Analyzed | ${fileResults.length} |
| Total Imports | ${totalImports} |
| Unused Imports | ${allUnused.length} |
| Circular Dependencies | ${circular.length} |
| Potentially Orphaned Files | ${orphaned.length} |

---

## Module Dependency Graph

\`\`\`
`;

    // Group files by directory
    const byDir = {};
    for (const file of fileResults) {
        const dir = path.dirname(file.path) || 'root';
        if (!byDir[dir]) byDir[dir] = [];
        byDir[dir].push(file);
    }

    for (const [dir, files] of Object.entries(byDir)) {
        md += `\n📁 ${dir}/\n`;
        for (const file of files) {
            const deps = graph.get(file.path) || [];
            const dependents = reverseGraph.get(file.path) || [];
            md += `   📄 ${path.basename(file.path)}\n`;
            md += `      Imports: ${file.imports.length} modules\n`;
            md += `      Exports: ${file.exports.length} symbols\n`;
            md += `      Used by: ${dependents.length} files\n`;
        }
    }

    md += `\`\`\`

---

## Unused Imports

`;

    if (allUnused.length === 0) {
        md += `✅ No unused imports found!\n`;
    } else {
        // Group by file
        const byFile = {};
        for (const unused of allUnused) {
            if (!byFile[unused.file]) byFile[unused.file] = [];
            byFile[unused.file].push(unused);
        }

        for (const [file, imports] of Object.entries(byFile)) {
            md += `### ${file}\n\n`;
            md += `| Import | Source |\n`;
            md += `|--------|--------|\n`;
            for (const imp of imports) {
                md += `| \`${imp.name}\` | ${imp.source} |\n`;
            }
            md += `\n`;
        }
    }

    md += `---

## Circular Dependencies

`;

    if (circular.length === 0) {
        md += `✅ No circular dependencies detected!\n`;
    } else {
        for (const cycle of circular) {
            md += `- ${cycle.join(' → ')}\n`;
        }
    }

    md += `
---

## Potentially Orphaned Files

These files are not imported by any other file (excluding entry points and tests):

`;

    if (orphaned.length === 0) {
        md += `✅ No orphaned files found!\n`;
    } else {
        for (const file of orphaned) {
            md += `- ${file}\n`;
        }
    }

    md += `
---

## Module Structure

`;

    for (const [dir, files] of Object.entries(byDir)) {
        md += `### ${dir}/\n\n`;

        for (const file of files) {
            md += `#### ${path.basename(file.path)}\n\n`;

            if (file.exports.length > 0) {
                md += `**Exports:**\n`;
                for (const exp of file.exports) {
                    md += `- \`${exp.name}\` (${exp.type})\n`;
                }
                md += `\n`;
            }

            if (file.imports.length > 0) {
                md += `**Dependencies:**\n`;
                const relativeImports = file.imports.filter(i => i.isRelative);
                const externalImports = file.imports.filter(i => !i.isRelative);

                if (relativeImports.length > 0) {
                    md += `- Internal: ${relativeImports.map(i => i.source).join(', ')}\n`;
                }
                if (externalImports.length > 0) {
                    md += `- External: ${externalImports.map(i => i.source).join(', ')}\n`;
                }
                md += `\n`;
            }
        }
    }

    return md;
}

/**
 * Generate JSON export for further processing
 */
function generateJson(fileResults, graph, reverseGraph, circular, orphaned) {
    return {
        generatedAt: new Date().toISOString(),
        stats: {
            totalFiles: fileResults.length,
            totalImports: fileResults.reduce((sum, f) => sum + f.totalImports, 0),
            unusedImports: fileResults.flatMap(f => f.unusedImports).length,
            circularDeps: circular.length,
            orphanedFiles: orphaned.length,
        },
        files: fileResults.map(f => ({
            path: f.path,
            imports: f.imports,
            exports: f.exports,
            unusedImports: f.unusedImports,
        })),
        dependencies: Object.fromEntries(graph),
        reverseDependencies: Object.fromEntries(reverseGraph),
        circularDependencies: circular,
        orphanedFiles: orphaned,
    };
}

// Main execution
console.log('🔍 Analyzing codebase...\n');

// Get all files
const allFiles = [];
for (const dir of SCAN_DIRS) {
    getAllFiles(path.join(ROOT_DIR, dir), allFiles);
}

// Also scan root level files
const rootFiles = fs.readdirSync(ROOT_DIR)
    .filter(f => EXTENSIONS.some(ext => f.endsWith(ext)))
    .map(f => path.join(ROOT_DIR, f));
allFiles.push(...rootFiles);

console.log(`Found ${allFiles.length} TypeScript files to analyze\n`);

// Analyze each file
const fileResults = allFiles.map(f => {
    const result = analyzeFile(f);
    if (result.unusedImports.length > 0) {
        console.log(`⚠️  ${result.path}: ${result.unusedImports.length} unused imports`);
    }
    return result;
});

// Build dependency graph
const { graph, reverseGraph } = buildDependencyGraph(fileResults);

// Detect circular dependencies
const circular = detectCircularDeps(graph);

// Find orphaned files
const orphaned = findOrphanedFiles(fileResults, reverseGraph);

// Generate documentation
const markdown = generateDocs(fileResults, graph, reverseGraph, circular, orphaned);
const json = generateJson(fileResults, graph, reverseGraph, circular, orphaned);

// Ensure docs directory exists
const docsDir = path.join(ROOT_DIR, 'docs');
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

// Write outputs
fs.writeFileSync(path.join(docsDir, 'architecture.md'), markdown);
fs.writeFileSync(path.join(docsDir, 'architecture.json'), JSON.stringify(json, null, 2));

console.log('\n✅ Analysis complete!');
console.log(`\n📊 Summary:`);
console.log(`   Files analyzed: ${fileResults.length}`);
console.log(`   Total imports: ${json.stats.totalImports}`);
console.log(`   Unused imports: ${json.stats.unusedImports}`);
console.log(`   Circular dependencies: ${json.stats.circularDeps}`);
console.log(`   Orphaned files: ${json.stats.orphanedFiles}`);
console.log(`\n📁 Output written to:`);
console.log(`   docs/architecture.md`);
console.log(`   docs/architecture.json`);

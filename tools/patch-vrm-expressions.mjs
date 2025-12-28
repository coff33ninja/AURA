#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function readGLBChunks(buf) {
  // GLB header: 12 bytes
  const magic = buf.toString('utf8', 0, 4);
  if (magic !== 'glTF') throw new Error('Not a GLB file');
  const version = buf.readUInt32LE(4);
  const length = buf.readUInt32LE(8);
  let offset = 12;
  const chunks = [];
  while (offset < length) {
    const chunkLength = buf.readUInt32LE(offset);
    const chunkType = buf.readUInt32LE(offset + 4);
    const chunkData = buf.slice(offset + 8, offset + 8 + chunkLength);
    chunks.push({ chunkLength, chunkType, chunkData });
    offset += 8 + chunkLength;
  }
  return { version, length, chunks };
}

function buildGLB(chunks, version = 2) {
  // compute lengths
  let totalLength = 12; // header
  for (const c of chunks) {
    totalLength += 8 + c.chunkData.length;
  }
  const out = Buffer.alloc(totalLength);
  out.write('glTF', 0, 4, 'utf8');
  out.writeUInt32LE(version, 4);
  out.writeUInt32LE(totalLength, 8);
  let offset = 12;
  for (const c of chunks) {
    out.writeUInt32LE(c.chunkData.length, offset);
    out.writeUInt32LE(c.chunkType, offset + 4);
    c.chunkData.copy(out, offset + 8);
    offset += 8 + c.chunkData.length;
  }
  return out;
}

function dedupeExpressionGroups(json) {
  const tryPaths = [
    ['extensions','VRM','blendShapeMaster','blendShapeGroups'],
    ['extensions','VRMC_vrm','blendShapeMaster','blendShapeGroups'],
    ['extensions','VRMC_vrm','blendShapeGroups']
  ];
  const getPath = (obj, path) => path.reduce((a,k)=> (a && a[k] !== undefined) ? a[k] : undefined, obj);
  const sidecar = { mappings: {}, groups: {} };
  tryPaths.forEach(path => {
    const groups = getPath(json, path);
    if (Array.isArray(groups)) {
      const seen = new Map();
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const name = (g && (g.name || g.presetName || g.preset)) || (`expr_${i}`);
        if (seen.has(name)) {
          let suffix = 1;
          let newName = `${name}_dup${suffix}`;
          while (seen.has(newName)) { suffix++; newName = `${name}_dup${suffix}`; }
          if (g) g.name = newName;
          seen.set(newName, g);
          sidecar.mappings[name] = sidecar.mappings[name] || [];
          sidecar.mappings[name].push(newName);
          sidecar.groups[newName] = g;
          console.log(`Renamed duplicate expression: ${name} -> ${newName}`);
        } else {
          seen.set(name, g);
          sidecar.groups[name] = g;
        }
      }
    }
  });
  return sidecar;
}

async function run() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error('Usage: node tools/patch-vrm-expressions.mjs <input.vrm|.glb|.gltf> [--out-dir=out]');
    process.exit(2);
  }
  const input = argv[0];
  const outDirOpt = argv.find(a=>a.startsWith('--out-dir='));
  const outDir = outDirOpt ? outDirOpt.split('=')[1] : path.dirname(input);
  const buf = fs.readFileSync(input);
  let isGLB = false;
  let jsonObj = null;
  let otherChunks = [];
  if (buf[0] === 0x67 && buf[1] === 0x6c && buf[2] === 0x54 && buf[3] === 0x46) {
    // GLB
    isGLB = true;
    const { chunks } = readGLBChunks(buf);
    for (const c of chunks) {
      if (c.chunkType === 0x4E4F534A) { // JSON
        const txt = c.chunkData.toString('utf8');
        jsonObj = JSON.parse(txt);
      } else {
        otherChunks.push(c);
      }
    }
  } else {
    // assume .gltf JSON text
    const txt = buf.toString('utf8');
    jsonObj = JSON.parse(txt);
  }

  if (!jsonObj) {
    console.error('Failed to parse JSON from input');
    process.exit(3);
  }

  const sidecar = dedupeExpressionGroups(jsonObj);

  // write sidecar
  const base = path.basename(input);
  const sidecarPath = path.join(outDir, base + '.expressions.json');
  fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf8');
  console.log('Wrote sidecar:', sidecarPath);

  // write patched VRM/GLTF
  if (isGLB) {
    // rebuild chunks: JSON chunk first, then other chunks in original order (we kept only non-json)
    const newJson = Buffer.from(JSON.stringify(jsonObj), 'utf8');
    // pad to 4-byte alignment
    const pad = (4 - (newJson.length % 4)) % 4;
    const newJsonPadded = Buffer.concat([newJson, Buffer.alloc(pad, 0x20)]); // pad with spaces
    const chunks = [{ chunkData: newJsonPadded, chunkType: 0x4E4F534A }, ...otherChunks];
    const outBuf = buildGLB(chunks, 2);
    const outPath = path.join(outDir, base.replace(/\.vrm$|\.glb$|\.gltf$/i, '') + '.patched.vrm');
    fs.writeFileSync(outPath, outBuf);
    console.log('Wrote patched GLB:', outPath);
  } else {
    const outPath = path.join(outDir, path.basename(input).replace(/\.gltf$/i, '') + '.patched.gltf');
    fs.writeFileSync(outPath, JSON.stringify(jsonObj, null, 2), 'utf8');
    console.log('Wrote patched GLTF:', outPath);
  }
}

run().catch(err => { console.error(err); process.exit(1); });

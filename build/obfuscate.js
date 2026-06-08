/**
 * DISC Project - Build Script
 *
 * Reads src/index.html, extracts all <script> blocks, obfuscates the app
 * JavaScript, and writes the result to docs/index.html with protection
 * code injected as a separate unobfuscated <script> block.
 *
 * Usage: node build/obfuscate.js
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// ── Paths ───────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'index.html');
const DST = path.join(ROOT, 'docs', 'index.html');
const BUILD_DIR = path.dirname(__filename); // build/

// ── Protection code (injected as separate script block, NOT obfuscated) ──────
const PROTECTION_CODE = `// ═══════════ PROTECTION LAYER ═══════════
(function(){
  // 1. Domain lock
  var ALLOWED = ['disc-test-6qh.pages.dev', 'localhost', '127.0.0.1'];
  var host = window.location.hostname;
  var allowed = false;
  for (var i = 0; i < ALLOWED.length; i++) {
    if (host === ALLOWED[i] || host.endsWith('.' + ALLOWED[i])) { allowed = true; break; }
  }
  if (!allowed) {
    document.documentElement.innerHTML = '';
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#999;text-align:center;padding:20px"><p>此页面仅可在官方渠道访问<br>请通过正规链接进入</p></div>';
    throw new Error('Domain not allowed');
  }

  // 2. Disable right-click
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });

  // 3. Disable text selection via CSS
  var style = document.createElement('style');
  style.textContent = 'body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }';
  document.head.appendChild(style);

  // 4. F12 / DevTools detection
  var devtoolsOpen = false;
  var threshold = 200;
  setInterval(function() {
    var widthDiff = window.outerWidth - window.innerWidth;
    var heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > threshold || heightDiff > threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        // Clear sensitive content
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#c0392b;text-align:center;padding:20px"><p>⚠️ 请关闭开发者工具后刷新页面</p></div>';
      }
    } else {
      if (devtoolsOpen) {
        devtoolsOpen = false;
        location.reload();
      }
    }
  }, 1000);

  // 5. Debugger timing detection
  var start = new Date();
  debugger;
  var end = new Date();
  if (end - start > 100) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#c0392b;text-align:center;padding:20px"><p>⚠️ 检测到调试工具，请关闭后刷新页面</p></div>';
  }
})();
`;

// ── Obfuscator options ──────────────────────────────────────────────────────
const OBF_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: false,
  shuffleStringArray: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract all <script>...</script> blocks from HTML content.
 * Returns an array of { start, end, content } (end is the index AFTER </script>).
 * Works with <script> (no attributes) and <script type="text/javascript"> etc.
 */
function extractScriptBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = re.exec(html)) !== null) {
    blocks.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
      fullTag: match[0]
    });
  }

  return blocks;
}

/**
 * Combine all script contents with a newline separator.
 * Protection code is added separately (not obfuscated).
 */
function combineScripts(blocks) {
  const parts = [];
  for (let i = 0; i < blocks.length; i++) {
    parts.push(blocks[i].content);
  }
  return parts.join('\n');
}

/**
 * Replace the first <script> block with protection code + obfuscated app code,
 * and remove all subsequent <script> blocks.
 * Protection code is inserted as a separate <script> block before the
 * obfuscated code, so it is never obfuscated itself.
 * Returns the reassembled HTML.
 */
function reassemble(html, blocks, obfuscatedCode) {
  if (blocks.length === 0) {
    return html;
  }

  // Process from end to start so indices stay stable
  // First remove all blocks except the first
  let result = html;
  for (let i = blocks.length - 1; i >= 1; i--) {
    result = result.slice(0, blocks[i].start) + result.slice(blocks[i].end);
  }

  // Replace the first block with protection code + obfuscated code
  // Protection code is NOT obfuscated so it remains readable and its timing behavior is preserved
  const first = blocks[0];
  const replacement = '<script>\n' + PROTECTION_CODE + '\n</script>\n<script>\n' + obfuscatedCode + '\n</script>';
  result = result.slice(0, first.start) + replacement + result.slice(first.end);

  return result;
}

/**
 * Format bytes to a human-readable string.
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(2) + ' KB';
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('[build] DISC project obfuscation build');
  console.log('[build] Source: ' + SRC);
  console.log('[build] Dest:   ' + DST);
  console.log('');

  // 1. Ensure build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
    console.log('[build] Created build directory');
  }

  // 2. Ensure docs directory exists
  const docsDir = path.dirname(DST);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
    console.log('[build] Created docs directory');
  }

  // 3. Read source
  console.log('[build] Reading source...');
  let html;
  try {
    html = fs.readFileSync(SRC, 'utf-8');
  } catch (err) {
    console.error('[build] ERROR: Cannot read source file: ' + SRC);
    console.error('[build] ' + err.message);
    process.exit(1);
  }
  const htmlSize = Buffer.byteLength(html, 'utf-8');
  console.log('[build] Source HTML size: ' + formatSize(htmlSize));

  // 4. Extract script blocks
  const blocks = extractScriptBlocks(html);
  console.log('[build] Found ' + blocks.length + ' script block(s)');

  if (blocks.length === 0) {
    console.warn('[build] WARNING: No <script> blocks found in source. Copying HTML unchanged.');
    try {
      fs.writeFileSync(DST, html, 'utf-8');
      console.log('[build] Done. No JavaScript to obfuscate.');
    } catch (err) {
      console.error('[build] ERROR: Cannot write destination: ' + DST);
      console.error('[build] ' + err.message);
      process.exit(1);
    }
    return;
  }

  // 5. Compute original JS size
  let originalJsSize = 0;
  for (let i = 0; i < blocks.length; i++) {
    originalJsSize += Buffer.byteLength(blocks[i].content, 'utf-8');
  }
  console.log('[build] Original JS size: ' + formatSize(originalJsSize));

  // 6. Combine scripts (app code only, protection code added separately)
  const combinedJs = combineScripts(blocks);
  const combinedSize = Buffer.byteLength(combinedJs, 'utf-8');
  console.log('[build] Combined JS (app code only): ' + formatSize(combinedSize));

  // 7. Obfuscate
  console.log('[build] Obfuscating (this may take 30-120 seconds for large files)...');
  let obfuscatedCode;
  try {
    const result = JavaScriptObfuscator.obfuscate(combinedJs, OBF_OPTIONS);
    obfuscatedCode = result.getObfuscatedCode();
  } catch (err) {
    console.error('[build] ERROR: Obfuscation failed: ' + err.message);
    console.error('[build] This may be a syntax error in the source JavaScript.');
    console.error('[build] Try copying the combined JS to a temp file and running it through node --check to debug.');
    process.exit(1);
  }
  const obfuscatedSize = Buffer.byteLength(obfuscatedCode, 'utf-8');
  console.log('[build] Obfuscated JS size: ' + formatSize(obfuscatedSize));

  // 8. Reassemble HTML
  console.log('[build] Reassembling HTML...');
  let outputHtml;
  try {
    outputHtml = reassemble(html, blocks, obfuscatedCode);
  } catch (err) {
    console.error('[build] ERROR: Reassembly failed: ' + err.message);
    process.exit(1);
  }
  const outputSize = Buffer.byteLength(outputHtml, 'utf-8');

  // 9. Write output
  try {
    fs.writeFileSync(DST, outputHtml, 'utf-8');
  } catch (err) {
    console.error('[build] ERROR: Cannot write destination: ' + DST);
    console.error('[build] ' + err.message);
    process.exit(1);
  }

  // 10. Summary
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('[build] BUILD COMPLETE');
  console.log('───────────────────────────────────────────');
  console.log('  Original HTML:  ' + formatSize(htmlSize));
  console.log('  Original JS:    ' + formatSize(originalJsSize));
  console.log('  Obfuscated JS:  ' + formatSize(obfuscatedSize));
  console.log('  Output HTML:    ' + formatSize(outputSize));
  console.log('═══════════════════════════════════════════');
}

main();

/* ESCD editor 0.8.4 — multi-level wrapper around the last complete editor script. */
(function () {
  const SRC = 'https://raw.githubusercontent.com/T-arg/ESCD-Level-Editor/11e826960f3c6d79d81f57e027b9851670b037b2/index.html';

  const OLD_STATE = `const state = {
  rooms: [emptyRoom(0)], selected: 0, transporters: [], influences: [],
  exitRoom: 2, exitDoor: 0, levelName: 'level00', zoom: 1, editRoom: null
}`; 

  const NEW_STATE = `function levelNameFor(i) {
  return 'level' + String(i).padStart(2, '0');
}
function makeLevel(i) {
  return {
    rooms: [emptyRoom(0)], selected: 0, transporters: [], influences: [],
    exitRoom: 2, exitDoor: 0, levelName: levelNameFor(i), zoom: 1, editRoom: null
  };
}
const project = { levels: [makeLevel(0)], current: 0 };
let state = project.levels[0];

function syncLevelNames() {
  project.levels.forEach((lv, i) => { lv.levelName = levelNameFor(i); });
}
function renderLevelList() {
  const sel = document.getElementById('levelList');
  if (!sel) return;
  const cur = project.current;
  sel.innerHTML = project.levels.map((lv, i) =>
    '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + lv.levelName + '</option>'
  ).join('');
  const tag = document.getElementById('selLevel');
  if (tag) tag.textContent = '#' + String(cur).padStart(2, '0');
}
function switchLevel(i) {
  if (i < 0 || i >= project.levels.length) return;
  project.current = i;
  state = project.levels[i];
  const z = document.getElementById('zoom');
  if (z) z.value = Math.round((state.zoom || 1) * 100);
  applyZoom();
  renderLevelList();
  renderMap();
}
function addLevel() {
  const i = project.levels.length;
  if (i >= 32) { alert('Max 32 levels'); return; }
  project.levels.push(makeLevel(i));
  switchLevel(i);
}
function removeLevel() {
  if (project.levels.length <= 1) { alert('Need at least one level'); return; }
  project.levels.splice(project.current, 1);
  syncLevelNames();
  switchLevel(Math.min(project.current, project.levels.length - 1));
}
function levelsHHeader() {
  return [
    '#ifndef LEVELS_H',
    '#define LEVELS_H',
    '',
    '#define MAX_AMOUNT_OF_ROOMS                       32',
    '#define MAX_AMOUNT_OF_INFLUENCING_OBJECTS         16',
    '#define MAX_AMOUNT_OF_TRANSPORTERS                16',
    '#define AMOUNT_OF_ROOMS_AT_BYTE                   0',
    '#define AMOUNT_OF_TRANSPORTERS_AT_BYTE            1',
    '#define AMOUNT_OF_INFLUENCING_OBJECTS_AT_BYTE     2',
    '#define LEVEL_DOOR_DATA_START_AT_BYTE             3',
    '#define LEVEL_ROOM_DATA_START_AT_BYTE             4',
    '#define ROOMS_DATA_START_AT_BYTE                  5',
    '#define DOORS_DATA_START_AT_BYTE                  ROOMS_DATA_START_AT_BYTE + 1',
    '#define ELEMENTS_DATA_START_AT_BYTE               ROOMS_DATA_START_AT_BYTE + 5',
    '#define BYTES_USED_FOR_EVERY_ROOM                 13',
    '',
    ''
  ].join(String.fromCharCode(10));
}
function exportLevelsH() {
  syncLevelNames();
  const NL = String.fromCharCode(10);
  const bodies = project.levels.map(lv => exportLevelFrom(lv).trimEnd());
  const names = project.levels.map(lv => lv.levelName);
  let out = levelsHHeader();
  out += bodies.join(NL + NL) + NL + NL;
  out += '// pointer table in flash too \u2014 2 bytes per level, no SRAM copy' + NL;
  out += 'const unsigned char * const PROGMEM levels[] =' + NL + '{' + NL;
  out += '  ' + names.join(', ') + NL + '};' + NL + NL;
  out += '#define AMOUNT_OF_LEVELS  (sizeof(levels) / sizeof(levels[0]))' + NL + NL;
  out += '#endif' + NL;
  const blob = new Blob([out], {type: 'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'level.h';
  a.click();
  URL.revokeObjectURL(a.href);
}`;

  function mustReplace(code, a, b, label) {
    if (code.indexOf(a) < 0) throw new Error('patch missing: ' + label);
    return code.split(a).join(b);
  }

  fetch(SRC).then(r => r.text()).then(html => {
    const start = html.indexOf('<script>');
    const end = html.lastIndexOf('</script>');
    if (start < 0 || end < 0) throw new Error('editor script not found');
    let code = html.slice(start + 8, end);

    code = mustReplace(code, OLD_STATE, NEW_STATE, 'state');
    code = mustReplace(code,
      "document.getElementById('selTitle').textContent = room ? '#'+room.id : '\u2014';\n  document.getElementById('levelName').value = state.levelName;",
      "document.getElementById('selTitle').textContent = room ? '#'+room.id : '\u2014';\n  const sl = document.getElementById('selLevel');\n  if (sl) sl.textContent = '#' + String(project.current).padStart(2,'0');\n  document.getElementById('levelName').value = state.levelName;",
      'renderPanel');
    code = mustReplace(code, 'function exportLevel() {', 'function exportLevelFrom(src) {', 'export sig');
    code = mustReplace(code, '  const rooms = [...state.rooms].sort((a,b)=>a.id-b.id);',
      '  const rooms = [...src.rooms].sort((a,b)=>a.id-b.id);', 'rooms');
    code = mustReplace(code,
      '  state.transporters = rooms.filter(hasTeleport).map(r => (r.teleportTo == null ? 0 : +r.teleportTo));',
      '  src.transporters = rooms.filter(hasTeleport).map(r => (r.teleportTo == null ? 0 : +r.teleportTo));', 'tports');
    code = mustReplace(code, '  state.influences = rooms.filter(hasSwitch).map(r => ({',
      '  src.influences = rooms.filter(hasSwitch).map(r => ({', 'infs');
    code = mustReplace(code, '  const nT = Math.min(16, state.transporters.length);',
      '  const nT = Math.min(16, src.transporters.length);', 'nT');
    code = mustReplace(code, '  const nI = Math.min(16, state.influences.length);',
      '  const nI = Math.min(16, src.influences.length);', 'nI');
    code = mustReplace(code, '  const nextDoor = ((state.exitRoom & 0x3f) << 2) | (state.exitDoor & 3);',
      '  const nextDoor = ((src.exitRoom & 0x3f) << 2) | (src.exitDoor & 3);', 'nextdoor');
    code = mustReplace(code, '  let out = `const unsigned char PROGMEM ${state.levelName}[] =\\n{\\n`;',
      '  let out = `const unsigned char PROGMEM ${src.levelName}[] =\\n{\\n`;', 'name');
    code = mustReplace(code, '  out += `  ${bin8(state.exitRoom)},  // NEXT LEVEL ROOM\\n\\n`;',
      '  out += `  ${bin8(src.exitRoom)},  // NEXT LEVEL ROOM\\n\\n`;', 'exitroom');
    code = mustReplace(code,
      '  state.transporters.slice(0,nT).forEach((t,i) => { out += `  ${bin8(t & 0x3f)}, // T${i}\\n`; });',
      '  src.transporters.slice(0,nT).forEach((t,i) => { out += `  ${bin8(t & 0x3f)}, // T${i}\\n`; });', 'tslice');
    code = mustReplace(code, '  state.influences.slice(0,nI).forEach((inf,i) => {',
      '  src.influences.slice(0,nI).forEach((inf,i) => {', 'islice');
    code = mustReplace(code, "  document.getElementById('out').value = out;\n}",
      "  return out;\n}\nfunction exportLevel() {\n  document.getElementById('out').value = exportLevelFrom(state);\n}",
      'return');
    code = mustReplace(code, '  state.selected = 0;\n  renderMap();\n}',
      '  state.selected = 0;\n  state.levelName = levelNameFor(project.current);\n  renderMap();\n}',
      'import end');
    code = mustReplace(code,
      "document.getElementById('levelName').onchange = e => { state.levelName = e.target.value; exportLevel(); };",
      "document.getElementById('btnAddLevel').onclick = addLevel;\n" +
      "document.getElementById('btnRemoveLevel').onclick = removeLevel;\n" +
      "document.getElementById('levelList').onchange = e => switchLevel(+e.target.value);\n" +
      "document.getElementById('btnExportH').onclick = exportLevelsH;\n" +
      "document.getElementById('levelName').onchange = e => { state.levelName = e.target.value; exportLevel(); };",
      'buttons');
    code = mustReplace(code, 'applyZoom();\nrenderMap();', 'renderLevelList();\napplyZoom();\nrenderMap();', 'boot');

    (0, eval)(code);
  }).catch(err => {
    console.error(err);
    document.body.insertAdjacentHTML('beforeend',
      '<p style="padding:12px;color:#c0392b">Failed to load editor: ' + err.message + '</p>');
  });
})();

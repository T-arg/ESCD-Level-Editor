/* ESCD editor 0.8.4 - multi-level patcher */
(function () {
  const SRC = 'https://raw.githubusercontent.com/T-arg/ESCD-Level-Editor/11e826960f3c6d79d81f57e027b9851670b037b2/index.html';

  function once(code, a, b, label) {
    const i = code.indexOf(a);
    if (i < 0) throw new Error('patch missing: ' + label);
    return code.slice(0, i) + b + code.slice(i + a.length);
  }

  const EXTRA = [
    'function levelNameFor(i){return "level"+String(i).padStart(2,"0");}',
    'function makeLevel(i){return {rooms:[emptyRoom(0)],selected:0,transporters:[],influences:[],exitRoom:2,exitDoor:0,levelName:levelNameFor(i),zoom:1,editRoom:null};}',
    'const project={levels:[makeLevel(0)],current:0};',
    'let state=project.levels[0];',
    'function syncLevelNames(){project.levels.forEach(function(lv,i){lv.levelName=levelNameFor(i);});}',
    'function renderLevelList(){var sel=document.getElementById("levelList");if(!sel)return;sel.innerHTML=project.levels.map(function(lv,i){return "<option value="+i+(i===project.current?" selected":"")+">"+lv.levelName+"</option>";}).join("");var tag=document.getElementById("selLevel");if(tag)tag.textContent="#"+String(project.current).padStart(2,"0");}',
    'function switchLevel(i){if(i<0||i>=project.levels.length)return;project.current=i;state=project.levels[i];var z=document.getElementById("zoom");if(z)z.value=Math.round((state.zoom||1)*100);applyZoom();renderLevelList();renderMap();}',
    'function addLevel(){var i=project.levels.length;if(i>=32){alert("Max 32 levels");return;}project.levels.push(makeLevel(i));switchLevel(i);}',
    'function removeLevel(){if(project.levels.length<=1){alert("Need at least one level");return;}project.levels.splice(project.current,1);syncLevelNames();switchLevel(Math.min(project.current,project.levels.length-1));}',
    'function levelsHHeader(){return ["#ifndef LEVELS_H","#define LEVELS_H","","#define MAX_AMOUNT_OF_ROOMS                       32","#define MAX_AMOUNT_OF_INFLUENCING_OBJECTS         16","#define MAX_AMOUNT_OF_TRANSPORTERS                16","#define AMOUNT_OF_ROOMS_AT_BYTE                   0","#define AMOUNT_OF_TRANSPORTERS_AT_BYTE            1","#define AMOUNT_OF_INFLUENCING_OBJECTS_AT_BYTE     2","#define LEVEL_DOOR_DATA_START_AT_BYTE             3","#define LEVEL_ROOM_DATA_START_AT_BYTE             4","#define ROOMS_DATA_START_AT_BYTE                  5","#define DOORS_DATA_START_AT_BYTE                  ROOMS_DATA_START_AT_BYTE + 1","#define ELEMENTS_DATA_START_AT_BYTE               ROOMS_DATA_START_AT_BYTE + 5","#define BYTES_USED_FOR_EVERY_ROOM                 13","",""].join(String.fromCharCode(10));}',
    'function exportLevelsH(){syncLevelNames();var NL=String.fromCharCode(10);var bodies=project.levels.map(function(lv){return exportLevelFrom(lv).trimEnd();});var names=project.levels.map(function(lv){return lv.levelName;});var out=levelsHHeader();out+=bodies.join(NL+NL)+NL+NL;out+="// pointer table in flash too - 2 bytes per level, no SRAM copy"+NL;out+="const unsigned char * const PROGMEM levels[] ="+NL+"{"+NL;out+="  "+names.join(", ")+NL+"};"+NL+NL;out+="#define AMOUNT_OF_LEVELS  (sizeof(levels) / sizeof(levels[0]))"+NL+NL;out+="#endif"+NL;var blob=new Blob([out],{type:"text/plain"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="level.h";a.click();URL.revokeObjectURL(a.href);}'
  ].join('\n');

  fetch(SRC).then(function (r) { return r.text(); }).then(function (html) {
    var start = html.indexOf('<script>');
    var end = html.lastIndexOf('</script>');
    if (start < 0 || end < 0) throw new Error('editor script not found');
    var code = html.slice(start + 8, end);

    code = once(code,
      "const state = {\n  rooms: [emptyRoom(0)], selected: 0, transporters: [], influences: [],\n  exitRoom: 2, exitDoor: 0, levelName: 'level00', zoom: 1, editRoom: null\n};",
      EXTRA, 'state');

    code = once(code, 'function exportLevel() {', 'function exportLevelFrom(src) {', 'export sig');
    code = once(code, 'const rooms = [...state.rooms]', 'const rooms = [...src.rooms]', 'rooms');
    code = once(code, 'state.transporters = rooms.filter', 'src.transporters = rooms.filter', 'tports');
    code = once(code, 'state.influences = rooms.filter', 'src.influences = rooms.filter', 'infs');
    code = once(code, 'state.transporters.length', 'src.transporters.length', 'nT');
    code = once(code, 'state.influences.length', 'src.influences.length', 'nI');
    code = once(code, '((state.exitRoom & 0x3f) << 2) | (state.exitDoor & 3)', '((src.exitRoom & 0x3f) << 2) | (src.exitDoor & 3)', 'nextdoor');
    code = once(code, '${state.levelName}', '${src.levelName}', 'lname');
    code = once(code, '${bin8(state.exitRoom)}', '${bin8(src.exitRoom)}', 'exitroom');
    code = once(code, 'state.transporters.slice', 'src.transporters.slice', 'tslice');
    code = once(code, 'state.influences.slice', 'src.influences.slice', 'islice');
    code = once(code, "document.getElementById('out').value = out;\n}",
      "return out;\n}\nfunction exportLevel() {\n  document.getElementById('out').value = exportLevelFrom(state);\n}", 'return');
    code = once(code, "document.getElementById('levelName').onchange = e => { state.levelName = e.target.value; exportLevel(); };",
      "document.getElementById('btnAddLevel').onclick = addLevel;\ndocument.getElementById('btnRemoveLevel').onclick = removeLevel;\ndocument.getElementById('levelList').onchange = e => switchLevel(+e.target.value);\ndocument.getElementById('btnExportH').onclick = exportLevelsH;\ndocument.getElementById('levelName').onchange = e => { state.levelName = e.target.value; exportLevel(); };",
      'buttons');
    code = once(code, 'applyZoom();\nrenderMap();', 'renderLevelList();\napplyZoom();\nrenderMap();', 'boot');

    (0, eval)(code);
  }).catch(function (err) {
    console.error(err);
    document.body.insertAdjacentHTML('beforeend',
      '<p style="padding:12px;color:#c0392b">Failed to load editor: ' + err.message + '</p>');
  });
})();

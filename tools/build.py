"""Build a standalone game from the supplied release and readable gameplay fixes."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent.parent
with ZipFile(ROOT / 'Reino-de-Hierro.zip') as archive:
    html = archive.read('Reino-de-Hierro.html').decode('utf-8')

def replace_once(old, new):
    global html
    if html.count(old) != 1:
        raise RuntimeError(f'Unexpected upstream release: {old[:80]}')
    html = html.replace(old, new, 1)

# Replace the three legacy sites with the twenty authored campaign encounters.
import json
campaign = json.loads((ROOT / 'src/campaign.json').read_text())
replace_once('nh=th.lugares;', 'nh=' + json.dumps(campaign, ensure_ascii=False) + ';')
replace_once('for(let e of nh)this.scene.add(Jg(e));', '/* Campaign sites are created only when unlocked. */')
replace_once('function sh(e,t){', 'function sh(e,t){if(e>105&&e<285&&t<-170)return true;')
replace_once('nh.some(n=>Math.hypot(e-n.x,t-n.z)<6)', 'nh.some(n=>Math.hypot(e-n.x,t-n.z)<24)')
replace_once('function eg(e){return{saveVersion:1,', 'function eg(e){return{saveVersion:1,campana:e.campana??null,')

# Circular penetration must move away from the obstacle, not toward its center.
replace_once('let c=Math.sqrt(s)||1e-4,l=(o-c)/c;e.x=i.x+n*l,e.z=i.z+a*l,r=!0',
             'if(s<1e-12){e.x=i.x+o;r=!0;continue}let c=Math.sqrt(s),l=(o-c)/c;e.x+=n*l,e.z+=a*l,r=!0')
# Q + number issues orders and must never also spend mana on a spell.
replace_once('!this.modoMando&&!this._hayPanelAbierto()&&!this._hayPanelAbierto()',
             '!this.modoMando&&!this.input.abajo(`KeyQ`)&&!this.rey.muerto&&!this._hayPanelAbierto()')
# Tactical mode deliberately releases the mouse; this is not a pause request.
replace_once('document.pointerLockElement||this._hayPanelAbierto()||this.menu.abierto||this._abrirMenu()',
             'document.pointerLockElement||this.modoMando||this._hayPanelAbierto()||this.menu.abierto||this._abrirMenu()')
# Retain existing saved preferences, hide diagnostics for new players.
replace_once('fps:e?.fps??!0', 'fps:e?.fps??!1')
replace_once('fps:!0}}}var Iv=', 'fps:!1}}}var Iv=')
replace_once('window.__juego=Iv,await Iv.preparar(),Iv.iniciar();',
             'window.__juego=Iv;await Iv.preparar();\n' +
             (ROOT / 'src/gameplay.js').read_text() + '\n' + (ROOT / 'src/visual.js').read_text() + '\n' + (ROOT / 'src/city.js').read_text() + '\n' + (ROOT / 'src/experience.js').read_text() + '\n' + (ROOT / 'src/council.js').read_text() + '\n' + (ROOT / 'src/campaign.js').read_text() + '\nIv.iniciar();')
replace_once('</head>', '<style id="visual-theme">\n' + (ROOT / 'src/gameplay.css').read_text() + (ROOT / 'src/visual.css').read_text() + (ROOT / 'src/experience.css').read_text() + (ROOT / 'src/council.css').read_text() + (ROOT / 'src/campaign.css').read_text() + '\n</style></head>')
(ROOT / 'Reino-de-Hierro.html').write_text(html)
with ZipFile(ROOT / 'Reino-de-Hierro-mejorado.zip', 'w', ZIP_DEFLATED) as archive:
    archive.writestr('Reino-de-Hierro.html', html)
print('Built Reino-de-Hierro.html and Reino-de-Hierro-mejorado.zip')

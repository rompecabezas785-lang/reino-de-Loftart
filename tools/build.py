"""Build the original game plus the editable castle expansion, offline."""
from pathlib import Path
import zipfile, shutil
ROOT = Path(__file__).resolve().parents[1]
out = ROOT / 'dist'
out.mkdir(exist_ok=True)
with zipfile.ZipFile(ROOT/'base/Reino-de-Hierro-original.zip') as z:
    html = z.read('Reino-de-Hierro.html').decode()
needle='await Iv.preparar(),Iv.iniciar();'
assert html.count(needle)==1, 'Unsupported original game version'
api='{box:Z,cylinder:sf,person:uf,collider:ff,Group:Mn,Vector:U,Texture:Qt,Color:q,createResident:Gh,professions:dg,professionIds:ug}'
expansion=(ROOT/'src/castillo.js').read_text()
html=html.replace(needle, 'await Iv.preparar();\n'+expansion+'\nawait ampliarCastillo(Iv,'+api+');Iv.iniciar();')
(out/'Reino-de-Hierro.html').write_text(html)
shutil.copytree(ROOT/'assets',out/'assets',dirs_exist_ok=True)
print(out/'Reino-de-Hierro.html')

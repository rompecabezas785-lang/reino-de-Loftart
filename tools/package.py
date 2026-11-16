"""Rebuild the downloadable archive at the repository root."""
from pathlib import Path
import runpy
import zipfile

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools/build.py'))
target = ROOT / 'Reino-de-Hierro.zip'
temporary = ROOT / 'dist/Reino-de-Hierro-ampliado.zip'
with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as archive:
    archive.write(ROOT / 'dist/Reino-de-Hierro.html', 'Reino-de-Hierro.html')
    for path in sorted((ROOT / 'assets').iterdir()):
        if path.is_file():
            archive.write(path, 'assets/' + path.name)
    archive.writestr('LEEME.txt', '''REINO DE LOFTART — CASTILLO AMPLIADO

Extraé todo el ZIP conservando assets junto al HTML.
Desde la carpeta extraída ejecutá: python -m http.server 8001
Abrí Reino-de-Hierro.html desde ese servidor en un navegador con WebGL.

E: puertas, escaleras, termas y entrenamiento. WASD: movimiento.
Clic en el juego: capturar ratón. C: esquivar. P: habitantes.

Código editable e instrucciones:
https://github.com/rompecabezas785-lang/reino-de-Loftart
''')
with zipfile.ZipFile(temporary) as archive:
    assert archive.testzip() is None, 'Corrupt release archive'
target.write_bytes(temporary.read_bytes())
print(target)

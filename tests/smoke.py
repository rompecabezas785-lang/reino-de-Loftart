"""Compatibility entry point for the castle integration checks."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('behavior.py')),run_name='__main__')

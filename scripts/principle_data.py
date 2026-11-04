"""Read one bilingual principle per JSON file, keyed by its permanent ID."""
import json
from pathlib import Path


def load_principles(root):
    directory = Path(root) / '_data' / 'principles'
    paths = sorted(directory.glob('*.json'))
    if not paths:
        raise ValueError(f'No principle records found in {directory}')
    records = []
    for path in paths:
        record = json.loads(path.read_text())
        if not isinstance(record, dict) or record.get('id') != path.stem:
            raise ValueError(f'Principle ID must match its filename: {path}')
        records.append(record)
    return sorted(records, key=lambda record: (record['source'], record['id']))

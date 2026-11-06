"""Verify independent principle discovery and filename/ID safeguards."""
import json
import tempfile
from pathlib import Path
from principle_data import load_principles

with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    directory = root / '_data' / 'principles'
    directory.mkdir(parents=True)
    try:
        load_principles(root)
        raise AssertionError('An empty principle directory must fail')
    except ValueError:
        pass
    for name, source in [('second', 2), ('first', 1)]:
        record = {'id': name, 'source': source, 'fa': {'description': 'متن'}, 'en': {'description': 'Text'}}
        (directory / f'{name}.json').write_text(json.dumps(record))
    assert [row['id'] for row in load_principles(root)] == ['first', 'second']
    # A newly added file is discovered without a registry or aggregate file.
    (directory / 'third.json').write_text(json.dumps({'id': 'third', 'source': 3}))
    assert len(load_principles(root)) == 3
    (directory / 'mismatch.json').write_text(json.dumps({'id': 'first', 'source': 4}))
    try:
        load_principles(root)
        raise AssertionError('Mismatched filename/ID must fail')
    except ValueError:
        pass

print('Passed separate principle discovery, source order, and filename/ID validation.')

root = Path(__file__).resolve().parent.parent
categories = json.loads((root / '_data/principle-categories.json').read_text())
ids = [category['id'] for category in categories]
assert len(ids) == len(set(ids)), 'Duplicate topic IDs'
assert all(category.get('fa') and category.get('en') for category in categories)
records = load_principles(root)
for record in records:
    assigned = record['categories']
    assert assigned and len(assigned) == len(set(assigned)), record['id']
    assert set(assigned) <= set(ids), record['id']
assert all(any(topic in record['categories'] for record in records) for topic in ids), 'Empty topic'
print(f'Passed {len(categories)} bilingual topics and valid, nonempty memberships for {len(records)} principles.')

#!/usr/bin/env python3
"""Check separate root summaries and verse meanings in supplied verse units."""
import argparse
from html.parser import HTMLParser
from pathlib import Path


class RootBoxes(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.errors = []
        self.count = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag != 'button' or 'word-link' not in attrs.get('class', '').split():
            return
        generic_notes = {
            'واژهٔ دستوری؛ ریشهٔ اشتقاقی برای این کاربرد درج نمی‌شود.',
            'Grammatical word; no derivational root is assigned for this use.',
        }
        if attrs.get('data-context', '').strip() and attrs.get('data-root-note') in generic_notes:
            self.errors.append(
                f'{self.path}:{self.getpos()[0]}: '
                f'{attrs.get("data-word", "?")} retains a redundant grammar placeholder'
            )
        if not attrs.get('data-root', '').strip():
            return
        self.count += 1
        for field in ('data-root-meaning', 'data-context'):
            if not attrs.get(field, '').strip():
                self.errors.append(
                    f'{self.path}:{self.getpos()[0]}: '
                    f'{attrs.get("data-word", "?")} missing {field}'
                )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('files', nargs='+', type=Path)
    args = parser.parse_args()
    errors = []
    count = 0
    for path in args.files:
        boxes = RootBoxes(path)
        boxes.feed(path.read_text(encoding='utf-8'))
        errors.extend(boxes.errors)
        count += boxes.count
    if errors:
        print('\n'.join(errors))
        return 1
    print(f'PASS: {count} lexical word boxes have root summaries and verse meanings.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

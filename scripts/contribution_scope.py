"""Submitted writings are an independent collection, never Quran search input."""
import re
from urllib.parse import urlsplit


def is_contribution(url):
    return bool(re.match(r'^/(?:fa|en)/contributions(?:/|$)', urlsplit(url).path))

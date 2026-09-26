import requests


def fetch_profile(uid):
    return requests.get(f"/profiles/{uid}")


def slug(text):
    return text.lower()

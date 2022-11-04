# Bitwarden Contributing Docs

The current version of the docs are accessable at:

* https://contributing.bitwarden.com/

## Install

```
python3 -m venv env

# Mac
source ./env/bin/activate

# Windows
.\env\Scripts\Activate.ps1

pip install -r ./requirements.txt
```

## Preview

```
mkdocs serve
```

## Writing

The contributing documentation is written using [MkDocs](https://www.mkdocs.org/), with the [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) theme. The Material theme provides many features, please take a moment to read through the [reference](https://squidfunk.github.io/mkdocs-material/reference/) section of their documentation.

The MkDocs config lives in the `mkdocs.yml` configuration file which also contains the navigation.


## Deploy

Deployments are handled by the Cloudflare action. Simply push the changes to the `main` branch and they will go live in a couple of minutes.

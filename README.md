# Bitwarden Contributing Docs

The current version of the docs are accessable at:

- https://contributing.bitwarden.com/

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

### Style Guide

Please follow the following (very brief) style guide:

- Use numbered paragraphs for all instructions or procedures. Start each paragraph with a verb (“click”, “type”, “restart”, etc)
- Use code blocks for all commands. Don’t write them in-line
- Avoid long paragraphs - this documentation should be to-the-point and instructional
- Please always remember that this documentation is public, be sure to scrub any personal data or sensitive information. Always indicate areas that must be filled in by the user and how to do so.

## Deploy

Deployments are handled by a Cloudflare action. Simply push the changes to the `main` branch and they will go live in a couple of minutes.

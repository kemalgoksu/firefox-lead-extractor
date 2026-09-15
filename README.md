# LeadFox

A privacy-first Firefox extension that finds emails, phone numbers, and social profile links on the active page. Saved contacts stay in Firefox local extension storage and can be exported as CSV.

Requires Firefox desktop 142 or newer. Phone extraction uses clickable `tel:` links.

## Install locally

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Choose **Load Temporary Add-on**.
3. Select `manifest.json` in this folder.
4. Open a normal web page and click the LeadFox toolbar icon.

LeadFox requests temporary access to the active tab when you open it. It injects the scanner at click time, reads the main document plus accessible frames and open shadow DOM, then discards the page snapshot. Tabs that were already open do not need to be refreshed after installing or reloading the extension.

Temporary add-ons are removed when Firefox restarts. For permanent distribution, package and sign the extension through Mozilla Add-ons.

## Development

Run the dependency-free unit tests with `npm test` or `node --test tests/*.test.js`.

For AMO validation and packaging, run `npm ci --ignore-scripts`, `npm run lint`,
and `npm run build`. The upload ZIP is written to `dist/`.
See [AMO submission details](docs/AMO-SUBMISSION.md), [privacy policy](PRIVACY.md),
and [MIT license](LICENSE).

The extension scans when its popup opens or when you press the rescan button. It does not cache page snapshots, observe page changes, crawl in the background, or send contact data over the network. Firefox-internal pages such as `about:` and the add-on store cannot be scanned.

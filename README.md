# LeadFox

A privacy-first Firefox and Chrome extension that finds emails, phone numbers, and social profile links on the active page. Saved contacts stay in local extension storage and can be exported as CSV.

Requires Firefox desktop 142 or newer, or a current Chromium-based browser. Phone extraction uses clickable `tel:` links.

## Install locally in Firefox

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Choose **Load Temporary Add-on**.
3. Select `manifest.json` in this folder.
4. Open a normal web page and click the LeadFox toolbar icon.

LeadFox requests temporary access to the active tab when you open it. It injects the scanner at click time, reads the main document plus accessible frames and open shadow DOM, then discards the page snapshot. Tabs that were already open do not need to be refreshed after installing or reloading the extension.

Temporary add-ons are removed when Firefox restarts. For permanent distribution, package and sign the extension through Mozilla Add-ons.

## Install locally in Chrome

1. Run `npm ci --ignore-scripts` and `npm run build:chrome`.
2. Extract `dist/leadfox-chrome.zip` to a folder.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Choose **Load unpacked** and select the extracted folder.

The checked-in manifest remains Firefox-ready. The Chrome build uses the same source files and automatically removes only Firefox-specific manifest fields.

## Development

Run the dependency-free unit tests with `npm test` or `node --test tests/*.test.js`.

Run `npm ci --ignore-scripts`, `npm test`, and `npm run lint` to validate the extension.
`npm run build` creates `dist/leadfox-firefox.zip` and `dist/leadfox-chrome.zip`.
You can build one target with `npm run build:firefox` or `npm run build:chrome`.
See [AMO submission details](docs/AMO-SUBMISSION.md), [privacy policy](PRIVACY.md),
and [MIT license](LICENSE).

The extension scans when its popup opens or when you press the rescan button. It does not cache page snapshots, observe page changes, crawl in the background, or send contact data over the network. Browser-internal pages and extension stores cannot be scanned.

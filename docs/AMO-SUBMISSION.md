# LeadFox AMO submission

## Upload

- Upload `dist/leadfox-2.0.0.zip` at https://addons.mozilla.org/developers/addon/submit/distribution.
- Choose **On this site** for a public AMO listing.
- Supported application: Firefox desktop 142 or newer. Android support is not declared.
- License: **MIT**.
- No payments, account, additional software, or hardware required.
- Separate source archive: **No**. The package contains the original readable JavaScript,
  HTML, CSS, and SVG. No compilation, bundling, minification, or remote dependencies.
- Suggested category: **Other** (select the closest available productivity category).
- Suggested slug: `leadfox`, subject to AMO availability.
- Set your preferred public support contact in the listing; no email address is embedded.
- Paste `PRIVACY.md` into the privacy-policy field.

The permanent add-on ID is `leadfox@kemalgoksu.com`. It replaces the development ID
`lead-pocket@local.extension` before the first AMO submission. Firefox treats
these as separate extensions; saved development contacts do not migrate automatically.
Do not change the permanent ID after submission. For future releases, upload through
the existing AMO listing and increment the version.

## Listing text

### Name

LeadFox

### Summary

Find emails, phone links, and social profiles on the current page. Save leads locally and export CSV.

### Description

LeadFox helps you collect contact details from the page you are viewing.
Open the toolbar popup to scan, then save the contacts you want to named lists.

- Find email addresses in page text and email links.
- Extract phone numbers from clickable telephone links.
- Discover supported social profile links, including LinkedIn, Instagram, X, and GitHub.
- Create, rename, and search contact lists.
- Move or delete selected contacts and avoid duplicates within a list and source domain.
- Copy saved emails or export one list or all lists to CSV.

Your saved contacts stay in Firefox local extension storage. LeadFox has no
accounts, analytics, background crawling, or server uploads. It scans only when
you open its popup or press rescan. It can inspect accessible frames and open
shadow roots; protected Firefox pages and inaccessible frames cannot be scanned.
Results depend on the page content, and phone numbers must be telephone links.

### Version notes

LeadFox 2.0.0 introduces the LeadFox name and fox icon, local contact lists,
search, bulk contact management, and CSV export. This release declares no data
transmission, clears temporary scan snapshots, and tolerates malformed contact links.

## Notes for reviewers

No account or credentials are needed. All runtime code is included in the upload.
The extension has no background script, host permissions, remote code, or network APIs.
Opening the popup injects `content/scanner.js` using `scripting.executeScript` and
the temporary `activeTab` grant. A second injection retrieves and deletes the isolated
snapshot; a 15-second expiry clears it if the popup closes before retrieval.

Permissions:

- `activeTab`: access the page the user explicitly chooses to scan.
- `scripting`: inject the packaged scanner at the user's request.
- `storage`: persist user-selected contacts and lists locally.
- `downloads`: save user-requested CSV exports via a local Blob URL.

The `none` data declaration means no transmission to the developer or third-party
services. Page data is processed locally. User-requested clipboard and file exports
are local operations. Clicking a source or social link performs ordinary navigation.

## Manual Firefox smoke check before publishing

For a first install in a fresh Firefox profile, confirm that LeadFox appears on
the navigation toolbar beside the address bar (`action.default_area: navbar`).
Firefox remembers prior placement for an extension ID, including after reinstall;
existing test profiles may need the user to pin the button manually. Users can
change its placement after installation.

1. Load the packaged extension through `about:debugging` in Firefox 142+.
2. Serve the repository with a static HTTP server and open `tests/fixtures/contact.html`.
3. Open LeadFox. Expect `hello@example.com`, `sales@example.org`, `+14155552671`,
   and the example LinkedIn profile. Malformed links must not stop the scan.
4. Save a contact; it changes to Saved. Create a second list and save another contact.
5. Open Manage lists; check search, rename, move, delete, and persistence after reopening.
6. Copy emails and export a list and all lists; confirm the CSV content and filenames.
7. Open `about:addons` and try scanning; expect the protected-page message.
8. Capture optional listing screenshots from the actual popup and manager with sample
   contacts. Do not include personal contact data in screenshots.

Automated tests and lint do not replace this Firefox UI check. Mozilla performs its
own validation and signing after upload; this package is unsigned.

## Rebuild

With Node.js and npm installed:

```sh
npm ci --ignore-scripts
npm test
npm run lint
npm run build
```

Only runtime assets, the MIT license, and privacy policy are shipped. Development
dependencies, tests, documents, and alternative icon concepts are excluded.

Official references:

- https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
- https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/

# Codex Pets zero-native Shell

macOS desktop wrapper for the root Codex Pet Share Vite app using
`zero-native` with the system WebView.

The desktop shell opens the production app at `https://codex-pets.net` so it
uses production API, realtime, and asset data during verification. Packaging
still builds and stages the root Vite app so the checked-in web assets stay
validated with the desktop bundle.

## Setup

```bash
brew install zig
cd ../..
npm install
cd native/zero-native
npm install
```

Run commands from this folder:

```bash
npm run validate
npm run test
npm run verify:prod-readonly
npm run run
```

`npm run run` builds the root app, copies the generated Vite assets into this
folder's generated `dist/`, then opens the native macOS window against the
production app origin. The wrapped app keeps using the root repository's
existing API and realtime provider contract.

For a local `.app` bundle:

```bash
npm run package
```

The package step creates, signs, verifies, and archives
`zig-out/package/Codex Pets.app` and `zig-out/package/Codex Pets-macOS.zip`.

`npm run verify:prod-readonly` checks the production API and image asset URLs
used by the native shell without creating accounts, uploading pets, liking,
downloading packages, or requesting notification permission.

## Native Features

- System WKWebView shell pointed at `https://codex-pets.net`.
- App icon generated from `public/assets/petshare-icon.png`.
- External GitHub and X links open in the system browser.
- App menu item for macOS notifications when new pets appear in production.

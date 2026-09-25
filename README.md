# Socials for Meta Ray-Ban Display

Socials is an experimental Web App launcher for TikTok For You and Instagram Reels. It currently does **not** provide working access to either feed on Meta Ray-Ban Display glasses.

## Important limitation

TikTok and Instagram block their full sites from being embedded in another app. Socials therefore tries to open their own sites in the same browser view. In a real-glasses test on 25 September 2026, selecting either service reached Socials (the `Opening…` message appeared), but the page remained on Socials and then displayed `cannot open here`. Desktop browser navigation worked; it did not predict this device result. This project does not access a private feed API or collect account credentials.

## Run locally

Serve this directory from any static file server, such as `npx serve .`, and test at a 600 × 600 browser viewport. Arrow keys move between the two choices; Enter opens the focused service.

## Install on glasses

Host the files at a public HTTPS URL (GitHub Pages works). In the Meta AI phone app, enable Developer Mode, then go to **App Settings → App Connections → Web Apps → Add a Web App**. Enter **Socials** and the hosted URL. The app appears in the glasses' app grid.

## On-device check

The current hardware result is an unresolved external-navigation failure. Registering the TikTok and Instagram URLs as separate glasses Web Apps loads the sites, but their cookie consent screens were not operable with the user's glasses controls in the 25 September 2026 on-device test. Feed scrolling and video playback were therefore not reached or verified. The direct-site route is not a working replacement for Socials. The source sites may change their browser behavior at any time.

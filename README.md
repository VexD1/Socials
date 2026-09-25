# Socials for Meta Ray-Ban Display

Socials is a small Web App launcher for TikTok For You and Instagram Reels. Choose either service with the Neural Band or glasses touchpad; use the glasses' Back action to return and choose the other.

## Important limitation

TikTok and Instagram block their full sites from being embedded in another app. Socials therefore opens their own sites in the same browser view. Sign-in, video playback, navigation, and returning with Back depend on those sites and the current glasses browser. They have not been verified on physical glasses. This project does not access a private feed API or collect account credentials.

## Run locally

Serve this directory from any static file server, such as `npx serve .`, and test at a 600 × 600 browser viewport. Arrow keys move between the two choices; Enter opens the focused service.

## Install on glasses

Host the files at a public HTTPS URL (GitHub Pages works). In the Meta AI phone app, enable Developer Mode, then go to **App Settings → App Connections → Web Apps → Add a Web App**. Enter **Socials** and the hosted URL. The app appears in the glasses' app grid.

## On-device check

Open both services, verify sign-in and video playback, and use the glasses' Back action to return to Socials. The source sites may change their browser behavior at any time.

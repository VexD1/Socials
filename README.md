# Socials · TikTok for Meta Ray-Ban Display

A glasses-controlled viewer for individual public TikTok clips. It uses TikTok's [official Embed Player](https://developers.tiktok.com/docs/en/embed-player) inside a Socials screen. It does not access a signed-in TikTok For You feed or require your TikTok password.

## Controls

| Glasses D-pad | Action |
| --- | --- |
| Up / down | Previous / next clip |
| Pinch (Select) | Play or pause, and enable sound |
| Right | Save or unsave the clip |
| Left | Open the menu |

The menu contains starter clips, saved clips, and a form for adding full TikTok video URLs. Saved clips stay in this Web App's browser storage on the device; they are not synced across devices. Shared short URLs (`vm.tiktok.com` / `vt.tiktok.com`) must be expanded to full `/@creator/video/…` URLs first.

## Install on glasses

Use **https://vexd1.github.io/Socials/** as the Web App URL in the Meta AI phone app under **App Settings → App Connections → Web Apps → Add a Web App**. If Socials was already connected, reopen it after the new deployment; reconnect if the old screen remains cached.

## Test locally

Serve the directory from a static server and open at a 600 × 600 viewport. Arrow keys simulate the D-pad, Enter simulates pinch. The [Meta Ray-Ban Display Simulator Chrome extension](https://github.com/facebook/meta-wearables-webapp#display-simulator-chrome-extension) can check layout and input behavior. The simulator cannot confirm on-device TikTok playback; test a clip on actual glasses before treating it as fully verified.

## Limits

Starter clips are a small curated set, not an endless discovery service. A clip may become private, be removed, or be blocked from embedding; skip to the next. The app only stores TikTok post IDs and labels locally. It does not store credentials or download videos.

**Known hardware risk:** TikTok may place a cookie choice inside its cross-origin player. Socials cannot activate that choice through TikTok's documented player messaging API. A 600 × 600 desktop browser check confirmed the cookie panel appears in the UK. The actual glasses result is pending; do not assume this build is usable until the cookie choice and playback are tested on device. The older full-site route also failed at its cookie screen on the user's glasses.

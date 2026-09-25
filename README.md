# Socials · TikTok for Meta Ray-Ban Display

A glasses-controlled viewer for individual public TikTok clips. It uses TikTok's [official Embed Player](https://developers.tiktok.com/docs/en/embed-player) inside a Socials screen. It does not access a signed-in TikTok For You feed or require your TikTok password.

## Controls

| Glasses D-pad | Action |
| --- | --- |
| Up / down | Previous / next clip |
| Pinch (Select) | Play or pause, and enable sound |
| Right | Save or unsave the clip |
| Left | Open the menu |

The menu contains a Discover catalog, saved clips, and a form for adding full TikTok video URLs. Saved clips stay in this Web App's browser storage on the device; they are not synced across devices. Shared short URLs (`vm.tiktok.com` / `vt.tiktok.com`) must be expanded to full `/@creator/video/…` URLs first.

Discover learns from playback time reported by TikTok's Embed Player: finishing most of a clip or watching for 20 seconds raises that creator's chance of appearing next; quickly skipping lowers it. Saving a clip also raises its creator's preference. The algorithm keeps mixing in other creators and avoids showing the same creator repeatedly. Preferences and view counts are stored only in this Web App's local browser storage, can be cleared with **Reset recommendations**, and are never sent to a Socials server. This does not alter the TikTok account's own recommendations.

## Install on glasses

Use **https://vexd1.github.io/Socials/** as the Web App URL in the Meta AI phone app under **App Settings → App Connections → Web Apps → Add a Web App**. If Socials was already connected, reopen it after the new deployment; reconnect if the old screen remains cached.

## Test locally

Serve the directory from a static server and open at a 600 × 600 viewport. Arrow keys simulate the D-pad, Enter simulates pinch. The [Meta Ray-Ban Display Simulator Chrome extension](https://github.com/facebook/meta-wearables-webapp#display-simulator-chrome-extension) can check layout and input behavior. The simulator cannot confirm on-device TikTok playback; test a clip on actual glasses before treating it as fully verified.

## Limits

The Discover catalog currently has over 200 public creator clips. A [weekly GitHub Action](.github/workflows/refresh-catalog.yml) refreshes it from [TokGauge's public creator link listings](https://tokgauge.com/). This is a best-effort catalog, not TikTok's personal For You feed or an endless live feed. The [update script](scripts/update_catalog.py) preserves the last valid catalog when discovery fails; five hard-coded clips remain as a fallback if fetching the catalog fails on the glasses. If the scheduled workflow stops or the public listings change, run the workflow manually or update the source list.

A clip may become private, be removed, or be blocked from embedding; skip to the next. The app only stores TikTok post IDs and labels locally. It does not store credentials or download videos.

The user confirmed that the five-clip build plays on their glasses. TikTok can still show a cookie choice inside its cross-origin player, and individual videos can fail; Socials cannot activate the choice through TikTok's documented player messaging API. The older full-site route failed at its cookie screen on the user's glasses.

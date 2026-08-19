---
name: Mobile icon assets
description: Durable packaging note for the AEMP web and Capacitor Android builds.
---

For AEMP, changing the app icon means updating both the PWA icon files and the native Android mipmap resources, then running Capacitor sync so the web assets are copied into Android.

**Why:** Capacitor does not replace native launcher resources from the web icon alone, and Android launchers use density-specific files.

**How to apply:** Keep the supplied square logo as the source, generate the standard web and Android density sizes with the workspace image tooling, and run `cap:sync` after a mobile UI or asset change.
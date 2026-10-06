# Aurora — test build, 6 October 2026

Test app: https://keidsolo24.github.io/SPECTRUM-/

Phone and desktop: launch screen → tutorial → first-time setup → Home, Spaces, Board and Plan. Existing local setup goes straight to the app after tapping the logo.

Open Settings → account/sync. Create an account and confirm the email once, or sign in to an existing account. Use the same account on both devices. Guest mode saves only on the current device.

This test uses `aurora_test_state_v13` and `aurora_test_commit_v13` with account-scoped row-level security. Older schema-6 cloud data remains in its original table; it is not automatically imported into this clean test. Media uses the existing private `aurora-media` bucket, with multipart transfer for large files. Do not put administrative keys in this static site.

The mobile and desktop tutorial soundtracks use the supplied K9 beat, mastered quietly. User-selected card colours remain available. The old purple and green background choices have been removed.

All files in this release folder belong in the repository root. Relative paths work under the GitHub Pages repository URL. `supabase-test-v13.sql` documents the additive backend setup already applied for this release. Build source is maintained in the local Aurora workspace.

English is the default interface language. Choose Czech in Settings → Language; the choice stays on this device. User-written card names, notes and other content are never translated. The tutorial video is in English.

Testing: automated first-run/resume/returning flows, responsive layouts, simulated two-device sync, offline recovery, media round-trip, large-media chunk verification. Physical iOS/Android and real email delivery still need user acceptance testing.


October 6 refinements: bounded mobile content above navigation; responsive Home summaries; centered empty Home/Spaces/Board states; natural media aspect ratios; standalone Board notes; four-line text previews with full details on open; item editing by tap or long press; explicit daily/weekly scheduling; neutral frosted-glass surfaces. Habit card items no longer repeat automatically. Existing data and cloud schema are preserved.

Validation for this update: five viewport sizes (320×568 through 1440×900), complete mobile/desktop first-run flow, English/Czech note and media actions, editing/completion/weekly schedule checks, and simulated keyboard viewport changes in onboarding, card fields, add forms, settings and login. Physical iPhone standalone keyboard behavior still needs device confirmation.

October 6 update 2: Solid panels derive opaque colors from the active wallpaper, including uploaded images, in light and dark mode. The material preview uses the current wallpaper. A short English/Czech introduction explains Home, Spaces, Board and Plan before the tutorial and setup. Existing users see this introduction once; Tutorial & setup can be replayed from Settings without deleting content. Setup completion uses an explicit persisted flag, and weekly setup tasks retain their chosen weekday.

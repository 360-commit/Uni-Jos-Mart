# Uni-Jos Mart (Firebase + Cloudinary)
Static app: no server to run. Data in Firestore, login with Firebase Auth, photos on Cloudinary.

## Deploying to Vercel
Set the project Root Directory to the repository root. `vercel.json` publishes `public/` as a static site, and the obsolete `legacy/` JSON-file server is excluded. Do not set `legacy/` as the Vercel project root; its local file storage is not suitable for Vercel's serverless filesystem.

## Setup (no card needed)
1. console.firebase.google.com: create project, stay on Spark. Add a Web app and copy its config into `public/js/firebase-config.js`. Enable Google Analytics for the project (or enable it under Project settings > Integrations), then copy the web app's `measurementId` (starts with `G-`) into the same config file. Analytics screen tracking remains disabled until this value is set.
2. Build > Authentication > Sign-in method: enable Email/Password.
3. Build > Firestore Database: create (production mode), choose a region close to Nigeria (europe-west1 or eu-west2 are the nearest).
4. cloudinary.com: free account. Settings > Upload > add an UNSIGNED upload preset (folder `unijosmart`, max file 5MB, allowed formats jpg,png,webp). Put cloud name and preset name in `firebase-config.js`.
5. `npm i -g firebase-tools`, then `firebase login`, `firebase init` (reuse existing files), then `firebase deploy`. This publishes the site, the security rules and the indexes.
6. Local test: `cd public && python3 -m http.server 8000` (add localhost to Auth > Settings > Authorized domains).

## Crash prevention built in
- Every list query is capped (40) and cached 45 seconds; seller details are copied into each item, so one page load costs about 40 reads, not hundreds.
- Indexes for category and "my items" are declared in `firestore.indexes.json`; deploy them or filters will fail.
- Chat listeners are closed when you leave a chat; messages are limited to 500 characters, 1 per second, last 60 loaded.
- Photos are shrunk in the browser then optimized by Cloudinary; the database holds only a short link.
- Offline cache is on, so repeat visits cost fewer reads on weak networks.
- Quota or network errors show a friendly message instead of a blank page.
- Matric numbers are unique (enforced by the database), and security rules block editing other people's items, profiles and chats.

## Watch these
- Spark free quota: 50,000 reads and 20,000 writes per day. Watch Usage in the console. If you pass it, the app pauses until the next day; add a card later (Blaze) with a budget alert.
- Search only scans the newest 40 items. For many campuses, add Algolia or Typesense.
- Old listings keep the seller's old name or phone after a profile edit.
- Cloudinary free plan has monthly credits; check its dashboard.
- Firebase Analytics records app screen views using generic screen names (for example `item` or `chat`), not item or chat IDs. Review the Analytics data in Firebase or Google Analytics.

## New in this version
Search (keywords), Free / Giveaway category, meeting-point list, saved items, seller ratings (after the seller taps "Deal done" in the chat), report buttons, dark mode.
- Run `firebase deploy` again so the new rules and the search index are published. A new index can take a few minutes to build.
- Reports: Firebase console > Firestore > `reports`. Delete a listing there (items collection) if a report is valid.
- Only items created after this update are searchable (they carry search keywords).

## Round 2: photos, chat images, verified badge, install as app
- Up to 4 photos per item, photos in chat, installable app (Add to Home Screen) with offline shell.
- Become admin: Firebase console > Authentication > copy your UID. Then Firestore > Start collection `admins` > Document ID = your UID > add any field (for example role = admin).
- Admin tools: open `#/admin` in the app to see reports and delete items. On any seller reviews page you will see their matric number and email so you can check proof, then give or remove the Verified badge.
- Run `firebase deploy` again to publish the new rules.

## Unread badge
A small badge on the Chats tab (and the browser tab title) shows how many conversations have a new message. It uses one live listener limited to your 20 newest chats, so it costs about 20 reads at start and 1 per new message. Chats appear in the list after the first message. Run `firebase deploy` so the new rules and the chats index are published.

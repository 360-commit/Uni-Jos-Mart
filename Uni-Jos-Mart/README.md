# Uni-Jos Mart

Static marketplace frontend using Appwrite Cloud for authentication, database, and realtime updates, with Cloudinary for image uploads and delivery.

## Appwrite setup

1. Create an Appwrite Cloud project and add a **Web platform** for the deployed domain and `localhost` if you will test locally. Use the region-specific endpoint shown in the project console.
2. Create one database. Create tables with these IDs (or change the IDs in `public/js/appwrite-config.js`):
   - `users`: `payload` (required string, 16,384 chars), `ownerId` (string)
   - `publicUsers`: `payload`, `ownerId`
   - `items`: `payload`, `sellerId`, `category`, `created` (integer), `kw` (string array)
   - `chats`: `payload`, `participants` (string array), `updated` (integer)
   - `messages`: `payload`, `chatId`, `t` (integer), `from`
   - `saved`: `payload`, `ownerId`, `t` (integer)
   - `reports`: `payload`, `by`, `type`, `ref`, `t` (integer)
   - `reviews`: `payload`, `sellerId`, `buyerId`, `t` (integer)
   - `verified`: `payload`, `ownerId`
   - `admins`: `payload`, `ownerId`
   - `matrics`: `payload`, `ownerId`

   Use string columns with enough capacity for the listed profile or listing data. Enable row security on every table. Add key indexes for item sorting/filtering (`created`, `sellerId + created`, `category + created`, `kw + created`), chats (`participants`, `updated`), messages (`chatId + t`), saved (`ownerId + t`), reviews (`sellerId + t`), and reports (`t`).
3. Configure table-level access so authenticated users can create rows and public visitors can read the `items`, `publicUsers`, `reviews`, and `verified` tables. Keep row security enabled; the app assigns per-row read/write permissions for private profiles, saved items, and chats.
4. Create a Cloudinary unsigned upload preset. Restrict it to image formats, a dedicated folder, and a suitable file size. The cloud name and preset are public values in `public/js/appwrite-config.js`; never put an Appwrite API key or Cloudinary API secret in client code.
5. Copy the endpoint, project ID, database ID, and table IDs into `public/js/appwrite-config.js`. These are public client settings; **never put an Appwrite API key or server secret in this file**.
6. To enable free Appwrite Analytics, add your deployed domain as a **Web app** in the Appwrite project, then create an Analytics property for the site. Copy its property ID into `analyticsPropertyId` in `public/js/appwrite-config.js`. Analytics is disabled while this value is blank. The Free plan includes 50,000 events per month, one property per project, and 30 days of dashboard retention; automatic pageviews, outbound link clicks, scroll depth, and engagement time all count toward that event limit. Tracking respects the browser's Do Not Track setting.
7. Publish the static `public/` directory using the repository's existing Vercel configuration.

The login screen includes password recovery. Appwrite redirects reset emails to the app's deployed root URL; make sure that hostname is added as a Web platform in the project. Users can request a reset link from **Forgot your password?**, then choose a new password from the email link. Signup and password reset show a live strength guide; passwords must still be at least 8 characters.

To grant admin access, assign the `admin` label to the Appwrite user and create an `admins` row using that user's ID as the row ID, with `ownerId` set to the same ID and `payload` set to `{}`. Grant that user read access to the row.

## Important security and migration notes

- The Appwrite client integration is prepared for the project IDs, but this repository does not yet include a trusted Appwrite Function for validating all writes. Client-side checks and row permissions alone cannot enforce database rules against a modified browser client. Before a public launch, route sensitive writes (account profile/matric uniqueness, listing creation/status, chat creation/messages, reports, reviews, and admin actions) through an Appwrite Function that validates the signed-in user and input on the server. Do not treat the current client-only write paths as production-secure.
- The new Appwrite project starts empty: no old accounts, listings, chats, saved items, reviews, or reports are migrated. Existing Cloudinary image URLs continue to work if their assets and account remain available. Users must create new Appwrite accounts.
- The app requires the Appwrite tables, columns, indexes, and permissions above. Until its IDs are entered in the config, it reports that Appwrite is not configured.
- The feed displays up to 40 listings. Search is applied to the newest 100 matching records.
- Listing photos and chat photos upload to Cloudinary. Limit uploads in the Cloudinary preset.

## Safety guidance

Meet on campus, inspect an item before paying, and ask for proof of ownership and a receipt. Report suspicious listings or messages.

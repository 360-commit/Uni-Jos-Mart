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

### Admin access and student verification

To grant admin access, assign the `admin` label to the Appwrite Auth user. Then create an `admins` row with:

- **Row ID:** the admin's Appwrite Auth user ID
- **`ownerId`:** the same admin user ID
- **`payload`:** `{}`

Grant that admin read access to the row. The app uses this row to identify admins and the `admin` label for permissions on verified-badge records.

To give a student the verified badge:

1. Confirm the student's identity and current University of Jos enrollment using the verification process your team trusts. Do not rely on a profile photo alone.
2. In Appwrite Console, open **Auth → Users** and find the student's account. Copy their Appwrite user ID.
3. Open the `users` table and find the profile row whose row ID matches that user ID. Check the matriculation details against the evidence collected. Keep this table private.
4. Open the `verified` table and create a row with:
   - **Row ID:** the student's Appwrite user ID
   - **`ownerId`:** the same student user ID
   - **`payload`:** a JSON object such as `{"t": 1794070000000}`; `t` is the verification timestamp in milliseconds.
5. Set row permissions to **read: Any** and **update/delete: label `admin`**. The public read permission lets the app display the badge; only admins should be able to change it.
6. Ask the student to refresh their profile. The verified-student badge should appear there and on their seller profile.

To revoke a badge, delete that student's row from `verified`. Never make private `users` rows public to allow verification. The current client-side admin UI cannot securely inspect other users' private profiles, so manage verification in Appwrite Console until a trusted server-side Appwrite Function is implemented.

## Google Search setup

The deployed static site includes a canonical URL, crawlable homepage text, structured WebSite metadata, `public/robots.txt`, and `public/sitemap.xml`. After deploying:

1. Confirm `https://uni-jos-mart.vercel.app/`, `/robots.txt`, and `/sitemap.xml` load successfully over HTTPS. If you use a custom domain, change the canonical, sitemap, robots, and structured-data URLs in `public/index.html`, `public/robots.txt`, and `public/sitemap.xml` to that domain, then deploy.
2. Open [Google Search Console](https://search.google.com/search-console/) and add the live site as a **URL-prefix property**. Verify ownership using one of Google's offered methods (for example, its HTML verification file in `public/` or a DNS TXT record). Google generates the verification token/file; do not guess one.
3. In Search Console, submit `sitemap.xml` under **Sitemaps**. Use **URL Inspection** on the homepage and request indexing. Google decides whether and when to index pages; submission does not guarantee ranking or inclusion.
4. Keep useful, original public text on the homepage and earn links from relevant University of Jos communities. Do not publish private student profiles or account-only content for SEO.

This client-rendered app uses hash routes for listings (for example, `#/item/...`). Search engines do not reliably index fragment-based routes as separate pages, and the sitemap currently lists only the homepage and terms page. Indexing each listing well will require crawlable, non-fragment URLs with server-rendered or pre-rendered listing pages and canonical metadata.

## Installing the app

The site is a Progressive Web App. After deployment over HTTPS, the header's **Install** button opens the browser install prompt when the browser says installation is available. If no prompt is available, use the browser's **Install app** or **Add to Home Screen** menu; on iPhone/iPad, use Safari's **Share → Add to Home Screen**. Browsers suppress install prompts when an app is already installed or does not yet meet their install criteria.

## Important security and migration notes

- The Appwrite client integration is prepared for the project IDs, but this repository does not yet include a trusted Appwrite Function for validating all writes. Client-side checks and row permissions alone cannot enforce database rules against a modified browser client. Before a public launch, route sensitive writes (account profile/matric uniqueness, listing creation/status, chat creation/messages, reports, reviews, and admin actions) through an Appwrite Function that validates the signed-in user and input on the server. Do not treat the current client-only write paths as production-secure.
- The new Appwrite project starts empty: no old accounts, listings, chats, saved items, reviews, or reports are migrated. Existing Cloudinary image URLs continue to work if their assets and account remain available. Users must create new Appwrite accounts.
- The app requires the Appwrite tables, columns, indexes, and permissions above. Until its IDs are entered in the config, it reports that Appwrite is not configured.
- The feed displays up to 40 listings. Search is applied to the newest 100 matching records.
- Listing photos and chat photos upload to Cloudinary. Limit uploads in the Cloudinary preset.

## Safety guidance

Meet on campus, inspect an item before paying, and ask for proof of ownership and a receipt. Report suspicious listings or messages.

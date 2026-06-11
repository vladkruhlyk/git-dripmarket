# DRIPMARKET

The storefront uses Next.js App Router and Sanity as its product CMS.

## Local setup

1. Create a Sanity project and a `production` dataset.
2. Copy `.env.example` to `.env.local` and add the Sanity project ID.
3. Run `npm run dev`.
4. Open `/studio`, sign in, and create products.

The storefront reads published products from Sanity on the server and caches the
catalog for five minutes. This avoids the previous client-side catalog request.
Until `NEXT_PUBLIC_SANITY_PROJECT_ID` is configured, the server uses the
existing WooCommerce catalog as a temporary migration fallback.

## Migrate the existing WooCommerce catalog

Add a temporary Sanity editor token and WooCommerce credentials to `.env.local`,
then run:

```bash
npm run migrate:woo-to-sanity
```

The script uploads product images to Sanity and preserves WooCommerce IDs so
existing product links and saved carts continue to work. Remove the migration
credentials after the import succeeds. Use a dedicated WooCommerce API key with
`Read` permission only. The migration reader always sends `GET` requests and
cannot update or delete WooCommerce data with that key.

## Instant content updates

Create a Sanity webhook for product create, update, and delete events:

```text
POST https://your-domain.com/api/revalidate/sanity?secret=SANITY_REVALIDATE_SECRET
```

Set the webhook secret to the same value as `SANITY_REVALIDATE_SECRET`.

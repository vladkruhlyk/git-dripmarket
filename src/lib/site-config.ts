// Fill in the real handles once and every page picks them up.
// Leave a value empty ("") to hide that link across the site.
export const siteConfig = {
  socials: {
    instagram: "", // e.g. "https://www.instagram.com/dripmarket"
    telegram: "",  // e.g. "https://t.me/dripmarket"
    tiktok: ""     // e.g. "https://www.tiktok.com/@dripmarket"
  },
  contactEmail: "" // e.g. "hello@dripmarketua.store"
};

export const socialLinks = [
  { label: "Instagram", href: siteConfig.socials.instagram },
  { label: "Telegram", href: siteConfig.socials.telegram },
  { label: "TikTok", href: siteConfig.socials.tiktok }
].filter(link => link.href);

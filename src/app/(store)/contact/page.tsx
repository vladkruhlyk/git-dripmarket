import { siteConfig } from "@/lib/site-config";

export default function ContactPage() {
  const channels = [
    {
      title: "Instagram",
      description: "Message us for styling, sizing and new arrival questions.",
      href: siteConfig.socials.instagram,
      linkLabel: "Open Instagram"
    },
    {
      title: "Telegram",
      description: "Fast support for active orders, payment questions and delivery updates.",
      href: siteConfig.socials.telegram,
      linkLabel: "Open Telegram"
    },
    {
      title: "Email",
      description: "For detailed requests, collaborations and supplier communication.",
      href: siteConfig.contactEmail ? `mailto:${siteConfig.contactEmail}` : "",
      linkLabel: siteConfig.contactEmail
    }
  ];

  return (
    <section className="info-page">
      <div className="info-page__eyebrow">Client Services</div>
      <h1>Contact Us</h1>
      <div className="info-page__lead">
        <p>
          Need help choosing a size, checking availability or placing an order?
          Send us a message and our team will get back to you with clear details.
        </p>
      </div>
      <div className="info-page__grid">
        {channels.map(channel => (
          <article key={channel.title}>
            <h2>{channel.title}</h2>
            <p>{channel.description}</p>
            {channel.href && (
              <p>
                <a className="info-page__link" href={channel.href} target="_blank" rel="noopener noreferrer">
                  {channel.linkLabel}
                </a>
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

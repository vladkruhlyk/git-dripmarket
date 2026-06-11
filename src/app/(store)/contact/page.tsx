export default function ContactPage() {
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
        <article>
          <h2>Instagram</h2>
          <p>Message us for styling, sizing and new arrival questions.</p>
        </article>
        <article>
          <h2>Telegram</h2>
          <p>Fast support for active orders, payment questions and delivery updates.</p>
        </article>
        <article>
          <h2>Email</h2>
          <p>For detailed requests, collaborations and supplier communication.</p>
        </article>
      </div>
    </section>
  );
}

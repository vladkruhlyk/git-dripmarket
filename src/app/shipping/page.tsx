export default function ShippingPage() {
  return (
    <section className="info-page">
      <div className="info-page__eyebrow">Client Services</div>
      <h1>Shipping & Delivery</h1>
      <div className="info-page__lead">
        <p>
          Orders are prepared after confirmation and shipped with tracking. If an
          item is coming from a European or American supplier, we will confirm the
          expected timing before finalizing the order.
        </p>
      </div>
      <div className="info-page__list">
        <article>
          <h2>Processing</h2>
          <p>In-stock items are usually prepared within 1-2 business days after payment confirmation.</p>
        </article>
        <article>
          <h2>Delivery options</h2>
          <p>Available delivery methods are confirmed at checkout depending on your city and item availability.</p>
        </article>
        <article>
          <h2>Tracking</h2>
          <p>Once the parcel is sent, we share the tracking details so you can follow the delivery status.</p>
        </article>
      </div>
    </section>
  );
}

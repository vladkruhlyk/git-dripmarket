export default function ReturnsPage() {
  return (
    <section className="info-page">
      <div className="info-page__eyebrow">Client Services</div>
      <h1>Returns & Exchanges</h1>
      <div className="info-page__lead">
        <p>
          We want every order to feel right. If something does not match the order
          details, contact us as soon as possible and keep the item unused with all
          packaging and tags.
        </p>
      </div>
      <div className="info-page__list">
        <article>
          <h2>Condition</h2>
          <p>Items must be unworn, undamaged and returned with original packaging, tags and accessories.</p>
        </article>
        <article>
          <h2>Size exchanges</h2>
          <p>If another size is available, we will help arrange an exchange or suggest a suitable alternative.</p>
        </article>
        <article>
          <h2>Special orders</h2>
          <p>Items sourced individually from Europe or America may have custom return terms, which we confirm before payment.</p>
        </article>
      </div>
    </section>
  );
}

export default function FaqPage() {
  const items = [
    {
      question: "Are the products original?",
      answer: "Yes. DRIPMARKET focuses on authentic designer pieces sourced through trusted European and American supply channels."
    },
    {
      question: "Can you help with sizing?",
      answer: "Yes. Send us the product name and your usual size, and we will help compare fit, measurements and available options."
    },
    {
      question: "How long does delivery take?",
      answer: "In-stock items are prepared quickly. Items ordered from Europe or America may take longer, and timing is confirmed before the order is finalized."
    },
    {
      question: "How do I pay?",
      answer: "Checkout uses secure online payment. If you need help completing payment, contact us before placing the order."
    }
  ];

  return (
    <section className="info-page">
      <div className="info-page__eyebrow">Client Services</div>
      <h1>FAQ</h1>
      <div className="info-page__list">
        {items.map(item => (
          <article key={item.question}>
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

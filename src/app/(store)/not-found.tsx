import Link from "next/link";

export default function NotFound() {
  return (
    <section className="info-page info-page--center">
      <div className="info-page__eyebrow">Error 404</div>
      <h1>Page not found</h1>
      <div className="info-page__lead">
        <p>The page you are looking for does not exist or is no longer available.</p>
      </div>
      <Link href="/catalog" className="bag__continue">Back to catalog</Link>
    </section>
  );
}

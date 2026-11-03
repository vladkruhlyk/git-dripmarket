import Image from "next/image";
import Link from "next/link";

export function HeroBanner() {
  return (
    <section className="hp-hero">
      <div className="hp-hero__frame">
        <Image
          src="/hero.webp"
          alt="DRIP. SS26 Campaign"
          fill
          priority
          sizes="100vw"
          className="hp-hero__image"
        />
        <div className="hp-hero__content">
          <p className="hp-hero__tag">Private access to high fashion</p>
          <h1 className="hp-hero__title">
            <span>Not for everyone.</span>
            <span>Selected for you.</span>
          </h1>
          <Link href="/catalog" className="hp-hero__btn">Discover Now</Link>
        </div>
      </div>
    </section>
  );
}

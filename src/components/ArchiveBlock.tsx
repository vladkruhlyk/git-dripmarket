import Image from "next/image";
import Link from "next/link";

const ARCHIVE_TILES = [
  { src: "/archive/archive-1.webp", alt: "Model in white with a monogram bag and brown knee boots", position: "center 82%" },
  { src: "/archive/archive-2.webp", alt: "Model in pink on a white cloud sofa", position: "center 72%" },
  { src: "/archive/archive-3.webp", alt: "Model in a white shirt with Louis Vuitton trainers", position: "center 100%" },
  { src: "/archive/archive-4.webp", alt: "Model in Golden Goose sneakers on a wooden chair", position: "center 100%" }
];

export function ArchiveBlock() {
  return (
    <section className="hp-archive">
      <div className="hp-archive__head">
        <span className="hp-archive__kicker">DRIP® / Visual Journal</span>
        <h2 className="hp-archive__title">The Archive<span aria-hidden="true" /></h2>
        <span className="hp-archive__tags">Campaigns / Details / Moments</span>
      </div>
      <div className="hp-archive__grid">
        {ARCHIVE_TILES.map((tile, index) => (
          <div className={`hp-archive__tile hp-archive__tile--${index + 1}`} key={`${tile.src}-${index}`}>
            <Image src={tile.src} alt={tile.alt} fill sizes="(max-width: 768px) 50vw, 40vw" style={{ objectPosition: tile.position }} />
          </div>
        ))}
      </div>
      <div className="hp-archive__foot">
        <span>An ongoing visual journal.</span>
        <Link href="/catalog" className="hp-archive__link">
          Explore the archive
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" /></svg>
        </Link>
      </div>
    </section>
  );
}

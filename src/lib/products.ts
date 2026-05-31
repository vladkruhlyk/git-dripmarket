export type Product = {
  id: string;
  brand: string;
  name: string;
  price: number;
  salePrice: number | null;
  color: string;
  sizes: string[];
  isNew: boolean;
  inStock: boolean;
  category: string;
  gender: "Men" | "Women" | "Unisex";
  description: string;
  image: string;
  images: string[];
};

export function formatPrice(value: number): string {
  return `₴${value.toLocaleString("en-US")}`;
}

export function calculatePrepaymentAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const lowerBound = Math.ceil((value * 0.2) / 10) * 10;
  const upperBound = Math.floor((value * 0.25) / 10) * 10;

  if (lowerBound <= upperBound) return upperBound;

  return Math.max(10, Math.round((value * 0.225) / 10) * 10);
}

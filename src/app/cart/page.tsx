"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { calculatePrepaymentAmount, formatPrice } from "@/lib/products";

type CheckoutDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  deliveryMethod: "nova-poshta" | "courier";
  warehouse: string;
  address: string;
  paymentMethod: "wayforpay";
  comment: string;
};

const emptyDraft: CheckoutDraft = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  city: "",
  deliveryMethod: "nova-poshta",
  warehouse: "",
  address: "",
  paymentMethod: "wayforpay",
  comment: ""
};

export default function CartPage() {
  const { items, removeItem, syncItems } = useCart();
  const { products, loading } = useProducts();
  const [checkout, setCheckout] = useState<CheckoutDraft>(emptyDraft);
  const [formStatus, setFormStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CheckoutDraft, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedDraft = localStorage.getItem("drip_checkout");
    if (savedDraft) setCheckout({ ...emptyDraft, ...JSON.parse(savedDraft) });
  }, []);

  useEffect(() => {
    localStorage.setItem("drip_checkout", JSON.stringify(checkout));
  }, [checkout]);

  const bagItems = useMemo(() => items.map((item, index) => ({
    item,
    index,
    product: products.find(product => String(product.id) === String(item.productId))
  })).filter(entry => entry.product), [items, products]);

  useEffect(() => {
    if (loading || products.length === 0) return;

    const validItems = items.filter(item => (
      products.some(product => String(product.id) === String(item.productId))
    ));

    if (validItems.length !== items.length) {
      syncItems(validItems);
    }
  }, [items, loading, products, syncItems]);

  const total = bagItems.reduce((sum, entry) => {
    const product = entry.product;
    return product ? sum + (product.salePrice || product.price) : sum;
  }, 0);
  const prepaymentAmount = calculatePrepaymentAmount(total);

  function updateField<T extends keyof CheckoutDraft>(field: T, value: CheckoutDraft[T]) {
    setCheckout(current => ({ ...current, [field]: value }));
    setFieldErrors(current => ({ ...current, [field]: "" }));
    setFormStatus("");
  }

  function validateCheckout() {
    const errors: Partial<Record<keyof CheckoutDraft, string>> = {};

    if (!checkout.firstName.trim()) errors.firstName = "Required";
    if (!checkout.lastName.trim()) errors.lastName = "Required";
    if (!checkout.phone.trim()) errors.phone = "Required";
    if (!checkout.email.trim() || !checkout.email.includes("@")) errors.email = "Valid email required";
    if (!checkout.city.trim()) errors.city = "Required";
    if (checkout.deliveryMethod === "nova-poshta" && !checkout.warehouse.trim()) errors.warehouse = "Required";
    if (checkout.deliveryMethod === "courier" && !checkout.address.trim()) errors.address = "Required";

    return errors;
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateCheckout();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormStatus("Please complete the required fields.");
      return;
    }

    const order = {
      customer: checkout,
      items: bagItems.map(({ item, product }) => ({
        productId: item.productId,
        name: product?.name,
        brand: product?.brand,
        size: item.size,
        price: product ? product.salePrice || product.price : 0
      })),
      total,
      createdAt: new Date().toISOString()
    };

    setSubmitting(true);
    setFormStatus("Preparing secure payment...");

    try {
      const response = await fetch("/api/checkout/wayforpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });

      if (!response.ok) throw new Error("Payment request failed");

      const payment = await response.json() as {
        action: string;
        fields: Record<string, string | string[]>;
      };
      const form = document.createElement("form");
      form.method = "POST";
      form.action = payment.action;
      form.acceptCharset = "utf-8";

      Object.entries(payment.fields).forEach(([name, value]) => {
        const values = Array.isArray(value) ? value : [value];
        values.forEach(item => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = Array.isArray(value) ? `${name}[]` : name;
          input.value = item;
          form.appendChild(input);
        });
      });

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error(error);
      setSubmitting(false);
      setFormStatus("Payment form could not be opened. Please try again.");
    }
  }

  return (
    <section className="bag">
      <h1 className="bag__title">Shopping Bag</h1>

      {loading && <div className="bag__empty">Loading bag...</div>}

      {!loading && bagItems.length === 0 && (
        <div className="bag__empty">
          <p>Your bag is empty</p>
          <p><Link href="/catalog">Continue Shopping</Link></p>
        </div>
      )}

      {bagItems.map(({ item, index, product }) => product && (
        <div className="bag-item" key={`${item.productId}-${item.addedAt}-${index}`}>
          <Link href={`/product/${product.id}`} className="bag-item__image">
            <Image src={product.image} alt={`${product.brand} ${product.name}`} width={100} height={133} />
          </Link>
          <div className="bag-item__details">
            <div className="bag-item__brand">{product.brand}</div>
            <div className="bag-item__name">{product.name}</div>
            <div className="bag-item__size">Size: {item.size || "Not selected"}</div>
          </div>
          <div className="bag-item__actions">
            <div className="bag-item__price">{formatPrice(product.salePrice || product.price)}</div>
            <button className="bag-item__remove" onClick={() => removeItem(index)}>Remove</button>
          </div>
        </div>
      ))}

      {bagItems.length > 0 && (
        <div className="checkout">
          <form className="checkout-form" onSubmit={submitCheckout}>
            <section className="checkout-form__section">
              <h2>Contact</h2>
              <div className="checkout-form__grid">
                <label>
                  <span>First name</span>
                  <input value={checkout.firstName} onChange={event => updateField("firstName", event.target.value)} />
                  {fieldErrors.firstName && <em>{fieldErrors.firstName}</em>}
                </label>
                <label>
                  <span>Last name</span>
                  <input value={checkout.lastName} onChange={event => updateField("lastName", event.target.value)} />
                  {fieldErrors.lastName && <em>{fieldErrors.lastName}</em>}
                </label>
                <label>
                  <span>Phone</span>
                  <input value={checkout.phone} onChange={event => updateField("phone", event.target.value)} placeholder="+380" />
                  {fieldErrors.phone && <em>{fieldErrors.phone}</em>}
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={checkout.email} onChange={event => updateField("email", event.target.value)} />
                  {fieldErrors.email && <em>{fieldErrors.email}</em>}
                </label>
              </div>
            </section>

            <section className="checkout-form__section">
              <h2>Delivery</h2>
              <div className="checkout-methods">
                <button
                  className={checkout.deliveryMethod === "nova-poshta" ? "active" : ""}
                  type="button"
                  onClick={() => updateField("deliveryMethod", "nova-poshta")}
                >
                  Nova Poshta
                </button>
                <button
                  className={checkout.deliveryMethod === "courier" ? "active" : ""}
                  type="button"
                  onClick={() => updateField("deliveryMethod", "courier")}
                >
                  Courier
                </button>
              </div>
              <div className="checkout-form__grid">
                <label>
                  <span>City</span>
                  <input value={checkout.city} onChange={event => updateField("city", event.target.value)} />
                  {fieldErrors.city && <em>{fieldErrors.city}</em>}
                </label>
                {checkout.deliveryMethod === "nova-poshta" ? (
                  <label>
                    <span>Warehouse</span>
                    <input value={checkout.warehouse} onChange={event => updateField("warehouse", event.target.value)} placeholder="Branch number or address" />
                    {fieldErrors.warehouse && <em>{fieldErrors.warehouse}</em>}
                  </label>
                ) : (
                  <label>
                    <span>Address</span>
                    <input value={checkout.address} onChange={event => updateField("address", event.target.value)} placeholder="Street, building, apartment" />
                    {fieldErrors.address && <em>{fieldErrors.address}</em>}
                  </label>
                )}
              </div>
              <label className="checkout-form__full">
                <span>Comment</span>
                <textarea value={checkout.comment} onChange={event => updateField("comment", event.target.value)} rows={3} />
              </label>
            </section>

            <section className="checkout-form__section">
              <h2>Payment</h2>
              <div className="checkout-payment">
                <span>WayForPay</span>
                <small>Prepayment: {formatPrice(prepaymentAmount)}</small>
              </div>
            </section>

            {formStatus && <div className="checkout-status">{formStatus}</div>}
            <button className="bag__checkout" type="submit" disabled={submitting}>
              {submitting ? "Opening Payment..." : "Continue to Payment"}
            </button>
          </form>

          <aside className="checkout-summary">
            <div className="bag__summary bag__summary--stacked">
              <div className="bag__summary-row">
                <span className="bag__total-label">Total</span>
                <span className="bag__total-price">{formatPrice(total)}</span>
              </div>
              <div className="bag__summary-row bag__summary-row--due">
                <span className="bag__total-label">Due now</span>
                <span className="bag__total-price">{formatPrice(prepaymentAmount)}</span>
              </div>
            </div>
            <p>This is the client prepayment. The remaining balance is paid at the post office on delivery.</p>
            <Link href="/catalog" className="bag__continue">Continue Shopping</Link>
          </aside>
        </div>
      )}
    </section>
  );
}

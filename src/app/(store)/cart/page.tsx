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
  cityRef: string;
  deliveryMethod: "nova-poshta" | "courier";
  warehouse: string;
  warehouseRef: string;
  address: string;
  paymentMethod: "wayforpay";
  comment: string;
};

type NovaPoshtaCity = {
  ref: string;
  label: string;
  name: string;
  area: string;
  region: string;
};

type NovaPoshtaWarehouse = {
  ref: string;
  number: string;
  label: string;
  address: string;
};

const emptyDraft: CheckoutDraft = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  city: "",
  cityRef: "",
  deliveryMethod: "nova-poshta",
  warehouse: "",
  warehouseRef: "",
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
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [cityOptions, setCityOptions] = useState<NovaPoshtaCity[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<NovaPoshtaWarehouse[]>([]);
  const [cityLookupStatus, setCityLookupStatus] = useState("");
  const [warehouseLookupStatus, setWarehouseLookupStatus] = useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("drip_checkout");
      if (savedDraft) setCheckout({ ...emptyDraft, ...JSON.parse(savedDraft) });
    } catch {
      localStorage.removeItem("drip_checkout");
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    localStorage.setItem("drip_checkout", JSON.stringify(checkout));
  }, [checkout, draftHydrated]);

  const productsById = useMemo(() => (
    new Map(products.map(product => [String(product.id), product]))
  ), [products]);

  const bagItems = useMemo(() => items.map((item, index) => ({
    item,
    index,
    product: productsById.get(String(item.productId))
  })).filter(entry => entry.product), [items, productsById]);

  useEffect(() => {
    if (loading || products.length === 0) return;

    const validItems = items.filter(item => (
      productsById.has(String(item.productId))
    ));

    if (validItems.length !== items.length) {
      syncItems(validItems);
    }
  }, [items, loading, products, productsById, syncItems]);

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

  function updateCity(value: string) {
    setCheckout(current => ({
      ...current,
      city: value,
      cityRef: "",
      warehouse: "",
      warehouseRef: ""
    }));
    setCityDropdownOpen(true);
    setWarehouseOptions([]);
    setFieldErrors(current => ({ ...current, city: "", warehouse: "" }));
    setFormStatus("");
  }

  function selectCity(city: NovaPoshtaCity) {
    setCheckout(current => ({
      ...current,
      city: city.label,
      cityRef: city.ref,
      warehouse: "",
      warehouseRef: ""
    }));
    setCityOptions([]);
    setWarehouseOptions([]);
    setCityDropdownOpen(false);
    setWarehouseDropdownOpen(true);
    setFieldErrors(current => ({ ...current, city: "", warehouse: "" }));
    setFormStatus("");
  }

  function updateWarehouse(value: string) {
    setCheckout(current => ({
      ...current,
      warehouse: value,
      warehouseRef: ""
    }));
    setWarehouseDropdownOpen(true);
    setFieldErrors(current => ({ ...current, warehouse: "" }));
    setFormStatus("");
  }

  function selectWarehouse(warehouse: NovaPoshtaWarehouse) {
    setCheckout(current => ({
      ...current,
      warehouse: warehouse.label || warehouse.address,
      warehouseRef: warehouse.ref
    }));
    setWarehouseOptions([]);
    setWarehouseDropdownOpen(false);
    setFieldErrors(current => ({ ...current, warehouse: "" }));
    setFormStatus("");
  }

  function selectDeliveryMethod(method: CheckoutDraft["deliveryMethod"]) {
    setCheckout(current => ({
      ...current,
      deliveryMethod: method,
      ...(method === "courier" ? { warehouse: "", warehouseRef: "" } : { address: "" })
    }));
    setCityDropdownOpen(false);
    setWarehouseDropdownOpen(false);
    setFieldErrors(current => ({ ...current, deliveryMethod: "", warehouse: "", address: "" }));
    setFormStatus("");
  }

  useEffect(() => {
    if (checkout.deliveryMethod !== "nova-poshta") return;
    if (checkout.cityRef || checkout.city.trim().length < 2) {
      setCityOptions([]);
      setCityLookupStatus("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCityLookupStatus("Searching cities...");
      try {
        const response = await fetch(`/api/nova-poshta/cities?q=${encodeURIComponent(checkout.city)}`, {
          signal: controller.signal
        });
        const data = await response.json() as { cities?: NovaPoshtaCity[]; error?: string };
        if (!response.ok) throw new Error(data.error || "City lookup failed");
        setCityOptions(data.cities || []);
        setCityLookupStatus(data.cities?.length ? "" : "No cities found");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCityOptions([]);
        setCityLookupStatus("City list is unavailable. You can type manually.");
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [checkout.city, checkout.cityRef, checkout.deliveryMethod]);

  useEffect(() => {
    if (checkout.deliveryMethod !== "nova-poshta" || !checkout.cityRef) {
      setWarehouseOptions([]);
      setWarehouseLookupStatus("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setWarehouseLookupStatus("Searching branches...");
      try {
        const response = await fetch(`/api/nova-poshta/warehouses?cityRef=${encodeURIComponent(checkout.cityRef)}&q=${encodeURIComponent(checkout.warehouse)}`, {
          signal: controller.signal
        });
        const data = await response.json() as { warehouses?: NovaPoshtaWarehouse[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Warehouse lookup failed");
        setWarehouseOptions(data.warehouses || []);
        setWarehouseLookupStatus(data.warehouses?.length ? "" : "No branches found");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWarehouseOptions([]);
        setWarehouseLookupStatus("Branch list is unavailable. You can type manually.");
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [checkout.cityRef, checkout.deliveryMethod, checkout.warehouse]);

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
      items: bagItems.map(({ item }) => ({
        productId: item.productId,
        size: item.size
      }))
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
                  onClick={() => selectDeliveryMethod("nova-poshta")}
                >
                  Nova Poshta
                </button>
                <button
                  className={checkout.deliveryMethod === "courier" ? "active" : ""}
                  type="button"
                  onClick={() => selectDeliveryMethod("courier")}
                >
                  Courier
                </button>
              </div>
              <div className="checkout-form__grid">
                <label className="checkout-autocomplete">
                  <span>City</span>
                  <input
                    autoComplete="off"
                    value={checkout.city}
                    onBlur={() => window.setTimeout(() => setCityDropdownOpen(false), 140)}
                    onChange={event => updateCity(event.target.value)}
                    onFocus={() => setCityDropdownOpen(true)}
                    placeholder={checkout.deliveryMethod === "nova-poshta" ? "Start typing city" : ""}
                  />
                  {checkout.deliveryMethod === "nova-poshta" && cityDropdownOpen && (cityOptions.length > 0 || cityLookupStatus) && (
                    <div className="checkout-autocomplete__menu">
                      {cityOptions.map(city => (
                        <button key={city.ref} type="button" onMouseDown={event => event.preventDefault()} onClick={() => selectCity(city)}>
                          <strong>{city.label}</strong>
                          {(city.area || city.region) && <small>{[city.area, city.region].filter(Boolean).join(", ")}</small>}
                        </button>
                      ))}
                      {cityOptions.length === 0 && cityLookupStatus && <p>{cityLookupStatus}</p>}
                    </div>
                  )}
                  {fieldErrors.city && <em>{fieldErrors.city}</em>}
                </label>
                {checkout.deliveryMethod === "nova-poshta" ? (
                  <label className="checkout-autocomplete">
                    <span>Warehouse</span>
                    <input
                      autoComplete="off"
                      disabled={!checkout.city.trim()}
                      value={checkout.warehouse}
                      onBlur={() => window.setTimeout(() => setWarehouseDropdownOpen(false), 140)}
                      onChange={event => updateWarehouse(event.target.value)}
                      onFocus={() => setWarehouseDropdownOpen(true)}
                      placeholder={checkout.city.trim() ? "Branch number or address" : "Select city first"}
                    />
                    {warehouseDropdownOpen && (warehouseOptions.length > 0 || warehouseLookupStatus) && (
                      <div className="checkout-autocomplete__menu">
                        {warehouseOptions.map(warehouse => (
                          <button key={warehouse.ref} type="button" onMouseDown={event => event.preventDefault()} onClick={() => selectWarehouse(warehouse)}>
                            <strong>{warehouse.label}</strong>
                            {warehouse.address && <small>{warehouse.address}</small>}
                          </button>
                        ))}
                        {warehouseOptions.length === 0 && warehouseLookupStatus && <p>{warehouseLookupStatus}</p>}
                      </div>
                    )}
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

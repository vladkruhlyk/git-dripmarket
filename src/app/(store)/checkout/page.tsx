"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { trackMetaPixelEvent } from "@/lib/meta-pixel";
import { calculatePrepaymentAmount, formatPrice } from "@/lib/products";
import { calculatePromoDiscount, normalizePromoCode, type AppliedPromoCode } from "@/lib/promo-codes";

type PaymentMethod = "fop-prepayment" | "fop-full" | "crypto-trc20" | "contact-after-order";

type CheckoutDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  telegram: string;
  instagram: string;
  city: string;
  cityRef: string;
  deliveryMethod: "nova-poshta" | "courier";
  warehouse: string;
  warehouseRef: string;
  address: string;
  paymentMethod: PaymentMethod;
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
  kind: string;
};

type OrderConfirmation = {
  orderReference: string;
  paymentLabel: string;
  dueNow: number;
  paymentUrl?: string | null;
};

const emptyDraft: CheckoutDraft = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  telegram: "",
  instagram: "",
  city: "",
  cityRef: "",
  deliveryMethod: "nova-poshta",
  warehouse: "",
  warehouseRef: "",
  address: "",
  paymentMethod: "fop-prepayment",
  comment: ""
};

const paymentMethods: Array<{ value: PaymentMethod; title: string; description: string }> = [
  {
    value: "fop-prepayment",
    title: "Передоплата на ФОП",
    description: "Після оформлення відкриється сторінка оплати з точною сумою передоплати."
  },
  {
    value: "fop-full",
    title: "Повна оплата на ФОП (100%)",
    description: "Після оформлення відкриється сторінка оплати повної суми замовлення."
  },
  {
    value: "crypto-trc20",
    title: "CRYPTO (TRC20)",
    description: "Менеджер надішле TRC20-гаманець і суму після підтвердження."
  }
];

const inStockPaymentMethod: Array<{ value: PaymentMethod; title: string; description: string }> = [
  {
    value: "contact-after-order",
    title: "Менеджер зв’яжеться після оформлення",
    description: "Для товарів у наявності оплату узгодимо особисто після створення замовлення."
  }
];

export default function CheckoutPage() {
  const { items, syncItems } = useCart();
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
  const [promoInput, setPromoInput] = useState("");
  const [promoStatus, setPromoStatus] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<AppliedPromoCode | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);
  const trackedCheckoutStart = useRef(false);

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
  const hasInStockItems = bagItems.some(entry => Boolean(entry.product?.inStock));
  const availablePaymentMethods = hasInStockItems ? inStockPaymentMethod : paymentMethods;
  const promoDiscount = appliedPromoCode ? calculatePromoDiscount(appliedPromoCode, total) : 0;
  const discountedTotal = Math.max(0, total - promoDiscount);
  const dueNow = hasInStockItems
    ? 0
    : checkout.paymentMethod === "fop-prepayment"
    ? calculatePrepaymentAmount(discountedTotal)
    : discountedTotal;

  useEffect(() => {
    if (loading || trackedCheckoutStart.current || bagItems.length === 0) return;
    trackedCheckoutStart.current = true;
    trackMetaPixelEvent("InitiateCheckout", {
      content_ids: bagItems.map(({ item }) => String(item.productId)),
      content_type: "product",
      contents: bagItems.map(({ item, product }) => ({
        id: String(item.productId),
        quantity: 1,
        item_price: product?.salePrice || product?.price || 0
      })),
      currency: "UAH",
      num_items: bagItems.length,
      value: total
    });
  }, [bagItems, loading, total]);

  useEffect(() => {
    if (!hasInStockItems || checkout.paymentMethod === "contact-after-order") return;
    setCheckout(current => ({ ...current, paymentMethod: "contact-after-order" }));
    setOrderConfirmation(null);
  }, [checkout.paymentMethod, hasInStockItems]);

  useEffect(() => {
    if (hasInStockItems || checkout.paymentMethod !== "contact-after-order") return;
    setCheckout(current => ({ ...current, paymentMethod: "fop-prepayment" }));
    setOrderConfirmation(null);
  }, [checkout.paymentMethod, hasInStockItems]);

  function updateField<T extends keyof CheckoutDraft>(field: T, value: CheckoutDraft[T]) {
    setCheckout(current => ({ ...current, [field]: value }));
    setFieldErrors(current => ({ ...current, [field]: "" }));
    setFormStatus("");
    setOrderConfirmation(null);
  }

  useEffect(() => {
    if (!appliedPromoCode) return;
    const nextDiscount = calculatePromoDiscount(appliedPromoCode, total);
    if (nextDiscount > 0) return;
    setAppliedPromoCode(null);
    setPromoStatus("Промокод більше не застосовується до цього кошика.");
  }, [appliedPromoCode, total]);

  async function applyPromoCode() {
    const code = normalizePromoCode(promoInput);
    if (!code) {
      setPromoStatus("Введіть промокод.");
      return;
    }

    setPromoStatus("Перевіряємо промокод...");
    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, total })
      });
      const data = await response.json() as { promoCode?: AppliedPromoCode; error?: string };
      if (!response.ok || !data.promoCode) throw new Error(data.error || "Промокод недійсний");
      setAppliedPromoCode(data.promoCode);
      setPromoInput(data.promoCode.code);
      setPromoStatus(`Промокод застосовано: -${formatPrice(data.promoCode.discount)}`);
      setFormStatus("");
    } catch (error) {
      setAppliedPromoCode(null);
      setPromoStatus(error instanceof Error ? error.message : "Промокод недійсний");
    }
  }

  function removePromoCode() {
    setAppliedPromoCode(null);
    setPromoInput("");
    setPromoStatus("");
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
      setCityLookupStatus("Шукаємо міста...");
      try {
        const response = await fetch(`/api/nova-poshta/cities?q=${encodeURIComponent(checkout.city)}`, {
          signal: controller.signal
        });
        const data = await response.json() as { cities?: NovaPoshtaCity[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Не вдалося знайти місто");
        setCityOptions(data.cities || []);
        setCityLookupStatus(data.cities?.length ? "" : "Міста не знайдено");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCityOptions([]);
        setCityLookupStatus("Список міст тимчасово недоступний. Можна ввести вручну.");
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
      setWarehouseLookupStatus("Шукаємо відділення та поштомати...");
      try {
        const response = await fetch(`/api/nova-poshta/warehouses?cityRef=${encodeURIComponent(checkout.cityRef)}&q=${encodeURIComponent(checkout.warehouse)}`, {
          signal: controller.signal
        });
        const data = await response.json() as { warehouses?: NovaPoshtaWarehouse[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Не вдалося знайти відділення");
        setWarehouseOptions(data.warehouses || []);
        setWarehouseLookupStatus(data.warehouses?.length ? "" : "Відділення або поштомати не знайдено");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWarehouseOptions([]);
        setWarehouseLookupStatus("Список відділень і поштоматів тимчасово недоступний. Можна ввести вручну.");
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [checkout.cityRef, checkout.deliveryMethod, checkout.warehouse]);

  function validateCheckout() {
    const errors: Partial<Record<keyof CheckoutDraft, string>> = {};

    if (!checkout.firstName.trim()) errors.firstName = "Обов'язково";
    if (!checkout.lastName.trim()) errors.lastName = "Обов'язково";
    if (!checkout.phone.trim()) errors.phone = "Обов'язково";
    if (!checkout.email.trim() || !checkout.email.includes("@")) errors.email = "Вкажіть коректний email";
    if (!checkout.city.trim()) errors.city = "Обов'язково";
    if (checkout.deliveryMethod === "nova-poshta" && !checkout.warehouse.trim()) errors.warehouse = "Обов'язково";
    if (checkout.deliveryMethod === "courier" && !checkout.address.trim()) errors.address = "Обов'язково";

    return errors;
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateCheckout();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormStatus("Заповніть обов'язкові поля.");
      return;
    }

    const paymentMethod = hasInStockItems ? "contact-after-order" : checkout.paymentMethod;
    const order = {
      customer: { ...checkout, paymentMethod },
      items: bagItems.map(({ item }) => ({
        productId: item.productId,
        size: item.size,
        insoleCm: item.insoleCm || ""
      })),
      promoCode: appliedPromoCode?.code
    };

    setSubmitting(true);
    setFormStatus("Створюємо замовлення...");

    try {
      const response = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });

      const confirmation = await response.json() as OrderConfirmation & { error?: string };
      if (!response.ok) throw new Error(confirmation.error || "Не вдалося створити замовлення");

      if (!confirmation.paymentUrl) {
        trackMetaPixelEvent("Purchase", {
          content_ids: bagItems.map(({ item }) => String(item.productId)),
          content_type: "product",
          contents: bagItems.map(({ item, product }) => ({
            id: String(item.productId),
            quantity: 1,
            item_price: product?.salePrice || product?.price || 0
          })),
          currency: "UAH",
          num_items: bagItems.length,
          value: discountedTotal
        });
      }

      if (confirmation.paymentUrl) {
        syncItems([]);
        localStorage.removeItem("drip_checkout");
        window.location.assign(confirmation.paymentUrl);
        return;
      }

      setOrderConfirmation(confirmation);
      setFormStatus(`Замовлення ${confirmation.orderReference} створено. Ми зв'яжемося з вами щодо оплати.`);
      setSubmitting(false);
    } catch (error) {
      console.error(error);
      setSubmitting(false);
      setFormStatus(error instanceof Error ? error.message : "Не вдалося створити замовлення. Спробуйте ще раз.");
    }
  }

  return (
    <section className="bag">
      <div className="checkout-heading">
        <div>
          <span>Фінальний крок</span>
          <h1>Оформлення замовлення</h1>
        </div>
        <Link href="/cart">Повернутися до кошика</Link>
      </div>

      {loading && <div className="bag__empty">Завантажуємо замовлення...</div>}

      {!loading && bagItems.length === 0 && (
        <div className="bag__empty">
          <p>Немає товарів для оформлення</p>
          <p><Link href="/cart">Повернутися до кошика</Link></p>
        </div>
      )}

      {bagItems.length > 0 && (
        <div className="checkout">
          <form className="checkout-form" onSubmit={submitCheckout}>
            <section className="checkout-form__section">
              <h2>Контакти</h2>
              <div className="checkout-form__grid">
                <label>
                  <span>Ім’я</span>
                  <input value={checkout.firstName} onChange={event => updateField("firstName", event.target.value)} />
                  {fieldErrors.firstName && <em>{fieldErrors.firstName}</em>}
                </label>
                <label>
                  <span>Прізвище</span>
                  <input value={checkout.lastName} onChange={event => updateField("lastName", event.target.value)} />
                  {fieldErrors.lastName && <em>{fieldErrors.lastName}</em>}
                </label>
                <label>
                  <span>Телефон</span>
                  <input value={checkout.phone} onChange={event => updateField("phone", event.target.value)} placeholder="+380" />
                  {fieldErrors.phone && <em>{fieldErrors.phone}</em>}
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={checkout.email} onChange={event => updateField("email", event.target.value)} />
                  {fieldErrors.email && <em>{fieldErrors.email}</em>}
                </label>
                <label>
                  <span>Telegram</span>
                  <input value={checkout.telegram} onChange={event => updateField("telegram", event.target.value)} placeholder="@username" />
                </label>
                <label>
                  <span>Instagram</span>
                  <input value={checkout.instagram} onChange={event => updateField("instagram", event.target.value)} placeholder="@username" />
                </label>
              </div>
            </section>

            <section className="checkout-form__section">
              <h2>Доставка</h2>
              <div className="checkout-methods">
                <button
                  className={checkout.deliveryMethod === "nova-poshta" ? "active" : ""}
                  type="button"
                  onClick={() => selectDeliveryMethod("nova-poshta")}
                >
                  Нова пошта
                </button>
                <button
                  className={checkout.deliveryMethod === "courier" ? "active" : ""}
                  type="button"
                  onClick={() => selectDeliveryMethod("courier")}
                >
                  Кур’єр
                </button>
              </div>
              <div className="checkout-form__grid">
                <label className="checkout-autocomplete">
                  <span>Місто</span>
                  <input
                    autoComplete="off"
                    value={checkout.city}
                    onBlur={() => window.setTimeout(() => setCityDropdownOpen(false), 140)}
                    onChange={event => updateCity(event.target.value)}
                    onFocus={() => setCityDropdownOpen(true)}
                    placeholder={checkout.deliveryMethod === "nova-poshta" ? "Почніть вводити місто" : ""}
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
                    <span>Відділення / поштомат</span>
                    <input
                      autoComplete="off"
                      disabled={!checkout.city.trim()}
                      value={checkout.warehouse}
                      onBlur={() => window.setTimeout(() => setWarehouseDropdownOpen(false), 140)}
                      onChange={event => updateWarehouse(event.target.value)}
                      onFocus={() => setWarehouseDropdownOpen(true)}
                      placeholder={checkout.city.trim() ? "Відділення, поштомат або адреса" : "Спочатку виберіть місто"}
                    />
                    {warehouseDropdownOpen && (warehouseOptions.length > 0 || warehouseLookupStatus) && (
                      <div className="checkout-autocomplete__menu">
                        {warehouseOptions.map(warehouse => (
                          <button key={warehouse.ref} type="button" onMouseDown={event => event.preventDefault()} onClick={() => selectWarehouse(warehouse)}>
                            <strong>{warehouse.label}</strong>
                            <small>{[warehouse.kind, warehouse.address].filter(Boolean).join(" - ")}</small>
                          </button>
                        ))}
                        {warehouseOptions.length === 0 && warehouseLookupStatus && <p>{warehouseLookupStatus}</p>}
                      </div>
                    )}
                    {fieldErrors.warehouse && <em>{fieldErrors.warehouse}</em>}
                  </label>
                ) : (
                  <label>
                    <span>Адреса</span>
                    <input value={checkout.address} onChange={event => updateField("address", event.target.value)} placeholder="Вулиця, будинок, квартира" />
                    {fieldErrors.address && <em>{fieldErrors.address}</em>}
                  </label>
                )}
              </div>
              <label className="checkout-form__full">
                <span>Коментар</span>
                <textarea value={checkout.comment} onChange={event => updateField("comment", event.target.value)} rows={3} />
              </label>
            </section>

            <section className="checkout-form__section">
              <h2>Промокод</h2>
              <div className="checkout-promo">
                <input
                  value={promoInput}
                  onChange={event => {
                    setPromoInput(event.target.value);
                    setPromoStatus("");
                    if (appliedPromoCode) setAppliedPromoCode(null);
                  }}
                  placeholder="Введіть промокод"
                />
                {appliedPromoCode ? (
                  <button type="button" onClick={removePromoCode}>Прибрати</button>
                ) : (
                  <button type="button" onClick={applyPromoCode}>Застосувати</button>
                )}
              </div>
              {promoStatus && <div className="checkout-status checkout-status--compact">{promoStatus}</div>}
            </section>

            <section className="checkout-form__section">
              <h2>Оплата</h2>
              <div className="checkout-methods checkout-methods--stacked">
                {availablePaymentMethods.map(method => (
                  <button
                    className={checkout.paymentMethod === method.value ? "active" : ""}
                    key={method.value}
                    type="button"
                    onClick={() => updateField("paymentMethod", method.value)}
                  >
                    <span>{method.title}</span>
                    <small>{method.description}</small>
                  </button>
                ))}
              </div>
              {hasInStockItems && (
                <div className="checkout-status checkout-status--compact">
                  Для товарів у наявності оплату на сайті не приймаємо. Ми зв’яжемося після оформлення.
                </div>
              )}
            </section>

            {formStatus && <div className="checkout-status">{formStatus}</div>}
            {orderConfirmation && (
              <div className="checkout-status checkout-status--success">
                <strong>{orderConfirmation.orderReference}</strong>
                <span>{orderConfirmation.paymentLabel}: {formatPrice(orderConfirmation.dueNow)}</span>
              </div>
            )}
            <button className="bag__checkout" type="submit" disabled={submitting}>
              {submitting ? "Створюємо замовлення..." : "Оформити замовлення"}
            </button>
          </form>

          <aside className="checkout-summary">
            <section className="checkout-order">
              <div className="checkout-order__heading">
                <h2>Ваше замовлення</h2>
                <Link href="/cart">Редагувати</Link>
              </div>
              <div className="checkout-order__items">
                {bagItems.map(({ item, index, product }) => product && (
                  <article className="checkout-order__item" key={`${item.productId}-${item.addedAt}-${index}`}>
                    <div className="checkout-order__image">
                      <Image src={product.image} alt={`${product.brand} ${product.name}`} width={72} height={96} />
                    </div>
                    <div className="checkout-order__details">
                      <strong>{product.brand}</strong>
                      <span>{product.name}</span>
                      <small>
                        Розмір: {item.size || "-"}
                        {item.insoleCm ? ` · Устілка: ${item.insoleCm} см` : ""}
                      </small>
                    </div>
                    <b>{formatPrice(product.salePrice || product.price)}</b>
                  </article>
                ))}
              </div>
            </section>
            <div className="bag__summary bag__summary--stacked">
              <div className="bag__summary-row">
                <span className="bag__total-label">Разом</span>
                <span className="bag__total-price">{formatPrice(total)}</span>
              </div>
              {promoDiscount > 0 && (
                <>
                  <div className="bag__summary-row">
                    <span className="bag__total-label">Промокод</span>
                    <span className="bag__total-price">-{formatPrice(promoDiscount)}</span>
                  </div>
                  <div className="bag__summary-row">
                    <span className="bag__total-label">Після знижки</span>
                    <span className="bag__total-price">{formatPrice(discountedTotal)}</span>
                  </div>
                </>
              )}
              <div className="bag__summary-row bag__summary-row--due">
                <span className="bag__total-label">До оплати</span>
                <span className="bag__total-price">{formatPrice(dueNow)}</span>
              </div>
            </div>
            <p>
              {hasInStockItems
                ? "Після оформлення менеджер отримає замовлення і зв’яжеться з вами для підтвердження оплати та відправки."
                : checkout.paymentMethod === "fop-prepayment"
                ? "Після оформлення ви перейдете на сторінку оплати передоплати. Залишок узгоджується після підтвердження."
                : checkout.paymentMethod === "fop-full"
                  ? "Після оформлення ви перейдете на сторінку оплати повної суми."
                  : "Реквізити для CRYPTO підтвердить менеджер після оформлення замовлення."}
            </p>
            <Link href="/catalog" className="bag__continue">Продовжити покупки</Link>
          </aside>
        </div>
      )}
    </section>
  );
}

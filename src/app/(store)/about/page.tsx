import Link from "next/link";

export default function AboutPage() {
  return (
    <section className="info-page info-page--about">
      <div className="info-page__eyebrow">About DRIPMARKET</div>
      <h1 className="info-page__title info-page__title--about">
        <span>We are not just a store.</span>
        <span>We are private access</span>
        <span>to high fashion.</span>
      </h1>
      <div className="info-page__lead">
        <p>
          Наш сервіс створений для тих, хто не шукає компромісів між стилем,
          якістю та статусом. Ми працюємо як байєр-сервіс нового покоління:
          відбираємо, викуповуємо та доставляємо оригінальні позиції напряму з
          європейських бутиків і закритих дропів, до яких немає масового доступу.
        </p>
        <p>
          Кожна пара, кожна позиція - це результат точного відбору, досвіду та
          розуміння ринку. Ми не працюємо з випадковими товарами - тільки з тим,
          що має цінність сьогодні і залишиться актуальним завтра.
        </p>
        <p>
          Ми працюємо для тих, хто розуміє різницю між просто покупкою і
          правильним придбанням. dripmarket - це не про масовість. Це про рівень.
        </p>
      </div>
      <div className="info-page__grid">
        <article>
          <h2>Deficit access</h2>
          <p>Доступ до дефіцитних моделей та колекцій, які складно знайти навіть у Європі.</p>
        </article>
        <article>
          <h2>Direct buyouts</h2>
          <p>Прямі викупи з офіційних просторів без зайвих посередників.</p>
        </article>
        <article>
          <h2>Personal standard</h2>
          <p>Повна концентрація на якості, деталях і персональному підході до кожного клієнта.</p>
        </article>
      </div>
      <Link href="/catalog" className="info-page__button">Shop Catalog</Link>
    </section>
  );
}

import { defineField, defineType } from "sanity";

export const promoCodeType = defineType({
  name: "promoCode",
  title: "Promo code",
  type: "document",
  fields: [
    defineField({
      name: "code",
      title: "Code",
      description: "Use uppercase codes, for example DRIP10.",
      type: "string",
      validation: rule => rule.required()
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true
    }),
    defineField({
      name: "discountType",
      title: "Discount type",
      type: "string",
      initialValue: "percentage",
      options: {
        layout: "radio",
        list: [
          { title: "Percentage", value: "percentage" },
          { title: "Fixed amount", value: "fixed" }
        ]
      },
      validation: rule => rule.required()
    }),
    defineField({
      name: "amount",
      title: "Discount amount",
      description: "For percentage use 10 for 10%. For fixed amount use UAH value.",
      type: "number",
      validation: rule => rule.required().positive()
    }),
    defineField({
      name: "minOrderTotal",
      title: "Minimum order total (UAH)",
      type: "number",
      initialValue: 0,
      validation: rule => rule.min(0)
    }),
    defineField({
      name: "expiresAt",
      title: "Expires at",
      type: "datetime"
    })
  ],
  preview: {
    select: {
      title: "code",
      active: "active",
      discountType: "discountType",
      amount: "amount"
    },
    prepare({ title, active, discountType, amount }) {
      const value = discountType === "percentage" ? `${amount}%` : `${amount} UAH`;
      return {
        title,
        subtitle: `${active ? "Active" : "Inactive"} - ${value}`
      };
    }
  }
});

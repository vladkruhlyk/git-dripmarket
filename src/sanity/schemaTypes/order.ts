import { defineArrayMember, defineField, defineType } from "sanity";

export const orderType = defineType({
  name: "order",
  title: "Order",
  type: "document",
  fields: [
    defineField({
      name: "orderReference",
      title: "Order reference",
      type: "string",
      validation: rule => rule.required()
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      initialValue: "new",
      options: {
        list: [
          { title: "New", value: "new" },
          { title: "Payment review", value: "payment-review" },
          { title: "Contacted", value: "contacted" },
          { title: "Paid", value: "paid" },
          { title: "Shipped", value: "shipped" },
          { title: "Cancelled", value: "cancelled" }
        ]
      }
    }),
    defineField({
      name: "paymentMethod",
      title: "Payment method",
      type: "string"
    }),
    defineField({
      name: "paymentLabel",
      title: "Payment label",
      type: "string"
    }),
    defineField({
      name: "paymentStatus",
      title: "Payment status",
      type: "string",
      options: {
        list: [
          { title: "Awaiting payment", value: "awaiting-payment" },
          { title: "Receipt uploaded", value: "receipt-uploaded" },
          { title: "Confirmed", value: "confirmed" },
          { title: "Manual payment", value: "manual" }
        ]
      }
    }),
    defineField({
      name: "paymentTokenHash",
      title: "Payment access token hash",
      type: "string",
      hidden: true,
      readOnly: true
    }),
    defineField({
      name: "paymentReceipt",
      title: "Payment receipt",
      type: "file",
      options: { accept: "image/*,application/pdf" }
    }),
    defineField({ name: "paymentReceiptName", title: "Receipt file name", type: "string" }),
    defineField({ name: "paymentReceiptType", title: "Receipt file type", type: "string" }),
    defineField({ name: "paymentSubmittedAt", title: "Payment submitted at", type: "datetime" }),
    defineField({
      name: "customer",
      title: "Customer",
      type: "object",
      fields: [
        defineField({ name: "firstName", title: "First name", type: "string" }),
        defineField({ name: "lastName", title: "Last name", type: "string" }),
        defineField({ name: "phone", title: "Phone", type: "string" }),
        defineField({ name: "email", title: "Email", type: "string" }),
        defineField({ name: "telegram", title: "Telegram", type: "string" }),
        defineField({ name: "instagram", title: "Instagram", type: "string" })
      ]
    }),
    defineField({
      name: "delivery",
      title: "Delivery",
      type: "object",
      fields: [
        defineField({ name: "method", title: "Method", type: "string" }),
        defineField({ name: "city", title: "City", type: "string" }),
        defineField({ name: "cityRef", title: "City ref", type: "string" }),
        defineField({ name: "warehouse", title: "Branch / parcel locker", type: "string" }),
        defineField({ name: "warehouseRef", title: "Warehouse ref", type: "string" }),
        defineField({ name: "address", title: "Courier address", type: "string" })
      ]
    }),
    defineField({
      name: "items",
      title: "Items",
      type: "array",
      of: [defineArrayMember({
        type: "object",
        fields: [
          defineField({ name: "productId", title: "Product ID", type: "string" }),
          defineField({ name: "brand", title: "Brand", type: "string" }),
          defineField({ name: "name", title: "Name", type: "string" }),
          defineField({ name: "size", title: "Size", type: "string" }),
          defineField({ name: "insoleCm", title: "Insole, cm", type: "string" }),
          defineField({ name: "price", title: "Price", type: "number" })
        ]
      })]
    }),
    defineField({ name: "promoCode", title: "Promo code", type: "string" }),
    defineField({ name: "total", title: "Total", type: "number" }),
    defineField({ name: "discount", title: "Discount", type: "number" }),
    defineField({ name: "discountedTotal", title: "Total after discount", type: "number" }),
    defineField({ name: "dueNow", title: "Due now", type: "number" }),
    defineField({ name: "comment", title: "Comment", type: "text" })
  ],
  orderings: [
    {
      title: "Newest first",
      name: "createdDesc",
      by: [{ field: "_createdAt", direction: "desc" }]
    }
  ],
  preview: {
    select: {
      title: "orderReference",
      status: "status",
      total: "discountedTotal",
      name: "customer.firstName"
    },
    prepare({ title, status, total, name }) {
      return {
        title,
        subtitle: `${status || "new"} - ${name || "Client"} - ${total || 0} UAH`
      };
    }
  }
});

import { defineArrayMember, defineField, defineType } from "sanity";

export const productType = defineType({
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: rule => rule.required()
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: rule => rule.required()
    }),
    defineField({
      name: "externalId",
      title: "Legacy product ID",
      description: "Keep the WooCommerce ID during migration so existing cart links continue to work.",
      type: "string"
    }),
    defineField({
      name: "brand",
      title: "Brand",
      type: "reference",
      to: [{ type: "brand" }],
      validation: rule => rule.required()
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      validation: rule => rule.required()
    }),
    defineField({
      name: "gender",
      title: "Gender",
      type: "string",
      initialValue: "Unisex",
      options: {
        layout: "radio",
        list: ["Men", "Women", "Unisex"]
      },
      validation: rule => rule.required()
    }),
    defineField({
      name: "price",
      title: "Regular price (UAH)",
      type: "number",
      validation: rule => rule.required().positive()
    }),
    defineField({
      name: "salePrice",
      title: "Sale price (UAH)",
      type: "number",
      validation: rule => rule.positive()
    }),
    defineField({
      name: "color",
      title: "Color",
      type: "string",
      initialValue: "black"
    }),
    defineField({
      name: "sizes",
      title: "Available sizes",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      validation: rule => rule.required().min(1)
    }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [defineArrayMember({
        type: "image",
        options: { hotspot: true }
      })],
      options: { layout: "grid" },
      validation: rule => rule.required().min(1)
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 5
    }),
    defineField({
      name: "isNew",
      title: "New arrival",
      type: "boolean",
      initialValue: false
    }),
    defineField({
      name: "inStock",
      title: "In stock",
      type: "boolean",
      initialValue: false
    })
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "brand.name",
      media: "images.0"
    }
  }
});

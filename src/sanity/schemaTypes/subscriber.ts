import { defineField, defineType } from "sanity";

export const subscriberType = defineType({
  name: "subscriber",
  title: "Newsletter subscriber",
  type: "document",
  readOnly: true,
  fields: [
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: rule => rule.required()
    }),
    defineField({
      name: "subscribedAt",
      title: "Subscribed at",
      type: "datetime"
    }),
    defineField({
      name: "source",
      title: "Source",
      type: "string"
    })
  ],
  preview: {
    select: { title: "email", subtitle: "subscribedAt" }
  }
});

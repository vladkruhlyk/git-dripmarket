import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";

// The read token is only defined on the server; it lets reads keep working
// after the dataset is switched to private in the Sanity dashboard.
export const sanityClient = createClient({
  apiVersion,
  dataset,
  projectId: projectId || "missing-project-id",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
});

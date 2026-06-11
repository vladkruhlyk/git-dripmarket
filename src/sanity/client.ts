import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";

export const sanityClient = createClient({
  apiVersion,
  dataset,
  projectId: projectId || "missing-project-id",
  useCdn: true
});

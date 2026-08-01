import { brandType } from "@/sanity/schemaTypes/brand";
import { orderType } from "@/sanity/schemaTypes/order";
import { productType } from "@/sanity/schemaTypes/product";
import { promoCodeType } from "@/sanity/schemaTypes/promoCode";
import { subscriberType } from "@/sanity/schemaTypes/subscriber";

export const schemaTypes = [productType, brandType, promoCodeType, orderType, subscriberType];

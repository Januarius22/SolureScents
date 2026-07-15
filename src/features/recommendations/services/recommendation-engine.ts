import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProductSummary,ProductVariantSummary } from "@/features/catalog/types/catalog";
import { fragrancePreferencesSchema,type FragrancePreferences } from "@/features/recommendations/validation/preferences";

export interface FragranceMatch{product:ProductSummary;score:number;reasons:string[]}
const concentrationWeight:Record<FragrancePreferences["occasion"],readonly string[]>={everyday:["edc","edt","edp"],evening:["edp","parfum","extrait"],occasion:["parfum","extrait","oil"]};
const sillageWeight:Record<FragrancePreferences["mood"],readonly string[]>={quiet:["intimate","moderate"],balanced:["moderate","strong"],bold:["strong","enormous"]};

/** Produces deterministic, explainable matches; the provider boundary can later enrich results without changing the UI. */
export async function recommendFragrances(input:FragrancePreferences):Promise<FragranceMatch[]>{
  const p=fragrancePreferencesSchema.parse(input);const db=await createServerSupabaseClient();
  const [{data:products,error:pe},{data:variants,error:ve},{data:families,error:fe}]=await Promise.all([
    db.from("products").select("id,brand_id,name,slug,subtitle,concentration,sillage,family_id").eq("status","active"),
    db.from("product_variants").select("id,product_id,sku,label,size_ml,price_minor,currency").eq("status","active").eq("is_available",true).order("size_ml"),
    db.from("fragrance_families").select("id,name,slug"),
  ]);if(pe||ve||fe)throw new Error("Unable to prepare fragrance recommendations.",{cause:pe??ve??fe});
  const familyMap=new Map(families.map(f=>[f.id,f]));const variantMap=new Map<string,ProductVariantSummary[]>();for(const v of variants){const list=variantMap.get(v.product_id)??[];list.push({id:v.id,label:v.label,sizeMl:v.size_ml,sku:v.sku,price:{amountMinor:v.price_minor,currency:v.currency}});variantMap.set(v.product_id,list)}
  return products.filter(x=>variantMap.has(x.id)).map(x=>{let score=45;const reasons:string[]=[];const family=x.family_id?familyMap.get(x.family_id):undefined;if(family?.slug.includes(p.character)){score+=35;reasons.push(`${family.name} character matches your preference`)}if(concentrationWeight[p.occasion].includes(x.concentration)){score+=12;reasons.push(`${x.concentration.toUpperCase()} suits ${p.occasion} wear`)}if(x.sillage&&sillageWeight[p.mood].includes(x.sillage)){score+=8;reasons.push(`${x.sillage} presence fits your desired mood`)}return {score, reasons:reasons.length?reasons:["A versatile composition selected from the Solure edit"],product:{id:x.id,brandId:x.brand_id,name:x.name,slug:x.slug,subtitle:x.subtitle,concentration:x.concentration,variants:variantMap.get(x.id)??[]}}}).sort((a,b)=>b.score-a.score).slice(0,4);
}

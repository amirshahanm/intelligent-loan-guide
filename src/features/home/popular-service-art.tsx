const SERVICE_ART = {
  "vehicle-installment": "car-installment-v2.webp",
  "cash-loan": "cash-loan-v1.webp",
  "goods-loan": "goods-loan-v1.webp",
  "credit-check": "credit-check-v1.webp",
  "sakha-code": "sakha-code-v1.webp",
  "import-export": "import-export-v1.webp",
  "bank-credit-trade": "bank-credit-trade-v1.webp",
  "vehicle-services": "vehicle-services-v1.webp",
  "working-capital": "working-capital-v1.webp",
  "business-equipment": "business-equipment-v1.webp",
  "property-finance": "property-finance-v1.webp",
  "trade-finance-routes": "trade-finance-routes-v1.webp",
} as const;
export type PopularServiceArtId = keyof typeof SERVICE_ART;

/** Decorative service illustrations; never financial results or provider branding. */
export function PopularServiceArt({ id }: { id: PopularServiceArtId }) {
  const isCar = id === "vehicle-installment";
  return (
    <img
      className={`popular-service-art ${isCar ? "popular-service-art--car" : "popular-service-art--object"}`}
      src={`/assets/home/${SERVICE_ART[id]}`}
      width={512}
      height={isCar ? 341 : 512}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      loading={
        id === "vehicle-installment" || id === "cash-loan" || id === "goods-loan" ? "eager" : "lazy"
      }
    />
  );
}

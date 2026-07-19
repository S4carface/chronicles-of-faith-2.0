import RarityCardFrame, { MAX_TILT_DEGREES } from "@/components/ui/RarityCardFrame";
import "./PremiumCardShowcase.css";

export default function PremiumCardShowcase({
  src = "/images/cards/showcase/sling-stone-premium.png",
  alt = "Premium Sling Stone card",
  rarity = "legendary",
  className = "",
}) {
  return (
    <div className={`premium-card-scene ${className}`}>
      <RarityCardFrame rarity={rarity} showcase className="premium-card">
        <img className="premium-card__image" src={src} alt={alt} draggable="false" />
      </RarityCardFrame>
    </div>
  );
}

export { MAX_TILT_DEGREES };

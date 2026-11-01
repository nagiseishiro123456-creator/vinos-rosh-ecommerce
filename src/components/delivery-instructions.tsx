import "./delivery-instructions.css";

export function DeliveryInstructions({ text }: { text?: string | null }) {
  if (!text) return null;
  return <p className="deliveryInstructions"><span className="deliveryInstructionsLabel">Indicaciones de entrega</span><span className="deliveryInstructionsText">{text}</span></p>;
}

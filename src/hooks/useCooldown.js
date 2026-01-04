import { useState, useRef } from "react";

export default function useCooldown(duration = 3000) {
  const [coolingDown, setCoolingDown] = useState(false);
  const timeoutRef = useRef(null);

  const trigger = () => {
    if (coolingDown) return false;
    setCoolingDown(true);
    timeoutRef.current = setTimeout(() => setCoolingDown(false), duration);
    return true;
  };

  return [coolingDown, trigger];
}
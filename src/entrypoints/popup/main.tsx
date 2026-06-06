import { createRoot } from "react-dom/client";
import IndexPopup from "@/popup";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Popup root element not found");
}

createRoot(rootElement).render(<IndexPopup />);

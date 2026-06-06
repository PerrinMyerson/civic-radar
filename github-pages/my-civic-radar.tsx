import { createRoot } from "react-dom/client";
import MyCivicRadarPage from "../app/components/MyCivicRadarPage";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(<MyCivicRadarPage homeHref="./" />);

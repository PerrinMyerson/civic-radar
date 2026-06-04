import { createRoot } from "react-dom/client";
import CivicDashboard from "../app/components/CivicDashboard";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(<CivicDashboard />);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Simulator from "../app/simulator";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<StrictMode><Simulator /></StrictMode>);

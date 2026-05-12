import "../styles/app.css";
import "@phosphor-icons/web/regular";
import { initA11yFromStorage } from "../lib/a11y-preferences";
import { mountPlayground } from "../components/playground";

initA11yFromStorage();

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

mountPlayground(app);

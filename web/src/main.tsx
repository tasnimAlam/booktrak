import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import BooksPage from "./components/BooksPage.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BooksPage />
  </StrictMode>,
);

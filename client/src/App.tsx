import { useState } from "react";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    setState("loading");
    setCategories([]);

    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button
        className="btn btn-success"
        onClick={handleCheck}
        disabled={state === "loading"}
      >
        {state === "loading" ? "Loading..." : "Check System"}
      </button>

      {state === "success" && (
        <div className="mt-4">
          <div className="alert alert-success">
            System Status: Online
          </div>

          <h2 className="h5">Supported Request Categories</h2>

          <ol className="list-group list-group-numbered">
            {categories.map((category) => (
              <li
                className="list-group-item"
                key={category.id}
              >
                {category.name}
              </li>
            ))}
          </ol>
        </div>
      )}

      {state === "error" && (
        <div className="alert alert-danger mt-4">
          <div>System Status: Offline</div>
          <div>Unable to connect to TokTickIT API</div>
        </div>
      )}
    </div>
  );
}

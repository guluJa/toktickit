import { useState } from "react";
import { checkHealth } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");

  async function handleCheck() {
    setState("loading");

    try {
      await checkHealth();
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
        <div className="alert alert-success mt-4">
          System Status: Online
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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface HealthResponse {
  status: string;
  service: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  return response.json();
}

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const healthResponse = await fetch(`${API_URL}/api/health`);

  if (!healthResponse.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const health: HealthResponse = await healthResponse.json();

  if (health.status !== "ok") {
    throw new Error("TokTickIT API is unavailable");
  }

  const categoriesResponse = await fetch(`${API_URL}/api/categories`);

  if (!categoriesResponse.ok) {
    throw new Error("Unable to load request categories");
  }

  const categories: Category[] = await categoriesResponse.json();

  return {
    online: true,
    categories,
  };
}

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
}

export async function getDevelopmentRequesters(): Promise<
  DevelopmentRequester[]
> {
  const response = await fetch(
    `${API_URL}/api/development-requesters`,
  );

  if (!response.ok) {
    throw new Error(
      "Unable to load development requesters.",
    );
  }

  return response.json();
}

export async function getDevelopmentRequester(
  requesterId: number,
): Promise<DevelopmentRequester> {
  const response = await fetch(
    `${API_URL}/api/development-requesters/${requesterId}`,
  );

  if (!response.ok) {
    throw new Error(
      "The selected development requester is unavailable.",
    );
  }

  return response.json();
}
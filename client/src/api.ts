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

export interface RelatedSystem {
  id: number;
  name: string;
  description: string | null;
}

export type RequestedPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export interface CreateTicketInput {
  submissionKey: string;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  requester: DevelopmentRequester;
  category: Category;
  relatedSystem: {
    id: number;
    name: string;
  };
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
  currentStatus: "NEW";
  createdAt: string;
  updatedAt: string;
  attachments: unknown[];
}

export interface CreateTicketResponse {
  ticket: TicketDetail;
  replayed: boolean;
}

export async function getCategories(): Promise<
  Category[]
> {
  const response = await fetch(
    `${API_URL}/api/categories`,
  );

  if (!response.ok) {
    throw new Error(
      "Unable to load Categories.",
    );
  }

  return response.json();
}

export async function getRelatedSystems(): Promise<
  RelatedSystem[]
> {
  const response = await fetch(
    `${API_URL}/api/related-systems`,
  );

  if (!response.ok) {
    throw new Error(
      "Unable to load Related Systems.",
    );
  }

  return response.json();
}

export async function createTicket(
  requesterId: number,
  input: CreateTicketInput,
): Promise<CreateTicketResponse> {
  const response = await fetch(
    `${API_URL}/api/tickets`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Development-Requester-Id":
          String(requesterId),
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      "Unable to create the Ticket.",
    );
  }

  return response.json();
}
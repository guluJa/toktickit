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

export interface AttachmentMetadata {
  id: number;
  ticketId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  state: "ACTIVE" | "REMOVED";
  uploadedAt: string;
  removedAt: string | null;
  removalReason: string | null;
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
  attachments: AttachmentMetadata[];
}

export interface CreateTicketResponse {
  ticket: TicketDetail;
  replayed: boolean;
}

export interface TicketSummary {
  id: number;
  ticketNumber: string;
  summary: string;
  category: Category;
  relatedSystem: {
    id: number;
    name: string;
  };
  requestedPriority: RequestedPriority;
  currentStatus: "NEW";
  createdAt: string;
  updatedAt: string;
}

export type MyTicketsSortField =
  | "updatedAt"
  | "createdAt"
  | "ticketNumber";

export type MyTicketsSortDirection =
  | "asc"
  | "desc";

export interface MyTicketsQuery {
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  requestedPriority?: RequestedPriority;
  currentStatus?: "NEW";
  sortBy: MyTicketsSortField;
  sortDirection: MyTicketsSortDirection;
  page: number;
  pageSize: 10 | 20 | 50;
}

export interface MyTicketsResponse {
  items: TicketSummary[];
  page: number;
  pageSize: number;
  totalOwnedItems: number;
  totalItems: number;
  totalPages: number;
}

interface TicketApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
}

export class TicketApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code = "TICKET_REQUEST_FAILED",
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "TicketApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export async function getMyTickets(
  requesterId: number,
  query: MyTicketsQuery,
): Promise<MyTicketsResponse> {
  const parameters = new URLSearchParams();

  if (query.search?.trim()) {
    parameters.set("search", query.search.trim());
  }

  if (query.categoryId) {
    parameters.set(
      "categoryId",
      String(query.categoryId),
    );
  }

  if (query.relatedSystemId) {
    parameters.set(
      "relatedSystemId",
      String(query.relatedSystemId),
    );
  }

  if (query.requestedPriority) {
    parameters.set(
      "requestedPriority",
      query.requestedPriority,
    );
  }

  if (query.currentStatus) {
    parameters.set(
      "currentStatus",
      query.currentStatus,
    );
  }

  parameters.set("sortBy", query.sortBy);
  parameters.set(
    "sortDirection",
    query.sortDirection,
  );
  parameters.set("page", String(query.page));
  parameters.set(
    "pageSize",
    String(query.pageSize),
  );

  const response = await fetch(
    `${API_URL}/api/tickets?${parameters.toString()}`,
    {
      headers: {
        "X-Development-Requester-Id":
          String(requesterId),
      },
    },
  );

  if (!response.ok) {
    let responseBody: TicketApiErrorResponse = {};

    try {
      responseBody = await response.json();
    } catch {
      // Preserve a safe fallback when the server does not return JSON.
    }

    throw new TicketApiError(
      responseBody.error?.message ??
        "Unable to load your Tickets.",
      response.status,
      responseBody.error?.code ??
        "TICKET_LIST_REQUEST_FAILED",
      responseBody.error?.fields,
    );
  }

  return response.json();
}

export async function getTicketDetail(
  requesterId: number,
  ticketId: number,
): Promise<TicketDetail> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}`,
    {
      headers: {
        "X-Development-Requester-Id":
          String(requesterId),
      },
    },
  );

  if (!response.ok) {
    let responseBody: TicketApiErrorResponse = {};

    try {
      responseBody = await response.json();
    } catch {
      // Preserve a safe fallback when the server does not return JSON.
    }

    throw new TicketApiError(
      responseBody.error?.message ??
        "Unable to load Ticket Detail.",
      response.status,
      responseBody.error?.code ??
        "TICKET_DETAIL_REQUEST_FAILED",
      responseBody.error?.fields,
    );
  }

  return response.json();
}

async function throwAttachmentApiError(
  response: Response,
  fallbackMessage: string,
): Promise<never> {
  let responseBody: TicketApiErrorResponse = {};

  try {
    responseBody = await response.json();
  } catch {
    // Preserve a safe fallback when the server does not return JSON.
  }

  throw new TicketApiError(
    responseBody.error?.message ??
      fallbackMessage,
    response.status,
    responseBody.error?.code ??
      "ATTACHMENT_REQUEST_FAILED",
    responseBody.error?.fields,
  );
}

export async function uploadAttachment(
  requesterId: number,
  ticketId: number,
  file: File,
): Promise<AttachmentMetadata> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments`,
    {
      method: "POST",
      headers: {
        "X-Development-Requester-Id":
          String(requesterId),
      },
      body: formData,
    },
  );

  if (!response.ok) {
    return throwAttachmentApiError(
      response,
      "Unable to upload the Attachment.",
    );
  }

  return response.json();
}

export async function removeAttachment(
  requesterId: number,
  attachmentId: number,
  removalReason: string,
): Promise<AttachmentMetadata> {
  const response = await fetch(
    `${API_URL}/api/attachments/${attachmentId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Development-Requester-Id":
          String(requesterId),
      },
      body: JSON.stringify({ removalReason }),
    },
  );

  if (!response.ok) {
    return throwAttachmentApiError(
      response,
      "Unable to remove the Attachment.",
    );
  }

  return response.json();
}

export interface AttachmentDownload {
  blob: Blob;
  filename: string;
}

export async function downloadAttachment(
  requesterId: number,
  attachmentId: number,
): Promise<AttachmentDownload> {
  const response = await fetch(
    `${API_URL}/api/attachments/${attachmentId}/download`,
    {
      headers: {
        "X-Development-Requester-Id":
          String(requesterId),
      },
    },
  );

  if (!response.ok) {
    return throwAttachmentApiError(
      response,
      "Unable to download the Attachment.",
    );
  }

  const disposition =
    response.headers.get("Content-Disposition") ??
    "";
  const filenameMatch = disposition.match(
    /filename="?([^";]+)"?/i,
  );

  return {
    blob: await response.blob(),
    filename:
      filenameMatch?.[1] ?? "attachment",
  };
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
    let responseBody: TicketApiErrorResponse = {};

    try {
      responseBody = await response.json();
    } catch {
      // Preserve a safe fallback when the server does not return JSON.
    }

    throw new TicketApiError(
      responseBody.error?.message ??
        "Unable to create the Ticket.",
      response.status,
      responseBody.error?.code,
      responseBody.error?.fields,
    );
  }

  return response.json();
}

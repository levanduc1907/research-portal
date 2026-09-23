import type {
  AiCredentialDto,
  CreateAiCredentialDto,
  UpdateAiCredentialDto,
} from "@repo/contracts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(
  path: string,
  adminToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}/v1/admin/ai-credentials${path}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-ai-admin-token": adminToken,
        ...init?.headers,
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const aiCredentialsApi = {
  list: (token: string) => request<AiCredentialDto[]>("", token),
  create: (token: string, input: CreateAiCredentialDto) =>
    request<AiCredentialDto>("", token, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (token: string, id: string, input: UpdateAiCredentialDto) =>
    request<AiCredentialDto>(`/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  test: (token: string, id: string) =>
    request<AiCredentialDto>(`/${id}/test`, token, { method: "POST" }),
  remove: (token: string, id: string) =>
    request<void>(`/${id}`, token, { method: "DELETE" }),
};

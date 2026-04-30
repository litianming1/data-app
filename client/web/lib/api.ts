const backendPort = "8010";

export function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:${backendPort}`;
  }

  return `http://localhost:${backendPort}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const isFormData = init?.body instanceof FormData;
  const headers = new Headers(init?.headers);

  if (init?.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
}
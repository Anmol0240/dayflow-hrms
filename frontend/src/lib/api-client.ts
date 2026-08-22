import { API_BASE_URL } from "./constants";
import type { ApiErrorPayload, TokenResponse } from "../types";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuthRenewal?: boolean;
};

const EMPTY_ERROR: ApiErrorPayload = {
  detail: "An unexpected error occurred",
  code: "UNEXPECTED_ERROR",
  field_errors: {},
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.detail);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code;
    this.fieldErrors = payload.field_errors;
  }
}

async function errorFromResponse(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as Partial<ApiErrorPayload>;
    return new ApiError(response.status, {
      detail: payload.detail ?? EMPTY_ERROR.detail,
      code: payload.code ?? `HTTP_${String(response.status)}`,
      field_errors: payload.field_errors ?? {},
    });
  } catch {
    return new ApiError(response.status, EMPTY_ERROR);
  }
}

export class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<TokenResponse> | null = null;
  private sessionExpiredHandler: (() => void) | null = null;

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  onSessionExpired(handler: (() => void) | null): void {
    this.sessionExpiredHandler = handler;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.fetch(path, options);
    if (
      response.status === 401 &&
      !options.skipAuthRenewal &&
      path !== "/auth/refresh" &&
      path !== "/auth/login"
    ) {
      try {
        await this.refreshSession();
      } catch (error) {
        this.expireSession();
        throw error;
      }
      const retry = await this.fetch(path, { ...options, skipAuthRenewal: true });
      if (retry.status === 401) this.expireSession();
      return await this.parse<T>(retry);
    }
    return await this.parse<T>(response);
  }

  async download(path: string): Promise<Blob> {
    let response = await this.fetch(path, {});
    if (response.status === 401) {
      try {
        await this.refreshSession();
      } catch (error) {
        this.expireSession();
        throw error;
      }
      response = await this.fetch(path, { skipAuthRenewal: true });
      if (response.status === 401) this.expireSession();
    }
    if (!response.ok) throw await errorFromResponse(response);
    return await response.blob();
  }

  async refreshSession(): Promise<TokenResponse> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.fetch("/auth/refresh", {
        method: "POST",
        skipAuthRenewal: true,
      })
        .then((response) => this.parse<TokenResponse>(response))
        .then((result) => {
          this.setAccessToken(result.access_token);
          return result;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return await this.refreshPromise;
  }

  private async fetch(path: string, options: RequestOptions): Promise<Response> {
    const { body, skipAuthRenewal, ...requestOptions } = options;
    void skipAuthRenewal;
    const headers = new Headers(options.headers);
    if (body !== undefined && !(body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }
    const requestInit: RequestInit = {
      ...requestOptions,
      credentials: "include",
      headers,
    };
    if (body !== undefined) {
      requestInit.body = body instanceof FormData ? body : JSON.stringify(body);
    }
    return await fetch(`${API_BASE_URL}${path}`, requestInit);
  }

  private async parse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw await errorFromResponse(response);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  private expireSession(): void {
    this.setAccessToken(null);
    this.sessionExpiredHandler?.();
  }
}

export const apiClient = new ApiClient();

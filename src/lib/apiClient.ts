interface ErrorResponseBody {
  error?: {
    code?: string;
    message?: string;
    details?: string[];
  };
}

export class ApiClientError extends Error {
  status: number;

  code?: string;

  details?: string[];

  constructor(status: number, message: string, code?: string, details?: string[]) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function postJson<TRequest, TResponse>(url: string, payload: TRequest): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as TResponse | ErrorResponseBody;

  if (!response.ok) {
    const errorResponse = json as ErrorResponseBody;
    throw new ApiClientError(
      response.status,
      errorResponse.error?.message ?? 'Request failed.',
      errorResponse.error?.code,
      errorResponse.error?.details,
    );
  }

  return json as TResponse;
}

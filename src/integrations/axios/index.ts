import {
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from "axios";
import { Peavy } from "../../Peavy";
import { LogLevel } from "../../constants/LogLevel";

function randomId(length: number): string {
  const random1 = Math.random().toString(16).substring(2);
  const random2 = Math.random().toString(16).substring(2);
  const random3 = Math.random().toString(16).substring(2);
  const combined = random1 + random2 + random3;
  return combined.padEnd(length, "0").substring(0, length);
}

export function peavyRequestInterceptor(
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }
  const traceId = randomId(32);
  const spanId = randomId(16);
  config.headers["traceparent"] = `00-${traceId}-${spanId}-03`;
  config.headers["x-request-id"] = traceId;
  (config as any)["__peavy"] = { traceId, spanId, time: Date.now() };

  Peavy.log({
    level: LogLevel.Info,
    message: `HTTP Request ${config.method} ${config.url}`,
    json: {
      "peavy/traceId": traceId,
      "peavy/spanId": spanId,
      "peavy/http": {
        side: "request",
        url: config.url,
        method: config.method,
      },
    },
  });

  return config;
}

export function peavyResponseInterceptor(
  response: AxiosResponse
): AxiosResponse {
  const peavyInfo = (response.config as any)["__peavy"];
  const rtt = peavyInfo ? Date.now() - peavyInfo.time : undefined;
  Peavy.log({
    level: LogLevel.Info,
    message: `HTTP Response ${response.status} ${response.config.method} ${response.config.url}`,
    json: {
      "peavy/traceId": peavyInfo?.traceId,
      "peavy/spanId": peavyInfo?.spanId,
      "peavy/http": {
        side: "response",
        url: response.config.url,
        method: response.config.method,
        code: response.status,
        success: response.status >= 200 && response.status < 400,
        rtt: rtt,
      },
    },
  });

  return response;
}

export function peavyErrorInterceptor(error: AxiosError): Promise<never> {
  const response = error.response;
  if (!response) {
    Peavy.log({
      level: LogLevel.Error,
      message: `HTTP Error ${error.message}`,
      json: {
        error,
        "peavy/http": {
          side: "response",
          url: error.config?.url,
          method: error.config?.method,
          code: null,
          success: false,
        },
      },
    });
  } else {
    const peavyInfo = (response.config as any)["__peavy"];
    const rtt = peavyInfo ? Date.now() - peavyInfo.time : undefined;
    Peavy.log({
      level: LogLevel.Info,
      message: `HTTP Response ${response.status} ${response.config.method} ${response.config.url}`,
      json: {
        "peavy/traceId": peavyInfo?.traceId,
        "peavy/spanId": peavyInfo?.spanId,
        "peavy/http": {
          side: "response",
          url: response.config.url,
          method: response.config.method,
          code: response.status,
          success: response.status >= 200 && response.status < 400,
          rtt: rtt,
        },
      },
    });
  }
  return Promise.reject(error);
}


import type { AxiosInstance, AxiosResponse } from "axios";

interface AxiosMock {
  create: jest.Mock<AxiosInstance>;
  get: jest.Mock<Promise<AxiosResponse>, any[]>;
  post: jest.Mock<Promise<AxiosResponse>, any[]>;
  put: jest.Mock<Promise<AxiosResponse>, any[]>;
  delete: jest.Mock<Promise<AxiosResponse>, any[]>;
}

const mockAxios: AxiosMock = {
  create: jest.fn(() => mockAxios as unknown as AxiosInstance),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

export const AxiosError = class AxiosError extends Error {};

export default mockAxios;


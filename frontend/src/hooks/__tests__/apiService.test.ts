import { renderHook, act } from "@testing-library/react";
import useApiService from "../apiService";
import { mockApiResponses } from "../../test-utils";

const mockAlert = {
  trigger: jest.fn(),
  close: jest.fn(),
  open: false,
  message: "",
  severity: "info" as const,
};

jest.mock("axios");

const mockAxios = require("axios").default;
const { AxiosError } = require("axios");

describe("useApiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("performs a GET request", async () => {
    mockAxios.get.mockResolvedValueOnce({ data: mockApiResponses.accounts });

    const { result } = renderHook(() => useApiService(mockAlert));

    let response;
    await act(async () => {
      response = await result.current.get("/api/account");
    });

    expect(mockAxios.get).toHaveBeenCalledWith("/api/account");
    expect(response).toEqual(mockApiResponses.accounts);
  });

  it("performs a POST request", async () => {
    const payload = { access_token: "token" };
    mockAxios.post.mockResolvedValueOnce({ data: mockApiResponses.itemCreation });

    const { result } = renderHook(() => useApiService(mockAlert));

    let response;
    await act(async () => {
      response = await result.current.post("/api/item", payload);
    });

    expect(mockAxios.post).toHaveBeenCalledWith("/api/item", payload);
    expect(response).toEqual(mockApiResponses.itemCreation);
  });

  it("performs a PUT request", async () => {
    const payload = { id: "acc-1", name: "Updated" };
    const success = { message: "Account updated" };
    mockAxios.put.mockResolvedValueOnce({ data: success });

    const { result } = renderHook(() => useApiService(mockAlert));

    let response;
    await act(async () => {
      response = await result.current.put("/api/account", payload);
    });

    expect(mockAxios.put).toHaveBeenCalledWith("/api/account", payload);
    expect(response).toEqual(success);
  });

  it("performs a DELETE request", async () => {
    mockAxios.delete.mockResolvedValueOnce({ data: mockApiResponses.itemDeletion });

    const { result } = renderHook(() => useApiService(mockAlert));

    let response;
    await act(async () => {
      response = await result.current.del("/api/item/test-item-1");
    });

    expect(mockAxios.delete).toHaveBeenCalledWith("/api/item/test-item-1");
    expect(response).toEqual(mockApiResponses.itemDeletion);
  });

  it("triggers alert on axios error", async () => {
    const error = new AxiosError("Failed");
    (error as any).response = { data: { display_message: "Bad request" } };
    mockAxios.get.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useApiService(mockAlert));

    await act(async () => {
      await result.current.get("/api/account");
    });

    expect(mockAlert.trigger).toHaveBeenCalledWith("Error: Bad request", "error");
  });
});


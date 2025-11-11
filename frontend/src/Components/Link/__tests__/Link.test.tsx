import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "../index";
import Context from "../../../Context";

const mockPost = jest.fn();
const dispatchMock = jest.fn();
const mockUsePlaidLink = jest.fn();

jest.mock("../../../hooks/apiService", () => ({
	__esModule: true,
	default: () => ({ post: mockPost }),
}));

jest.mock("../../../hooks/appAlert", () => ({
	__esModule: true,
	default: () => ({
		trigger: jest.fn(),
		close: jest.fn(),
		open: false,
		message: "",
		severity: "info" as const,
	}),
}));

jest.mock("react-plaid-link", () => ({
	usePlaidLink: (config: any) => mockUsePlaidLink(config),
}));

const openMock = jest.fn();
let readyState = false;
let capturedConfig: any = null;

const configurePlaidMock = () => {
	mockUsePlaidLink.mockImplementation((config: any) => {
		capturedConfig = config;
		return { open: openMock, ready: readyState };
	});
};

const renderWithContext = () => {
	render(
		<Context.Provider
			value={{
				linkToken: "link-token",
				error: { error_message: "", error_code: "", error_type: "" },
				accountsNeedRefresh: false,
				redirectLoading: false,
				dispatch: dispatchMock,
			}}
		>
			<Link />
		</Context.Provider>
	);
};

describe("Link component", () => {
	beforeEach(() => {
		mockPost.mockReset();
		dispatchMock.mockReset();
		openMock.mockReset();
		capturedConfig = null;
		window.history.replaceState(null, "", "/");
		configurePlaidMock();
	});

	it("displays disabled state when Plaid link is not ready", () => {
		readyState = false;
		renderWithContext();

		const button = screen.getByRole("button", { name: "Server Unreachable" });
		expect(button).toBeDisabled();
		expect(openMock).not.toHaveBeenCalled();
	});

	it("opens the Plaid link when ready", async () => {
		readyState = true;
		renderWithContext();

		const button = screen.getByRole("button", { name: "Add new account" });
		expect(button).toBeEnabled();

		await userEvent.click(button);
		expect(openMock).toHaveBeenCalled();
		expect(capturedConfig?.token).toBe("link-token");
	});

	it("exchanges token and dispatches refresh actions on success", async () => {
		readyState = true;
		mockPost
			.mockResolvedValueOnce({ access_token: "access-token" })
			.mockResolvedValueOnce({});

		renderWithContext();

		await act(async () => {
			await capturedConfig.onSuccess("public-token", {} as never);
		});

		expect(dispatchMock).toHaveBeenCalledWith({
			type: "SET_REDIRECT_LOADING",
			payload: true,
		});

		expect(mockPost).toHaveBeenNthCalledWith(1, "/api/set_access_token", {
			public_token: "public-token",
		});
		expect(mockPost).toHaveBeenNthCalledWith(2, "/api/item", {
			access_token: "access-token",
		});
		expect(dispatchMock).toHaveBeenCalledWith({
			type: "TRIGGER_ACCOUNT_REFRESH",
		});
	});
});

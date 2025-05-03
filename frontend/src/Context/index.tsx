import { createContext, useReducer, Dispatch, ReactNode } from "react";

// Step 1: Extend the state to include accountsNeedRefresh
interface QuickstartState {
	linkToken: string | null;
	error: {
		error_message: string;
		error_code: string;
		error_type: string;
	};
	accountsNeedRefresh: boolean;
}

const initialState: QuickstartState = {
	linkToken: "", // Don't set to null or error message will show up briefly when site loads
	error: {
		error_type: "",
		error_code: "",
		error_message: "",
	},
	accountsNeedRefresh: false, // New field
};

// Step 2: Extend action types to include triggering and clearing refresh
type QuickstartAction =
	| { type: "SET_STATE"; state: Partial<QuickstartState> }
	| { type: "TRIGGER_ACCOUNT_REFRESH" }
	| { type: "CLEAR_ACCOUNT_REFRESH" };

// Step 3: Add accountsNeedRefresh to context
interface QuickstartContext extends QuickstartState {
	dispatch: Dispatch<QuickstartAction>;
}

const Context = createContext<QuickstartContext>(
	initialState as QuickstartContext
);

const { Provider } = Context;

export const QuickstartProvider: React.FC<{ children: ReactNode }> = (
	props
) => {
	const reducer = (
		state: QuickstartState,
		action: QuickstartAction
	): QuickstartState => {
		switch (action.type) {
			case "SET_STATE":
				return { ...state, ...action.state };
			case "TRIGGER_ACCOUNT_REFRESH":
				return { ...state, accountsNeedRefresh: true };
			case "CLEAR_ACCOUNT_REFRESH":
				return { ...state, accountsNeedRefresh: false };
			default:
				return state;
		}
	};

	const [state, dispatch] = useReducer(reducer, initialState);

	return <Provider value={{ ...state, dispatch }}>{props.children}</Provider>;
};

export default Context;

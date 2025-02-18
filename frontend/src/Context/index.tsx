import { createContext, useReducer, Dispatch, ReactNode } from "react";

interface QuickstartState {
  linkToken: string | null;
  error: {
    error_message: string;
    error_code: string;
    error_type: string;
  };
}

const initialState: QuickstartState = {
  linkToken: "", // Don't set to null or error message will show up briefly when site loads
  error: {
    error_type: "",
    error_code: "",
    error_message: "",
  },
};

type QuickstartAction = {
  type: "SET_STATE";
  state: Partial<QuickstartState>;
};

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
      default:
        return { ...state };
    }
  };
  const [state, dispatch] = useReducer(reducer, initialState);
  return <Provider value={{ ...state, dispatch }}>{props.children}</Provider>;
};

export default Context;

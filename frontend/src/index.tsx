import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QuickstartProvider } from "./Context";
import { ThemeProvider } from "@mui/material";
import theme from "./theme";

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement
);
root.render(
	<React.StrictMode>
		<QuickstartProvider>
			<ThemeProvider theme={theme}>
				<App />
			</ThemeProvider>
		</QuickstartProvider>
	</React.StrictMode>
);

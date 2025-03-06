// theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
	palette: {
		mode: "light", // "light" or "dark"
		primary: {
			main: "#1976d2", // Custom primary color
		},
		secondary: {
			main: "#f50057", // Custom secondary color
		},
	},
	typography: {
		fontFamily: "Roboto, sans-serif",
		h1: {
			fontSize: "2rem",
			fontWeight: 700,
		},
	},
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: "8px", // Custom button styles
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					borderRadius: "8px", // Custom button styles
				},
			},
		},
		// TODO: FIGURE OUT HOW TO CUSTOMIZE THIS TO BE CIRCULAR
		MuiCheckbox: {
			styleOverrides: {
				root: {
					borderRadius: "100%", // Custom button styles
				},
			},
		},
	},
});

export default theme;

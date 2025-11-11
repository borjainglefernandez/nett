import Box from "@mui/material/Box";

interface TabPanelProps {
	children?: React.ReactNode;
	dir?: string;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role='tabpanel'
			hidden={value !== index}
			id={`full-width-tabpanel-${index}`}
			aria-labelledby={`full-width-tab-${index}`}
			style={{
				display: value === index ? "block" : "none",
				width: "100%",
			}}
			{...other}
		>
			{value === index && (
				<Box sx={{ p: 3 }}>
					<Box component='div'>{children}</Box>
				</Box>
			)}
		</div>
	);
}

export default TabPanel;

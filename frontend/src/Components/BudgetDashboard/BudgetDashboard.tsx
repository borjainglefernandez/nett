import React, { useEffect, useState } from "react";
import {
	Box,
	Button,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
	LinearProgress,
	Card,
	CardContent,
	Stack,
	IconButton,
	Select,
	MenuItem,
	Container,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

import { BudgetFrequency } from "../../Models/Budget";
import { BudgetPeriod } from "../../Models/BudgetPeriod";
import { parsePeriod, Period } from "../../Models/Period";
import useApiService from "../../hooks/apiService";
import useAppAlert from "../../hooks/appAlert";
import AppAlert from "../Alerts/AppAlert";

const BudgetDashboard: React.FC = () => {
	const [frequency, setFrequency] = useState<BudgetFrequency>(
		BudgetFrequency.MONTHLY
	);
	const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([]);
	const [totalSpentPeriods, setTotalSpentPeriods] = useState<Period[]>([]);
	const [currentIndex, setCurrentIndex] = useState<number>(0);
	const alert = useAppAlert();
	const { get } = useApiService(alert);

	useEffect(() => {
		const fetchData = async () => {
			const [budgetPeriodData, totalSpentPeriodData] = await Promise.all([
				get(`/api/budget_period?frequency=${frequency}`),
				get(`/api/budget_period/total?frequency=${frequency}`),
			]);
			if (budgetPeriodData && totalSpentPeriodData) {
				setBudgetPeriods(budgetPeriodData);
				setTotalSpentPeriods(totalSpentPeriodData.map(parsePeriod));
				setCurrentIndex(totalSpentPeriodData.length - 1); // show latest by default
			}
		};
		fetchData();
	}, [frequency]);

	const handleFrequencyChange = (
		_event: React.MouseEvent<HTMLElement>,
		newFrequency: BudgetFrequency
	) => {
		if (newFrequency) {
			setFrequency(newFrequency);
		}
	};

	const currentPeriod = totalSpentPeriods[currentIndex];

	const budgetItemsForCurrentPeriod = budgetPeriods.filter(
		(bp) =>
			bp.start_date === currentPeriod?.start_date &&
			bp.end_date === currentPeriod?.end_date
	);
	const savings =
		currentPeriod?.income_amount - currentPeriod?.spent_amount || 0;

	return (
		<Container sx={{ mt: 4 }}>
			<Box>
				<ToggleButtonGroup
					value={frequency}
					exclusive
					onChange={handleFrequencyChange}
					sx={{ mb: 3 }}
				>
					<ToggleButton value={BudgetFrequency.WEEKLY}>Weekly</ToggleButton>
					<ToggleButton value={BudgetFrequency.MONTHLY}>Monthly</ToggleButton>
					<ToggleButton value={BudgetFrequency.YEARLY}>Yearly</ToggleButton>
				</ToggleButtonGroup>

				{totalSpentPeriods.length === 0 && budgetPeriods.length === 0 ? (
					<Typography
						variant='h6'
						color='text.secondary'
						align='center'
						sx={{ mt: 4 }}
					>
						No budget data available for the selected frequency.
					</Typography>
				) : (
					currentPeriod && (
						<Card
							variant='outlined'
							sx={{ p: 2, boxShadow: 3, borderRadius: 3 }}
						>
							<CardContent>
								<Stack
									direction='row'
									alignItems='center'
									justifyContent='space-between'
									sx={{ mb: 2 }}
								>
									<Select
										value={currentIndex}
										onChange={(e) => setCurrentIndex(Number(e.target.value))}
									>
										{totalSpentPeriods.map((period, index) => (
											<MenuItem key={index} value={index}>
												{new Date(period.start_date).toLocaleDateString()} –{" "}
												{new Date(period.end_date).toLocaleDateString()}
											</MenuItem>
										))}
									</Select>
								</Stack>

								<Stack
									direction='row'
									justifyContent='space-between'
									spacing={2}
									sx={{ mb: 2 }}
								>
									<Box>
										<Typography variant='subtitle2'>Income</Typography>
										<Typography variant='h6' color='success.main'>
											${currentPeriod.income_amount}
										</Typography>
									</Box>
									<Box>
										<Typography variant='subtitle2'>Spent</Typography>
										<Typography variant='h6' color='error.main'>
											${currentPeriod.spent_amount}
										</Typography>
									</Box>
									<Box>
										<Typography variant='subtitle2'>Savings</Typography>
										<Typography variant='h6' color='info.main'>
											$
											{(
												currentPeriod.income_amount - currentPeriod.spent_amount
											).toFixed(2)}
										</Typography>
									</Box>
								</Stack>

								<LinearProgress
									variant='determinate'
									value={Math.min(
										(savings / currentPeriod.income_amount) * 100,
										100
									)}
									sx={{
										height: 10,
										borderRadius: 5,
										backgroundColor: "#e3f2fd",
										"& .MuiLinearProgress-bar": {
											backgroundColor: "#0288d1",
										},
										mb: 3,
									}}
								/>

								<Stack spacing={2}>
									{budgetItemsForCurrentPeriod.map((bp, index) => {
										const limit = parseFloat(bp.limit_amount);
										const spent = bp.spent_amount;
										const progress = Math.min(
											(bp.spent_amount / limit) * 100,
											100
										);

										return (
											<Box key={index}>
												<Typography variant='body2'>
													{bp.category_name} ({bp.subcategory_name || "General"}
													) – ${spent.toFixed(2)} / ${limit.toFixed(2)} ( $
													{(limit - spent).toFixed(2)} left)
												</Typography>
												<LinearProgress
													variant='determinate'
													value={progress}
													sx={{
														height: 10,
														borderRadius: 5,
														backgroundColor: "#f0f0f0",
														"& .MuiLinearProgress-bar": {
															backgroundColor:
																progress > 90 ? "#d32f2f" : "#388e3c",
														},
													}}
												/>
											</Box>
										);
									})}
								</Stack>
							</CardContent>
						</Card>
					)
				)}

				<AppAlert
					open={alert.open}
					message={alert.message}
					severity={alert.severity}
					onClose={alert.close}
				/>
			</Box>
		</Container>
	);
};

export default BudgetDashboard;

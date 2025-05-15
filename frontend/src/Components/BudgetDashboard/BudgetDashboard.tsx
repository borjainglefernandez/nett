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
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

import { BudgetFrequency } from "../../Models/Budget";
import { BudgetPeriod } from "../../Models/BudgetPeriod";
import { Period } from "../../Models/Period";
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
				get(`/api/budget_period/total-spent?frequency=${frequency}`),
			]);
			if (budgetPeriodData && totalSpentPeriodData) {
				setBudgetPeriods(budgetPeriodData);
				setTotalSpentPeriods(totalSpentPeriodData);
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

	const handlePrev = () => {
		setCurrentIndex((prev) => Math.max(prev - 1, 0));
	};

	const handleNext = () => {
		setCurrentIndex((prev) => Math.min(prev + 1, totalSpentPeriods.length - 1));
	};

	const currentPeriod = totalSpentPeriods[currentIndex];

	const budgetItemsForCurrentPeriod = budgetPeriods.filter(
		(bp) =>
			bp.start_date === currentPeriod?.start_date &&
			bp.end_date === currentPeriod?.end_date
	);

	return (
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

			{currentPeriod && (
				<Card variant='outlined'>
					<CardContent>
						<Stack
							direction='row'
							alignItems='center'
							justifyContent='space-between'
							sx={{ mb: 2 }}
						>
							<IconButton
								onClick={handlePrev}
								disabled={currentIndex === 0}
								aria-label='Previous'
							>
								<ChevronLeft />
							</IconButton>

							<Typography variant='h6'>
								{new Date(currentPeriod.start_date).toLocaleDateString()} –{" "}
								{new Date(currentPeriod.end_date).toLocaleDateString()}
							</Typography>

							<IconButton
								onClick={handleNext}
								disabled={currentIndex === totalSpentPeriods.length - 1}
								aria-label='Next'
							>
								<ChevronRight />
							</IconButton>
						</Stack>

						<Typography variant='body1' sx={{ mb: 2 }}>
							Total Spent: ${parseFloat(currentPeriod.spent_amount).toFixed(2)}
						</Typography>

						<Stack spacing={2}>
							{budgetItemsForCurrentPeriod.map((bp, index) => {
								const limit = parseFloat(bp.limit_amount);
								const progress = Math.min((bp.spent_amount / limit) * 100, 100);

								return (
									<Box key={index}>
										<Typography variant='body2'>
											{bp.category_name} ({bp.subcategory_name || "General"}) –
											${bp.spent_amount.toFixed(2)} / ${limit.toFixed(2)}
										</Typography>
										<LinearProgress
											variant='determinate'
											value={progress}
											sx={{ height: 10, borderRadius: 5 }}
										/>
									</Box>
								);
							})}
						</Stack>
					</CardContent>
				</Card>
			)}

			<AppAlert
				open={alert.open}
				message={alert.message}
				severity={alert.severity}
				onClose={alert.close}
			/>
		</Box>
	);
};

export default BudgetDashboard;

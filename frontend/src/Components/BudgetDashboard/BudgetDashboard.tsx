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
	Paper,
	Grid,
	Chip,
} from "@mui/material";
import { 
	ChevronLeft, 
	ChevronRight, 
	TrendingUp, 
	TrendingDown,
	AccountBalance,
	Category as CategoryIcon,
} from "@mui/icons-material";

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
				setTotalSpentPeriods(
					totalSpentPeriodData.map((p: any) => ({
						...parsePeriod(p),
						spent_amount: parseFloat(p.spent_amount),
						income_amount: parseFloat(p.income_amount),
					}))
				);
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

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	const formatDateRange = (start: string, end: string) => {
		const startDate = new Date(start);
		const endDate = new Date(end);
		return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
	};

	const handlePreviousPeriod = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
		}
	};

	const handleNextPeriod = () => {
		if (currentIndex < totalSpentPeriods.length - 1) {
			setCurrentIndex(currentIndex + 1);
		}
	};

	const savingsPercentage = currentPeriod
		? ((savings / currentPeriod.income_amount) * 100).toFixed(1)
		: "0";
	
	const isOverBudget = savings < 0;
	const overspendAmount = isOverBudget ? Math.abs(savings) : 0;
	const overspendPercentage = currentPeriod && isOverBudget
		? ((overspendAmount / currentPeriod.income_amount) * 100).toFixed(1)
		: "0";

	return (
		<Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
			<Box>
				{/* Frequency Toggle */}
				<Box sx={{ mb: 4, display: "flex", justifyContent: "center" }}>
					<ToggleButtonGroup
						value={frequency}
						exclusive
						onChange={handleFrequencyChange}
						sx={{
							"& .MuiToggleButton-root": {
								px: 3,
								py: 1,
								fontWeight: 600,
								textTransform: "none",
							},
						}}
					>
						<ToggleButton value={BudgetFrequency.WEEKLY}>Weekly</ToggleButton>
						<ToggleButton value={BudgetFrequency.MONTHLY}>Monthly</ToggleButton>
						<ToggleButton value={BudgetFrequency.YEARLY}>Yearly</ToggleButton>
					</ToggleButtonGroup>
				</Box>

				{totalSpentPeriods.length === 0 && budgetPeriods.length === 0 ? (
					<Paper
						sx={{
							p: 6,
							textAlign: "center",
							borderRadius: 3,
							boxShadow: 2,
						}}
					>
						<AccountBalance sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
						<Typography variant="h6" color="text.secondary" gutterBottom>
							No budget data available
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Create budgets to see your spending summary here.
						</Typography>
					</Paper>
				) : (
					currentPeriod && (
						<>
							{/* Period Navigation */}
							<Paper
								sx={{
									p: 2,
									mb: 3,
									borderRadius: 2,
									boxShadow: 1,
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
								}}
							>
								<IconButton
									onClick={handlePreviousPeriod}
									disabled={currentIndex === 0}
									sx={{ color: "primary.main" }}
								>
									<ChevronLeft />
								</IconButton>
								<Box sx={{ flex: 1, textAlign: "center" }}>
									<Typography variant="h6" fontWeight={600}>
										{formatDateRange(
											currentPeriod.start_date,
											currentPeriod.end_date
										)}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Period {currentIndex + 1} of {totalSpentPeriods.length}
									</Typography>
								</Box>
								<IconButton
									onClick={handleNextPeriod}
									disabled={currentIndex === totalSpentPeriods.length - 1}
									sx={{ color: "primary.main" }}
								>
									<ChevronRight />
								</IconButton>
							</Paper>

							{/* Summary Cards */}
							<Grid container spacing={3} sx={{ mb: 4 }}>
								<Grid item xs={12} sm={4}>
									<Card
										sx={{
											height: "100%",
											borderRadius: 2,
											boxShadow: 2,
											background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
											color: "white",
										}}
									>
										<CardContent>
											<Stack direction="row" alignItems="center" spacing={1} mb={1}>
												<TrendingUp />
												<Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
													Income
												</Typography>
											</Stack>
											<Typography variant="h4" fontWeight={700}>
												{formatCurrency(currentPeriod.income_amount)}
											</Typography>
										</CardContent>
									</Card>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Card
										sx={{
											height: "100%",
											borderRadius: 2,
											boxShadow: 2,
											background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
											color: "white",
										}}
									>
										<CardContent>
											<Stack direction="row" alignItems="center" spacing={1} mb={1}>
												<TrendingDown />
												<Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
													Spent
												</Typography>
											</Stack>
											<Typography variant="h4" fontWeight={700}>
												{formatCurrency(currentPeriod.spent_amount)}
											</Typography>
											<Typography variant="caption" sx={{ opacity: 0.9, mt: 0.5 }}>
												{((currentPeriod.spent_amount / currentPeriod.income_amount) * 100).toFixed(1)}% of income
											</Typography>
										</CardContent>
									</Card>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Card
										sx={{
											height: "100%",
											borderRadius: 2,
											boxShadow: 2,
											background: savings >= 0
												? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
												: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
											color: "white",
										}}
									>
										<CardContent>
											<Stack direction="row" alignItems="center" spacing={1} mb={1}>
												<AccountBalance />
												<Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
													Savings
												</Typography>
											</Stack>
											<Typography variant="h4" fontWeight={700}>
												{formatCurrency(savings)}
											</Typography>
											<Typography variant="caption" sx={{ opacity: 0.9, mt: 0.5 }}>
												{savingsPercentage}% of income
											</Typography>
										</CardContent>
									</Card>
								</Grid>
							</Grid>

							{/* Savings Progress Bar */}
							<Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 2 }}>
								<Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
									<Typography variant="subtitle1" fontWeight={600}>
										{isOverBudget ? "Overspending" : "Savings Progress"}
									</Typography>
									<Stack direction="row" spacing={1} alignItems="center">
										{isOverBudget && (
											<Chip
												label={`Over by ${overspendPercentage}%`}
												color="error"
												size="small"
												variant="filled"
											/>
										)}
										<Chip
											label={`${isOverBudget ? "-" : ""}${Math.abs(parseFloat(savingsPercentage))}%`}
											color={savings >= 0 ? "success" : "error"}
											size="small"
										/>
									</Stack>
								</Stack>
								{isOverBudget ? (
									<Box>
										{/* Show overspending proportionally within container bounds */}
										<Box sx={{ position: "relative", mb: 1, overflow: "hidden", borderRadius: 6 }}>
											{/* Calculate proportional widths to fit within 100% */}
											{(() => {
												const totalSpent = currentPeriod.spent_amount;
												const income = currentPeriod.income_amount;
												const incomePercent = (income / totalSpent) * 100;
												const overspendPercent = (overspendAmount / totalSpent) * 100;
												
												return (
													<Box sx={{ display: "flex", width: "100%", height: 12 }}>
														<Box
															sx={{
																width: `${incomePercent}%`,
																height: "100%",
																backgroundColor: "warning.main",
															}}
														/>
														<Box
															sx={{
																width: `${overspendPercent}%`,
																height: "100%",
																backgroundColor: "error.main",
															}}
														/>
													</Box>
												);
											})()}
										</Box>
										<Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
											<Typography variant="caption" color="text.secondary">
												Income: {formatCurrency(currentPeriod.income_amount)}
											</Typography>
											<Typography variant="caption" color="error.main" fontWeight={600}>
												Overspent: {formatCurrency(overspendAmount)}
											</Typography>
										</Stack>
									</Box>
								) : (
									<>
										<LinearProgress
											variant="determinate"
											value={Math.min(
												(savings / currentPeriod.income_amount) * 100,
												100
											)}
											sx={{
												height: 12,
												borderRadius: 6,
												backgroundColor: "action.hover",
												"& .MuiLinearProgress-bar": {
													borderRadius: 6,
													backgroundColor: "success.main",
												},
											}}
										/>
										<Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
											<Typography variant="caption" color="text.secondary">
												Income: {formatCurrency(currentPeriod.income_amount)}
											</Typography>
											<Typography variant="caption" color="success.main" fontWeight={600}>
												Saved: {formatCurrency(savings)}
											</Typography>
										</Stack>
									</>
								)}
							</Paper>

							{/* Budget Items */}
							<Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
								<Typography variant="h6" fontWeight={600} mb={3}>
									Budget Categories
								</Typography>
								{budgetItemsForCurrentPeriod.length === 0 ? (
									<Box sx={{ textAlign: "center", py: 4 }}>
										<CategoryIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
										<Typography variant="body1" color="text.secondary">
											No budget categories for this period
										</Typography>
									</Box>
								) : (
									<Stack spacing={3}>
										{budgetItemsForCurrentPeriod.map((bp, index) => {
											const limit = parseFloat(bp.limit_amount);
											const spent = bp.spent_amount;
											const remaining = limit - spent;
											const progress = Math.min((spent / limit) * 100, 100);
											const isOverBudget = spent > limit;
											const isNearLimit = progress > 90 && !isOverBudget;

											return (
												<Card
													key={index}
													variant="outlined"
													sx={{
														borderRadius: 2,
														"&:hover": {
															boxShadow: 2,
														},
													}}
												>
													<CardContent>
														<Stack spacing={2}>
															<Stack
																direction="row"
																justifyContent="space-between"
																alignItems="flex-start"
															>
																<Box>
																	<Typography variant="subtitle1" fontWeight={600}>
																		{bp.category_name}
																	</Typography>
																	{bp.subcategory_name && (
																		<Typography variant="caption" color="text.secondary">
																			{bp.subcategory_name}
																		</Typography>
																	)}
																</Box>
																<Chip
																	label={`${progress.toFixed(1)}%`}
																	color={
																		isOverBudget
																			? "error"
																			: isNearLimit
																			? "warning"
																			: "success"
																	}
																	size="small"
																/>
															</Stack>

															<Stack direction="row" justifyContent="space-between" spacing={2}>
																<Box>
																	<Typography variant="caption" color="text.secondary">
																		Spent
																	</Typography>
																	<Typography
																		variant="body1"
																		fontWeight={600}
																		color={isOverBudget ? "error.main" : "text.primary"}
																	>
																		{formatCurrency(spent)}
																	</Typography>
																</Box>
																<Box sx={{ textAlign: "right" }}>
																	<Typography variant="caption" color="text.secondary">
																		Budget
																	</Typography>
																	<Typography variant="body1" fontWeight={600}>
																		{formatCurrency(limit)}
																	</Typography>
																</Box>
																<Box sx={{ textAlign: "right" }}>
																	<Typography variant="caption" color="text.secondary">
																		{isOverBudget ? "Over by" : "Remaining"}
																	</Typography>
																	<Typography
																		variant="body1"
																		fontWeight={600}
																		color={
																			isOverBudget
																				? "error.main"
																				: remaining < limit * 0.1
																				? "warning.main"
																				: "success.main"
																		}
																	>
																		{formatCurrency(Math.abs(remaining))}
																	</Typography>
																</Box>
															</Stack>

															<LinearProgress
																variant="determinate"
																value={progress}
																sx={{
																	height: 8,
																	borderRadius: 4,
																	backgroundColor: "action.hover",
																	"& .MuiLinearProgress-bar": {
																		borderRadius: 4,
																		backgroundColor: isOverBudget
																			? "error.main"
																			: isNearLimit
																			? "warning.main"
																			: "success.main",
																	},
																}}
															/>
														</Stack>
													</CardContent>
												</Card>
											);
										})}
									</Stack>
								)}
							</Paper>
						</>
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

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Main from "./Pages/Main";
import CategoryManagement from "./Pages/CategoryManagement";
import {
	MAIN_PAGE_ROUTE,
	CATEGORY_MANAGEMENT_PAGE_ROUTE,
	BUDGET_MANAGEMENT_PAGE_ROUTE,
	ONBOARDING_ROUTE,
} from "./Constants/RouteConstants";
import BudgetManagement from "./Pages/BudgetManagement";
import OnboardingWizard from "./Components/Onboarding/OnboardingWizard";

const App = () => {
	return (
		<Router>
			<Routes>
				<Route path={ONBOARDING_ROUTE} element={<OnboardingWizard />} />
				<Route path={MAIN_PAGE_ROUTE} element={<Main />} />
				<Route
					path={CATEGORY_MANAGEMENT_PAGE_ROUTE}
					element={<CategoryManagement />}
				/>
				<Route
					path={BUDGET_MANAGEMENT_PAGE_ROUTE}
					element={<BudgetManagement />}
				/>
			</Routes>
		</Router>
	);
};

export default App;

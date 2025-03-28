import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Main from "./Pages/Main";
import CategoryManagement from "./Pages/CategoryManagement";
import {
	MAIN_PAGE_ROUTE,
	CATEGORY_MANAGEMENT_PAGE_ROUTE,
} from "./Constants/RouteConstants";

const App = () => {
	return (
		<Router>
			<Routes>
				<Route path={MAIN_PAGE_ROUTE} element={<Main />} />
				<Route
					path={CATEGORY_MANAGEMENT_PAGE_ROUTE}
					element={<CategoryManagement />}
				/>
			</Routes>
		</Router>
	);
};

export default App;

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Main from "./Pages/Main";
import CategoryManagement from "./Pages/CategoryManagement";

const App = () => {
	return (
		<Router>
			<Routes>
				<Route path='/' element={<Main />} />
				<Route path='/category-management' element={<CategoryManagement />} />
			</Routes>
		</Router>
	);
};

export default App;

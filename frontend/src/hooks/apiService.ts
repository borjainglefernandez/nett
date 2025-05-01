import axios, { AxiosError } from "axios";
import { Error } from "../Models/Error";  // Assuming you already have the Error model defined
import useAppAlert from "./appAlert";  // Using your custom alert hook

// Create a centralized API service to manage requests and error handling
const useApiService = (alert: ReturnType<typeof useAppAlert>) => {

	// Helper function to handle errors
    const handleError = (error: unknown) => {
        console.log(error);
        if (error instanceof AxiosError) {
        const errResponse = error.response?.data as Error; // Type assertion here
		if (errResponse) {
			console.log(error);
            // Handle Axios error response
            alert.trigger(
            `Error: ${errResponse.display_message}`,
            'error'
            );
        } else {
            // Handle generic Axios error (e.g., network error)
            alert.trigger('Network error occurred. Please try again.', 'error');
        }
        } else {
        // Handle non-Axios errors
        alert.trigger('An unexpected error occurred. Please try again.', 'error');
        }
    };

	// Method to get data from an API endpoint
	const get = async (url: string) => {
		try {
			const response = await axios.get(url);
			return response.data;
		} catch (error) {
			handleError(error as AxiosError);
		}
	};

	// Method to post data to an API endpoint
	const post = async (url: string, data: any) => {
		try {
			const response = await axios.post(url, data);
			return response.data;
		} catch (error) {
			handleError(error as AxiosError);
		}
	};

	// Method to put data to an API endpoint
	const put = async (url: string, data: any) => {
		try {
			const response = await axios.put(url, data);
			return response.data;
		} catch (error) {
			handleError(error as AxiosError);
		}
	};

	// Method to delete data from an API endpoint
	const del = async (url: string) => {
		try {
			const response = await axios.delete(url);
			return response.data;
		} catch (error) {
			handleError(error as AxiosError);
		}
	};

	return { get, post, put, del };
};

export default useApiService;

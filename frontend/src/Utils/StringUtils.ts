// Function to capitalize the first letter of each word
const capitalizeWords = (str: string) => {
    if (!str) return ""; // Handle undefined, null, or empty string

    return str
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};
    
export default capitalizeWords;
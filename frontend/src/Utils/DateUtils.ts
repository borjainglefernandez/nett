const formatDate = (date: Date): string => {
		const month = date.getMonth() + 1; // getMonth() is zero-based, so add 1
		const day = date.getDate();
		const year = date.getFullYear() % 100; // Get last two digits of the year
		const hours = date.getHours();
		const minutes = date.getMinutes();
		const ampm = hours >= 12 ? "pm" : "am";

		const formattedDate = `${month.toString().padStart(2, "0")}/${day
			.toString()
			.padStart(2, "0")}/${year.toString().padStart(2, "0")} at ${(
			hours % 12 || 12
		)
			.toString()
			.padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${ampm}`;

		return formattedDate;
};
    
export default formatDate
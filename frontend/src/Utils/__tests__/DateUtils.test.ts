import formatDate from "../DateUtils";

describe("formatDate", () => {
  it("formats a standard morning date with leading zeros", () => {
    const date = new Date(2024, 0, 5, 9, 7, 0); // Jan 5th 2024, 09:07 AM local time

    expect(formatDate(date)).toBe("01/05/24 at 09:07 am");
  });

  it("handles afternoon times and converts to 12-hour clock", () => {
    const date = new Date(2024, 5, 15, 18, 45, 0); // Jun 15th 2024, 18:45 PM local time

    expect(formatDate(date)).toBe("06/15/24 at 06:45 pm");
  });
});

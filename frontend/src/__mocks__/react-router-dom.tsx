import React from "react";

const mockNavigate = jest.fn();

export const useNavigate = () => mockNavigate;

export const Link: React.FC<{ children?: React.ReactNode }> = ({
	children,
}) => <a href='#'>{children}</a>;

export const NavLink: React.FC<{ children?: React.ReactNode }> = ({
	children,
}) => <a href='#'>{children}</a>;

export const MemoryRouter: React.FC<{ children?: React.ReactNode }> = ({
	children,
}) => <>{children}</>;

export { mockNavigate };

export default {
	useNavigate,
	Link,
	NavLink,
	MemoryRouter,
};

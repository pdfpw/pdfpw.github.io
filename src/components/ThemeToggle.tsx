import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import { Button } from "./ui/button";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	const isDark = theme === "dark";

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onClick={toggleTheme}
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			aria-pressed={isDark}
		>
			{isDark ? <SunIcon /> : <MoonIcon />}
		</Button>
	);
}

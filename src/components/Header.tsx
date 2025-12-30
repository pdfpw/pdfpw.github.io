import { Link } from "@tanstack/react-router";
import { FileTextIcon } from "lucide-react";

export default function Header() {
	return (
		<header className="p-4 flex items-center justify-between bg-gray-800 text-white shadow-lg">
			<h1 className="ml-4 text-xl font-semibold">
				<Link to="/">PDF Presenter Web</Link>
			</h1>
			<Link to="/licenses">
				<FileTextIcon></FileTextIcon>
			</Link>
		</header>
	);
}

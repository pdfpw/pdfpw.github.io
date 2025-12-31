declare module "virtual:licenses-info" {
	export interface License {
		name: string;
		versions: string[];
		license: string;
		homepage?: string;
		description?: string;
		author?: string;
		licenseText: string;
	}

	const liscenses: Record<string, License[]>;
	export default liscenses;
}

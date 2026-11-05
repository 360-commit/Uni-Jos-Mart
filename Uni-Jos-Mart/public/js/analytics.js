import { Analytics, Client, Tracking } from "https://cdn.jsdelivr.net/npm/appwrite@29.2.0/+esm";
import { appwriteConfig } from "./appwrite-config.js";

if (appwriteConfig.analyticsPropertyId) {
	const client = new Client()
		.setEndpoint(appwriteConfig.endpoint)
		.setProject(appwriteConfig.projectId);

	const tracking = new Tracking(
		new Analytics(client),
		appwriteConfig.analyticsPropertyId,
	);
	tracking.start();
}

// Fill Appwrite project IDs from the Cloud console before deploying.
export const appwriteConfig = {
	endpoint: "https://fra.cloud.appwrite.io/v1",
	projectId: "6aec1cca000f92d229b0",
	databaseId: "6aec220f00145764cfe0",
	analyticsPropertyId: "",
	tables: {
		users: "users",
		publicUsers: "publicUsers",
		items: "items",
		chats: "chats",
		messages: "messages",
		saved: "saved",
		reports: "reports",
		reviews: "reviews",
		verified: "verified",
		admins: "admins",
		matrics: "matrics",
	},
};

// Cloudinary identifiers are public. Never put an API secret in this file.
export const cloudinaryConfig = {
	cloudName: "e8b4rj8b",
	uploadPreset: "unijosmart",
};

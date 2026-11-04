// Fill Appwrite project IDs from the Cloud console before deploying.
export const appwriteConfig = {
	endpoint: "",
	projectId: "",
	databaseId: "",
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

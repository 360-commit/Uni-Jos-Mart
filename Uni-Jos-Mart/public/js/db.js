import {
	Account,
	Channel,
	Client,
	ID,
	Permission,
	Query,
	Role,
	TablesDB,
} from "https://cdn.jsdelivr.net/npm/appwrite@29.2.0/+esm";
import { appwriteConfig, cloudinaryConfig } from "./appwrite-config.js";

const configReady = !!(
	appwriteConfig.endpoint
	&& appwriteConfig.projectId
	&& appwriteConfig.databaseId
	&& Object.values(appwriteConfig.tables).every(Boolean)
);

const client = new Client();
if (configReady) {
	client.setEndpoint(appwriteConfig.endpoint).setProject(appwriteConfig.projectId);
}

const account = configReady ? new Account(client) : null;
const tablesDB = configReady ? new TablesDB(client) : null;
const tableId = (name) => appwriteConfig.tables[name];
const ADMIN_ROLE = Role.label("admin");
let profileCache = null;
let lastMessageAt = 0;

const REQ = [
	"firstName",
	"surname",
	"email",
	"phone",
	"matric",
	"faculty",
	"department",
	"permAddress",
	"state",
	"lga",
	"schoolAddress",
];

const words = (value) => [
	...new Set(
		String(value)
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((word) => word.length > 1),
	),
].slice(0, 30);

const stableId = async (prefix, value) => {
	const bytes = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	const hash = [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
	return `${prefix}_${hash.slice(0, 35 - prefix.length)}`;
};

const ensureRuntime = () => {
	if (!configReady) {
		throw new Error(
			"Appwrite is not configured. Add your Cloud endpoint, project ID, database ID, and table IDs in public/js/appwrite-config.js.",
		);
	}
};

const fail = (error) => {
	const type = error?.type || "";
	const code = Number(error?.code || 0);
	const messages = {
		user_already_exists: "An account already exists for this email. Try logging in.",
		user_invalid_credentials: "Wrong email or password.",
		user_password_mismatch: "Wrong email or password.",
		user_password_too_short: "Password must be at least 8 characters.",
		user_invalid_token: "This password reset link is invalid or has expired. Request a new one.",
		"user_invalid_email": "Enter a valid email address.",
		"user_blocked": "This account is blocked. Contact support.",
		"user_unauthorized": "Please log in first.",
		"document_already_exists": "This matriculation number is already registered.",
		"row_already_exists": "This matriculation number is already registered.",
		"general_rate_limit_exceeded": "Too many attempts. Wait a few minutes, then try again.",
		"storage_file_not_found": "The uploaded photo could not be found.",
	};
	if (messages[type]) return new Error(messages[type]);
	if (code === 401) return new Error("Please log in first or check your email and password.");
	if (code === 403) return new Error("You are not allowed to do that. Check Appwrite table permissions.");
	if (code === 404) return new Error("The requested listing or Appwrite resource was not found.");
	if (code === 409) return new Error("This record already exists.");
	if (code === 429) return new Error("Too many requests. Wait a few minutes and try again.");
	return new Error(error?.message || "Appwrite could not complete the request. Check your connection and project setup.");
};

const run = async (operation) => {
	ensureRuntime();
	try {
		return await operation();
	} catch (error) {
		throw fail(error);
	}
};

const payloadOf = (row) => {
	try {
		return { id: row.$id, ...JSON.parse(row.payload || "{}") };
	} catch (error) {
		console.error("Could not read an Appwrite row payload.", error);
		throw new Error("A saved record has invalid data. Contact support.");
	}
};

const rowData = (payload, columns = {}) => ({
	payload: JSON.stringify(payload),
	...columns,
});

const getRowOrNull = async (name, id) => {
	try {
		return await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId,
			tableId: tableId(name),
			rowId: id,
		});
	} catch (error) {
		if (Number(error?.code) === 404) return null;
		throw error;
	}
};

const getRow = async (name, id) => {
	const row = await getRowOrNull(name, id);
	if (!row) throw new Error("Not found.");
	return row;
};

const createRow = (name, id, data, permissions = []) => tablesDB.createRow({
	databaseId: appwriteConfig.databaseId,
	tableId: tableId(name),
	rowId: id,
	data,
	permissions,
});

const updateRow = (name, id, data) => tablesDB.updateRow({
	databaseId: appwriteConfig.databaseId,
	tableId: tableId(name),
	rowId: id,
	data,
});

const deleteRow = (name, id) => tablesDB.deleteRow({
	databaseId: appwriteConfig.databaseId,
	tableId: tableId(name),
	rowId: id,
});

const listRows = (name, queries = []) => tablesDB.listRows({
	databaseId: appwriteConfig.databaseId,
	tableId: tableId(name),
	queries,
});

const publicRead = (ownerId, adminWrite = false) => [
	Permission.read(Role.any()),
	Permission.update(Role.user(ownerId)),
	Permission.delete(Role.user(ownerId)),
	...(adminWrite
		? [Permission.update(ADMIN_ROLE), Permission.delete(ADMIN_ROLE)]
		: []),
];

const privateUser = (ownerId) => [
	Permission.read(Role.user(ownerId)),
	Permission.update(Role.user(ownerId)),
	Permission.delete(Role.user(ownerId)),
	Permission.read(ADMIN_ROLE),
	Permission.update(ADMIN_ROLE),
	Permission.delete(ADMIN_ROLE),
];

const pubOf = (user) => ({
	id: user.id,
	name: [user.firstName, user.middleName, user.surname].filter(Boolean).join(" ").trim() || "Student",
	photo: user.photo || "",
	faculty: user.faculty || "",
	department: user.department || "",
	schoolAddress: user.schoolAddress || "",
	phone: user.phone || "",
	campus: user.campus || "University of Jos",
});

const emptyProfile = (id, email = "") => ({
	id,
	email,
	firstName: "",
	middleName: "",
	surname: "",
	phone: "",
	matric: "",
	faculty: "",
	department: "",
	schoolAddress: "",
	permAddress: "",
	state: "",
	lga: "",
	photo: "",
	campus: "University of Jos",
});

const uid = async () => {
	const user = await run(() => account.get());
	return user.$id;
};

const mine = async () => {
	const userId = await uid();
	if (profileCache?.id === userId) return profileCache;
	const row = await getRowOrNull("users", userId);
	profileCache = row
		? payloadOf(row)
		: emptyProfile(userId, (await run(() => account.get())).email || "");
	return profileCache;
};

const up = async (data) => {
	if (!data || !data.startsWith("data:")) return data || "";
	if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
		throw new Error("Cloudinary is not configured. Add its cloud name and unsigned upload preset in public/js/appwrite-config.js.");
	}

	const formData = new FormData();
	formData.append("file", data);
	formData.append("upload_preset", cloudinaryConfig.uploadPreset);
	const response = await fetch(
		`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`,
		{ method: "POST", body: formData },
	);
	if (!response.ok) {
		throw new Error("Photo upload failed. Try a smaller photo.");
	}

	const uploaded = await response.json();
	return uploaded.secure_url.replace(
		"/upload/",
		"/upload/w_600,q_auto,f_auto/",
	);
};

const saveProfile = async (user) => {
	const matricId = await stableId("matric", user.matric.toUpperCase().replace(/\W/g, ""));
	const existingMatric = await getRowOrNull("matrics", matricId);
	if (existingMatric && existingMatric.ownerId !== user.id) {
		throw new Error("This matriculation number is already registered.");
	}
	if (!existingMatric) {
		await createRow(
			"matrics",
			matricId,
			rowData({ ownerId: user.id }, { ownerId: user.id }),
			privateUser(user.id),
		);
	}

	const profileRow = await getRowOrNull("users", user.id);
	if (profileRow) {
		await updateRow("users", user.id, rowData(user, { ownerId: user.id }));
	} else {
		await createRow("users", user.id, rowData(user, { ownerId: user.id }), privateUser(user.id));
	}

	const publicUser = pubOf(user);
	const publicRow = await getRowOrNull("publicUsers", user.id);
	if (publicRow) {
		await updateRow("publicUsers", user.id, rowData(publicUser, { ownerId: user.id }));
	} else {
		await createRow("publicUsers", user.id, rowData(publicUser, { ownerId: user.id }), publicRead(user.id));
	}
	profileCache = user;
};

const listItems = async (params) => {
	const userId = params.get("mine") ? await uid() : "";
	const category = params.get("cat") || "";
	const searchText = (params.get("q") || "").toLowerCase();
	const searchWords = words(searchText).sort((a, b) => b.length - a.length);
	const queries = [Query.orderDesc("created"), Query.limit(100)];
	if (userId) queries.push(Query.equal("sellerId", userId));
	if (category) queries.push(Query.equal("category", category));
	if (searchWords.length) queries.push(Query.containsAny("kw", [searchWords[0]]));

	const result = await listRows("items", queries);
	let items = result.rows.map(payloadOf);
	if (searchWords.length) {
		items = items.filter((item) => (
			searchWords.every((word) => (item.kw || []).some((keyword) => keyword.startsWith(word)))
		));
	}
	return items.slice(0, 40);
};

async function route(path, options = {}) {
	const [pathname, queryString] = path.split("?");
	const params = new URLSearchParams(queryString || "");
	const body = options.body || {};
	const method = options.method || "GET";

	if (pathname === "/signup") {
		if (!body.terms) throw new Error("You must accept the Terms and Privacy Policy.");
		if (REQ.some((field) => !String(body[field] || "").trim())) {
			throw new Error("Fill every required field.");
		}
		if (String(body.password || "").length < 8) {
			throw new Error("Password must be at least 8 characters.");
		}

		const email = body.email.trim().toLowerCase();
		let created = false;
		let user;
		try {
			user = await account.create({
				userId: ID.unique(),
				email,
				password: body.password,
				name: `${body.firstName} ${body.surname}`.trim(),
			});
			created = true;
		} catch (error) {
			if (error?.type !== "user_already_exists" && Number(error?.code) !== 409) throw error;
		}

		await account.createEmailPasswordSession({ email, password: body.password });
		const userId = user?.$id || (await account.get()).$id;
		const savedProfile = await getRowOrNull("users", userId);
		if (savedProfile) {
			profileCache = payloadOf(savedProfile);
			await saveProfile(profileCache);
			return { token: "appwrite", user: profileCache };
		}

		try {
			const profile = {
				id: userId,
				middleName: (body.middleName || "").trim(),
				photo: await up(body.photo),
				campus: "University of Jos",
				created: Date.now(),
			};
			REQ.forEach((field) => { profile[field] = String(body[field]).trim(); });
			profile.email = email;
			await saveProfile(profile);
			return { token: "appwrite", user: profile };
		} catch (error) {
			if (created) {
				console.error("Appwrite account was created, but profile setup did not finish. Retry signup with the same credentials.", error);
			}
			throw error;
		}
	}

	if (pathname === "/login") {
		const email = String(body.email || "").trim().toLowerCase();
		await run(() => account.createEmailPasswordSession({
			email,
			password: body.password || "",
		}));
		profileCache = null;
		const user = await account.get();
		const row = await getRowOrNull("users", user.$id);
		return {
			token: "appwrite",
			user: row ? payloadOf(row) : { id: user.$id, email: user.email },
		};
	}

	if (pathname === "/password-recovery" && method === "POST") {
		const email = String(body.email || "").trim().toLowerCase();
		if (!email) throw new Error("Enter your email address.");
		const url = `${location.origin}${location.pathname}`;
		await run(() => account.createRecovery({ email, url }));
		return {};
	}

	if (pathname === "/password-recovery/confirm" && method === "POST") {
		if (!body.userId || !body.secret) {
			throw new Error("This password reset link is incomplete. Request a new one.");
		}
		if (String(body.password || "").length < 8) {
			throw new Error("Password must be at least 8 characters.");
		}
		if (body.password !== body.passwordAgain) {
			throw new Error("The passwords do not match.");
		}
		await run(() => account.updateRecovery({
			userId: body.userId,
			secret: body.secret,
			password: body.password,
		}));
		return {};
	}

	if (pathname === "/me") {
		if (method === "PUT") {
			const id = await uid();
			const user = { ...await mine() };
			for (const field of [...REQ, "middleName"]) {
				if (body[field] !== undefined && field !== "email" && field !== "matric") {
					user[field] = String(body[field]).trim();
				}
			}
			if (body.photo !== undefined) user.photo = await up(body.photo);
			if (REQ.some((field) => !user[field])) throw new Error("Required fields cannot be empty.");
			await saveProfile(user);
			return user;
		}
		return mine();
	}

	if (pathname === "/items" && method === "GET") return listItems(params);

	if (pathname === "/items" && method === "POST") {
		const id = await uid();
		if (!body.title || !(String(body.price) !== "" && +body.price >= 0) || !body.category || !body.proof) {
			throw new Error("Title, price, category and the proof-of-ownership confirmation are required.");
		}
		const [user, images] = await Promise.all([
			mine(),
			Promise.all((body.images || []).slice(0, 4).map(up)),
		]);
		const item = {
			sellerId: id,
			title: String(body.title).slice(0, 80),
			description: String(body.description || "").slice(0, 800),
			price: Math.round(+body.price),
			category: body.category,
			condition: body.condition || "Used",
			pickup: String(body.pickup || "").slice(0, 100),
			images,
			image: images[0] || "",
			status: "available",
			kw: words(`${body.title} ${body.category} ${body.description || ""}`),
			created: Date.now(),
			seller: pubOf(user),
		};
		const row = await createRow(
			"items",
			ID.unique(),
			rowData(item, { sellerId: id, category: item.category, created: item.created, kw: item.kw }),
			publicRead(id, true),
		);
		return { id: row.$id, ...item };
	}

	const itemMatch = pathname.match(/^\/items\/([\w.-]+)(\/status)?$/);
	if (itemMatch) {
		const row = await getRow("items", itemMatch[1]);
		const item = payloadOf(row);
		if (method === "GET") return item;
		if (itemMatch[2]) {
			const userId = await uid();
			if (item.sellerId !== userId) throw new Error("You can only update your own listing.");
			if (!["available", "reserved", "sold"].includes(body.status)) throw new Error("Invalid status.");
			item.status = body.status;
			item.soldAt = body.status === "sold" ? Date.now() : null;
			await updateRow("items", row.$id, rowData(item, {
				sellerId: item.sellerId,
				category: item.category,
				created: item.created,
				kw: item.kw || [],
			}));
			return {};
		}
		if (method === "DELETE") {
			const userId = await uid();
			if (item.sellerId !== userId) throw new Error("You can only delete your own listing.");
			await deleteRow("items", row.$id);
			return {};
		}
	}

	throw new Error("Not found.");
}

window.api = async (path, options = {}) => run(() => route(path, options));

window.backend = {
	async out() {
		profileCache = null;
		return run(() => account.deleteSession({ sessionId: "current" }));
	},

	async chatOpen(itemId, buyer) {
		const userId = await uid();
		let chatId;
		let item;
		if (buyer === undefined && itemId.startsWith("chat_")) {
			chatId = itemId;
			const existing = await getRowOrNull("chats", chatId);
			if (!existing) throw new Error("This conversation has not been started by the buyer yet.");
			const savedChat = payloadOf(existing);
			const itemRow = await getRowOrNull("items", savedChat.itemId);
			if (!itemRow) throw new Error("Item not found.");
			item = payloadOf(itemRow);
			buyer = savedChat.participants?.[0];
		} else {
			const splitAt = itemId.lastIndexOf("_");
			if (buyer === undefined && splitAt > 0) {
				buyer = itemId.slice(splitAt + 1);
				itemId = itemId.slice(0, splitAt);
			}
			const itemRow = await getRowOrNull("items", itemId);
			if (!itemRow) throw new Error("Item not found.");
			item = payloadOf(itemRow);
			if (!buyer) throw new Error("Invalid chat link.");
			chatId = await stableId("chat", `${itemId}:${buyer}`);
		}
		let chat = await getRowOrNull("chats", chatId);
		if (userId === buyer) {
			if (buyer === item.sellerId) throw new Error("This is your own item.");
			if (!chat) {
				const value = {
					participants: [buyer, item.sellerId],
					itemId,
					title: item.title,
					updated: Date.now(),
					done: false,
				};
				chat = await createRow("chats", chatId, rowData(value, {
					participants: value.participants,
					updated: value.updated,
				}), value.participants.flatMap((id) => [
					Permission.read(Role.user(id)),
					Permission.update(Role.user(id)),
				]));
			}
		}
		if (!chat) throw new Error("This conversation has not been started by the buyer yet.");
		const value = payloadOf(chat);
		if (value.itemId !== itemId || !value.participants?.includes(userId)) {
			throw new Error("You do not have access to this conversation.");
		}
		const review = await getRowOrNull("reviews", chatId);
		return {
			id: chatId,
			title: item.title,
			itemId,
			done: !!value.done,
			buyer,
			sellerId: item.sellerId,
			reviewed: !!review,
		};
	},

	async send(id, text, image) {
		const now = Date.now();
		if (now - lastMessageAt < 1000) throw new Error("Slow down a little.");
		const userId = await uid();
		const chatRow = await getRow("chats", id);
		const chat = payloadOf(chatRow);
		if (!chat.participants?.includes(userId)) throw new Error("You do not have access to this conversation.");
		const message = text.slice(0, 500);
		const uploadedImage = image ? await up(image) : "";
		await createRow("messages", ID.unique(), rowData({
			from: userId,
			text: message,
			img: uploadedImage,
			t: now,
		}, { chatId: id, t: now, from: userId }), chat.participants.map((participant) => Permission.read(Role.user(participant))));
		await updateRow("chats", id, rowData({
			...chat,
			lastMsg: (message || "Photo").slice(0, 60),
			lastFrom: userId,
			updated: now,
		}, { participants: chat.participants, updated: now }));
		lastMessageAt = now;
	},

	watch(id, callback) {
		ensureRuntime();
		let active = true;
		const refresh = async () => {
			try {
				const result = await listRows("messages", [
					Query.equal("chatId", id),
					Query.orderAsc("t"),
					Query.limit(60),
				]);
				if (active) callback(result.rows.map(payloadOf), null);
			} catch (error) {
				if (active) callback([], fail(error));
			}
		};
		const unsubscribe = client.subscribe(
			Channel.tablesdb(appwriteConfig.databaseId).table(tableId("messages")).row(),
			() => { refresh(); },
		);
		refresh();
		return () => { active = false; unsubscribe(); };
	},

	async inbox() {
		const userId = await uid();
		const result = await listRows("chats", [
			Query.containsAny("participants", [userId]),
			Query.orderDesc("updated"),
			Query.limit(50),
		]);
		return result.rows.map(payloadOf);
	},

	watchItems(filters = {}, callback) {
		ensureRuntime();
		let active = true;
		const params = new URLSearchParams({
			cat: filters.category || "",
			q: filters.q || "",
		});
		const refresh = async () => {
			try {
				const items = await listItems(params);
				if (active) callback(items, null);
			} catch (error) {
				if (active) callback([], fail(error));
			}
		};
		const unsubscribe = client.subscribe(
			Channel.tablesdb(appwriteConfig.databaseId).table(tableId("items")).row(),
			() => { refresh(); },
		);
		refresh();
		return () => { active = false; unsubscribe(); };
	},

	watchInbox(callback) {
		ensureRuntime();
		const refresh = async () => {
			try {
				const userId = await uid();
				const result = await listRows("chats", [
					Query.containsAny("participants", [userId]),
					Query.orderDesc("updated"),
					Query.limit(20),
				]);
				callback(result.rows.map(payloadOf), null);
			} catch (error) {
				callback([], fail(error));
			}
		};
		const unsubscribe = client.subscribe(
			Channel.tablesdb(appwriteConfig.databaseId).table(tableId("chats")).row(),
			() => { refresh(); },
		);
		refresh();
		return unsubscribe;
	},

	async seen(id) {
		try {
			const row = await getRow("chats", id);
			const chat = payloadOf(row);
			const userId = await uid();
			chat.seen = { ...(chat.seen || {}), [userId]: Date.now() };
			await updateRow("chats", id, rowData(chat, {
				participants: chat.participants,
				updated: chat.updated || Date.now(),
			}));
		} catch (error) {
			console.error("Could not update chat read status.", error);
		}
	},

	async isAdmin() {
		try {
			const userId = await uid();
			return !!await getRowOrNull("admins", userId);
		} catch {
			return false;
		}
	},

	async verified(sellerId) {
		return !!await getRowOrNull("verified", sellerId);
	},

	async setVerified(sellerId, verified) {
		await uid();
		const existing = await getRowOrNull("verified", sellerId);
		if (verified && !existing) {
			await createRow("verified", sellerId, rowData({ t: Date.now() }, { ownerId: sellerId }), [
				Permission.read(Role.any()),
				Permission.update(ADMIN_ROLE),
				Permission.delete(ADMIN_ROLE),
			]);
		} else if (!verified && existing) {
			await deleteRow("verified", sellerId);
		}
	},

	async priv(sellerId) {
		const row = await getRowOrNull("users", sellerId);
		return row ? payloadOf(row) : null;
	},

	async reports() {
		const result = await listRows("reports", [
			Query.orderDesc("t"),
			Query.limit(30),
		]);
		return result.rows.map(payloadOf);
	},

	async delReport(id) {
		return deleteRow("reports", id);
	},

	async delItem(id) {
		const row = await getRowOrNull("items", id);
		if (!row) return;
		const item = payloadOf(row);
		const userId = await uid();
		if (item.sellerId !== userId && !await this.isAdmin()) {
			throw new Error("You are not allowed to delete this listing.");
		}
		await deleteRow("items", id);
	},

	async isSaved(id) {
		const userId = await uid();
		return !!await getRowOrNull("saved", await stableId("save", `${userId}:${id}`));
	},

	async toggleSave(item) {
		const userId = await uid();
		const id = await stableId("save", `${userId}:${item.id}`);
		if (await getRowOrNull("saved", id)) {
			await deleteRow("saved", id);
			return false;
		}
		await createRow("saved", id, rowData({
			title: item.title,
			price: item.price,
			image: item.image || "",
			category: item.category,
			status: item.status,
			t: Date.now(),
		}, { ownerId: userId, t: Date.now() }), [
			Permission.read(Role.user(userId)),
			Permission.update(Role.user(userId)),
			Permission.delete(Role.user(userId)),
		]);
		return true;
	},

	async saved() {
		const userId = await uid();
		const result = await listRows("saved", [
			Query.equal("ownerId", userId),
			Query.orderDesc("t"),
			Query.limit(40),
		]);
		return result.rows.map(payloadOf);
	},

	async done(id, itemId) {
		const userId = await uid();
		const chatRow = await getRow("chats", id);
		const chat = payloadOf(chatRow);
		if (chat.participants?.[1] !== userId || chat.itemId !== itemId) {
			throw new Error("Only the seller in this chat can mark the deal done.");
		}
		const itemRow = await getRow("items", itemId);
		const item = payloadOf(itemRow);
		if (item.sellerId !== userId) throw new Error("You can only mark your own listing sold.");
		chat.done = true;
		await updateRow("chats", id, rowData(chat, {
			participants: chat.participants,
			updated: chat.updated || Date.now(),
		}));
		item.status = "sold";
		item.soldAt = Date.now();
		await updateRow("items", itemId, rowData(item, {
			sellerId: item.sellerId,
			category: item.category,
			created: item.created,
			kw: item.kw || [],
		}));
	},

	async review(id, chat, stars, text) {
		const userId = await uid();
		if (chat.buyer !== userId || !chat.done || stars < 1 || stars > 5) {
			throw new Error("Only the buyer can review a completed deal.");
		}
		await createRow("reviews", id, rowData({
			sellerId: chat.sellerId,
			buyerId: chat.buyer,
			itemId: chat.itemId,
			stars,
			text: String(text || "").slice(0, 200),
			t: Date.now(),
		}, { sellerId: chat.sellerId, buyerId: chat.buyer, t: Date.now() }), [
			Permission.read(Role.any()),
			Permission.update(Role.user(userId)),
			Permission.delete(ADMIN_ROLE),
		]);
	},

	async reviews(sellerId) {
		const publicRow = await getRowOrNull("publicUsers", sellerId);
		const result = await listRows("reviews", [
			Query.equal("sellerId", sellerId),
			Query.orderDesc("t"),
			Query.limit(20),
		]);
		return {
			u: publicRow ? payloadOf(publicRow) : { name: "Seller" },
			list: result.rows.map(payloadOf),
		};
	},

	async report(type, reference, reason) {
		const userId = await uid();
		const id = await stableId("report", `${userId}:${reference}`);
		await createRow("reports", id, rowData({
			by: userId,
			type,
			ref: reference,
			reason: String(reason).slice(0, 300),
			t: Date.now(),
		}, { by: userId, type, ref: reference, t: Date.now() }), [
			Permission.read(Role.user(userId)),
			Permission.read(ADMIN_ROLE),
			Permission.delete(ADMIN_ROLE),
		]);
	},
};

/**
 * seed.js — populates food_db (backend) with demo data.
 *
 * Run: node scripts/seed.js
 *
 * Creates:
 *   - 1 admin + 5 regular users on the "food" server
 *   - 4 channels (public, read-only, private, public)
 *   - 20 posts spread across users and channels
 *   - Follow relationships between users
 *   - Channel memberships
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

// ── Inline schema imports (avoids ESM circular-dep issues in scripts) ────────
import User from "../models/User.js";
import Post from "../models/Post.js";
import Channel from "../models/Channel.js";
import UserFollow from "../models/UserFollow.js";
import ChannelFollow from "../models/ChannelFollow.js";

const SERVER = process.env.SERVER_NAME; // "food"

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

const hash = (pw) => bcrypt.hash(pw, 10);
const fedId = (username) => `${username}@${SERVER}`;
const channelFedId = (name) => `${name}@${SERVER}`;
const postFedId = (authorUsername, idx) =>
  `${fedId(authorUsername)}/post/${Date.now() + idx}`;

// ─────────────────────────────────────────────────────────────────────────────
//  Data definitions
// ─────────────────────────────────────────────────────────────────────────────

const USERS = [
  {
    displayName: "Admin Food",
    firstName: "Admin",
    middleName: null,
    lastName: "Food",
    email: "admin@food.com",
    password: "Admin1234!",
    role: "admin",
    username: "admin_food",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=admin_food",
  },
  {
    displayName: "Alice Chen",
    firstName: "Alice",
    middleName: null,
    lastName: "Chen",
    email: "alice@food.com",
    password: "Password123!",
    role: "user",
    username: "alice_chen",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=alice_chen",
  },
  {
    displayName: "Bob Martinez",
    firstName: "Bob",
    middleName: null,
    lastName: "Martinez",
    email: "bob@food.com",
    password: "Password123!",
    role: "user",
    username: "bob_martinez",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=bob_martinez",
  },
  {
    displayName: "Carmen Lopez",
    firstName: "Carmen",
    middleName: null,
    lastName: "Lopez",
    email: "carmen@food.com",
    password: "Password123!",
    role: "user",
    username: "carmen_lopez",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=carmen_lopez",
  },
  {
    displayName: "David Kim",
    firstName: "David",
    middleName: null,
    lastName: "Kim",
    email: "david@food.com",
    password: "Password123!",
    role: "user",
    username: "david_kim",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=david_kim",
  },
  {
    displayName: "Emma Wilson",
    firstName: "Emma",
    middleName: null,
    lastName: "Wilson",
    email: "emma@food.com",
    password: "Password123!",
    role: "user",
    username: "emma_wilson",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=emma_wilson",
  },
];

const CHANNELS = [
  {
    name: "recipes",
    description: "Share your favourite recipes from around the world. All skill levels welcome!",
    rules: ["Be respectful", "Credit original sources", "No spam"],
    visibility: "public",
  },
  {
    name: "foodscience",
    description: "Deep dives into the chemistry and biology behind cooking techniques.",
    rules: ["Stay on topic", "Cite sources where possible", "No pseudoscience"],
    visibility: "read-only",
  },
  {
    name: "secretkitchen",
    description: "An exclusive community for serious home cooks. Join by request only.",
    rules: ["Members only", "No screenshots outside", "Respect everyone's culinary journey"],
    visibility: "private",
  },
  {
    name: "generalfood",
    description: "Everything food — memes, photos, discoveries, rants.",
    rules: ["Keep it food-related", "Be kind"],
    visibility: "public",
  },
];

const USER_POSTS = [
  { authorUsername: "alice_chen", description: "Just finished making handmade pasta from scratch for the first time. Three hours of work but SO worth it. The texture is incomparable to store-bought!" },
  { authorUsername: "alice_chen", description: "Tried that viral Korean corn dog recipe today. Added mozzarella inside and rolled in potato cubes before frying. Absolute perfection." },
  { authorUsername: "bob_martinez", description: "12 hours into my brisket smoke. Running at 225°F with hickory and apple wood. The bark is forming beautifully. Can't wait for midnight!" },
  { authorUsername: "bob_martinez", description: "Hot take: the best BBQ sauce is the one you make yourself. Sharing my KC-style recipe in the comments. Brown sugar, molasses, apple cider vinegar." },
  { authorUsername: "carmen_lopez", description: "My vegan chocolate lava cake uses aquafaba instead of eggs and coconut cream instead of butter. Nobody at the dinner party noticed. They asked for the recipe!" },
  { authorUsername: "david_kim", description: "Restaurant review: Found an authentic tonkotsu ramen spot downtown. 18-hour bone broth, housemade noodles, perfect chashu pork. 10/10 would go back weekly." },
  { authorUsername: "david_kim", description: "Unpopular opinion: instant ramen elevated with proper toppings (soft-boiled egg, nori, green onion, sesame oil) beats most mid-range ramen shops." },
  { authorUsername: "emma_wilson", description: "Day 847 of my sourdough journey. Finally cracked the ear formation. The key was scoring at a 30-degree angle, not 45. Game changer!" },
];

const CHANNEL_POSTS = [
  { authorUsername: "alice_chen", channelName: "recipes", description: "Classic French Onion Soup recipe: 4 large onions caramelized for 45 mins, beef broth, thyme, bay leaf, topped with croutons and gruyere. Broil until bubbly." },
  { authorUsername: "bob_martinez", channelName: "recipes", description: "Texas-style brisket rub: 50/50 coarse black pepper and kosher salt. That's it. Don't overthink it. Let the smoke do the work." },
  { authorUsername: "carmen_lopez", channelName: "recipes", description: "Vegan Pad Thai: rice noodles, tofu, bean sprouts, green onions, crushed peanuts. Sauce = tamarind paste + palm sugar + soy sauce. So good." },
  { authorUsername: "david_kim", channelName: "recipes", description: "Tonkotsu tare recipe: Roast bones at 450°F for 30 mins, then simmer with ginger, garlic, onion for 12-18 hours. Skim fat every hour. The collagen is everything." },
  { authorUsername: "emma_wilson", channelName: "recipes", description: "My sourdough starter formula: 50g mature starter + 100g bread flour + 100g water at 75°F. Feed every 12 hours. Discard half before each feeding." },
  { authorUsername: "alice_chen", channelName: "foodscience", description: "Why does pasta water make sauces silky? The starch released into the water emulsifies the fat in the sauce, creating a creamy coating without cream." },
  { authorUsername: "david_kim", channelName: "foodscience", description: "The Maillard reaction explained: amino acids + reducing sugars + heat (above 140°C) = hundreds of aromatic compounds = that incredible browned flavour on meat and bread." },
  { authorUsername: "carmen_lopez", channelName: "generalfood", description: "PSA: Stop throwing away your veggie scraps. Onion skins, carrot tops, celery leaves — all go in a freezer bag. Once full, simmer for 45 mins = free vegetable stock." },
  { authorUsername: "bob_martinez", channelName: "generalfood", description: "My Saturday morning ritual: farmers market, coffee, then planning the week's meals. Just grabbed heirloom tomatoes, local honey, and fresh chorizo. Menu sorted." },
  { authorUsername: "emma_wilson", channelName: "generalfood", description: "Baked my first croissant this week. 72 layers of butter. 3 days of laminating dough. Definitely humbling. Round 2 next weekend." },
  { authorUsername: "alice_chen", channelName: "secretkitchen", description: "Secret recipe share: my grandmother's congee. Jasmine rice + chicken broth + ginger + soy + cilantro. Cook on low for 2 hours until silky. The definition of comfort food." },
  { authorUsername: "emma_wilson", channelName: "secretkitchen", description: "Experimenting with cold ferment sourdough in the fridge for 48 hours. The flavour complexity is on a different level. Slightly tangy, very open crumb." },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Follow graph: who follows whom  [follower, following]
// ─────────────────────────────────────────────────────────────────────────────

const USER_FOLLOWS = [
  ["alice_chen", "bob_martinez"],
  ["alice_chen", "emma_wilson"],
  ["alice_chen", "david_kim"],
  ["bob_martinez", "alice_chen"],
  ["bob_martinez", "carmen_lopez"],
  ["carmen_lopez", "alice_chen"],
  ["carmen_lopez", "emma_wilson"],
  ["david_kim", "alice_chen"],
  ["david_kim", "bob_martinez"],
  ["emma_wilson", "alice_chen"],
  ["emma_wilson", "carmen_lopez"],
  ["emma_wilson", "david_kim"],
];

// Channel members [username, channelName]  — all get status:'active'
const CHANNEL_MEMBERS = [
  ["alice_chen", "recipes"],
  ["bob_martinez", "recipes"],
  ["carmen_lopez", "recipes"],
  ["david_kim", "recipes"],
  ["emma_wilson", "recipes"],
  ["alice_chen", "foodscience"],
  ["david_kim", "foodscience"],
  ["emma_wilson", "foodscience"],
  ["alice_chen", "generalfood"],
  ["bob_martinez", "generalfood"],
  ["carmen_lopez", "generalfood"],
  ["emma_wilson", "generalfood"],
  // secretkitchen — only alice and emma are members
  ["alice_chen", "secretkitchen"],
  ["emma_wilson", "secretkitchen"],
];

// ─────────────────────────────────────────────────────────────────────────────
//  Seed function
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log(`Connected to MongoDB (${SERVER} server)`);

  // ── Wipe existing seed data ───────────────────────────────────────────────
  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Channel.deleteMany({}),
    UserFollow.deleteMany({}),
    ChannelFollow.deleteMany({}),
  ]);

  // ── Create users ──────────────────────────────────────────────────────────
  console.log("Creating users...");
  const userDocs = await Promise.all(
    USERS.map(async (u) => {
      const hashed = await hash(u.password);
      return User.create({
        displayName: u.displayName,
        firstName: u.firstName,
        middleName: u.middleName,
        lastName: u.lastName,
        dob: new Date("1995-06-15"),
        email: u.email,
        password: hashed,
        role: u.role,
        avatarUrl: u.avatarUrl,
        serverName: SERVER,
        originServer: SERVER,
        federatedId: fedId(u.username),
        isActive: true,
      });
    })
  );
  console.log(`  Created ${userDocs.length} users`);

  // Build username → userDoc map
  const userMap = {};
  USERS.forEach((u, i) => { userMap[u.username] = userDocs[i]; });

  // ── Create channels (created by admin) ────────────────────────────────────
  console.log("Creating channels...");
  const adminFedId = fedId("admin_food");
  const channelDocs = await Promise.all(
    CHANNELS.map((c) =>
      Channel.create({
        name: c.name,
        description: c.description,
        rules: c.rules,
        visibility: c.visibility,
        federatedId: channelFedId(c.name),
        originServer: SERVER,
        serverName: SERVER,
        createdBy: adminFedId,
        followersCount: 0,
      })
    )
  );
  console.log(`  Created ${channelDocs.length} channels`);

  const channelMap = {};
  CHANNELS.forEach((c, i) => { channelMap[c.name] = channelDocs[i]; });

  // ── Create user posts ─────────────────────────────────────────────────────
  console.log("Creating posts...");
  const allPostDefs = [
    ...USER_POSTS.map((p) => ({ ...p, isChannelPost: false, channelName: null })),
    ...CHANNEL_POSTS.map((p) => ({ ...p, isChannelPost: true })),
  ];

  const postDocs = await Promise.all(
    allPostDefs.map((p, idx) => {
      const author = userMap[p.authorUsername];
      return Post.create({
        description: p.description,
        authorFederatedId: fedId(p.authorUsername),
        userDisplayName: author.displayName,
        isUserPost: !p.isChannelPost,
        isChannelPost: p.isChannelPost,
        channelName: p.channelName || null,
        federatedId: postFedId(p.authorUsername, idx),
        originServer: SERVER,
        serverName: SERVER,
        isRemote: false,
      });
    })
  );
  console.log(`  Created ${postDocs.length} posts`);

  // ── Create user follows ───────────────────────────────────────────────────
  console.log("Creating user follows...");
  const followDocs = await Promise.all(
    USER_FOLLOWS.map(([follower, following]) =>
      UserFollow.create({
        followerFederatedId: fedId(follower),
        followingFederatedId: fedId(following),
        serverName: SERVER,
        followerOriginServer: SERVER,
        followingOriginServer: SERVER,
        isRemote: false,
      })
    )
  );
  // Update follower/following counts
  for (const [follower, following] of USER_FOLLOWS) {
    await User.findOneAndUpdate({ federatedId: fedId(follower) }, { $inc: { followingCount: 1 } });
    await User.findOneAndUpdate({ federatedId: fedId(following) }, { $inc: { followersCount: 1 } });
  }
  console.log(`  Created ${followDocs.length} user follows`);

  // ── Create channel memberships ────────────────────────────────────────────
  console.log("Creating channel memberships...");
  const channelFollowDocs = await Promise.all(
    CHANNEL_MEMBERS.map(([username, channelName]) =>
      ChannelFollow.create({
        userFederatedId: fedId(username),
        channelFederatedId: channelFedId(channelName),
        channelName,
        serverName: SERVER,
        userOriginServer: SERVER,
        channelOriginServer: SERVER,
        isRemote: false,
        status: "active",
      })
    )
  );
  // Update channel follower counts
  const channelMemberCounts = {};
  for (const [, channelName] of CHANNEL_MEMBERS) {
    channelMemberCounts[channelName] = (channelMemberCounts[channelName] || 0) + 1;
  }
  for (const [name, count] of Object.entries(channelMemberCounts)) {
    await Channel.findOneAndUpdate({ federatedId: channelFedId(name) }, { followersCount: count });
  }
  console.log(`  Created ${channelFollowDocs.length} channel memberships`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete for server:", SERVER);
  console.log("─────────────────────────────────────────────");
  console.log(`  Users    : ${userDocs.length}`);
  console.log(`  Channels : ${channelDocs.length}`);
  console.log(`  Posts    : ${postDocs.length}`);
  console.log(`  Follows  : ${followDocs.length}`);
  console.log(`  Members  : ${channelFollowDocs.length}`);
  console.log("\n  Credentials (all regular users): Password123!");
  console.log("  Admin credentials: admin@food.com / Admin1234!");
  console.log("─────────────────────────────────────────────");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

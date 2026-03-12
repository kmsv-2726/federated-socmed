/**
 * seed.js — populates sports_db (backend-sports) with demo data.
 *
 * Run: node scripts/seed.js
 *
 * Creates:
 *   - 1 admin + 5 regular users on the "sports" server
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

import User from "../models/User.js";
import Post from "../models/Post.js";
import Channel from "../models/Channel.js";
import UserFollow from "../models/UserFollow.js";
import ChannelFollow from "../models/ChannelFollow.js";

const SERVER = process.env.SERVER_NAME; // "sports"

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
    displayName: "Admin Sports",
    firstName: "Admin",
    middleName: null,
    lastName: "Sports",
    email: "admin@sports.com",
    password: "Admin1234!",
    role: "admin",
    username: "admin_sports",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=admin_sports",
  },
  {
    displayName: "Alex Thompson",
    firstName: "Alex",
    middleName: null,
    lastName: "Thompson",
    email: "alex@sports.com",
    password: "Password123!",
    role: "user",
    username: "alex_thompson",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=alex_thompson",
  },
  {
    displayName: "Ben Rodriguez",
    firstName: "Ben",
    middleName: null,
    lastName: "Rodriguez",
    email: "ben@sports.com",
    password: "Password123!",
    role: "user",
    username: "ben_rodriguez",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=ben_rodriguez",
  },
  {
    displayName: "Chloe Nguyen",
    firstName: "Chloe",
    middleName: null,
    lastName: "Nguyen",
    email: "chloe@sports.com",
    password: "Password123!",
    role: "user",
    username: "chloe_nguyen",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=chloe_nguyen",
  },
  {
    displayName: "Dan Foster",
    firstName: "Dan",
    middleName: null,
    lastName: "Foster",
    email: "dan@sports.com",
    password: "Password123!",
    role: "user",
    username: "dan_foster",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=dan_foster",
  },
  {
    displayName: "Sara Patel",
    firstName: "Sara",
    middleName: null,
    lastName: "Patel",
    email: "sara@sports.com",
    password: "Password123!",
    role: "user",
    username: "sara_patel",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=sara_patel",
  },
];

const CHANNELS = [
  {
    name: "football",
    description: "Everything football — match previews, live reactions, tactics, and transfer gossip.",
    rules: ["Respect all clubs", "No racist abuse", "Keep it civil in derbies"],
    visibility: "public",
  },
  {
    name: "analytics",
    description: "Advanced stats, xG models, and data-driven sports analysis. Read and discuss.",
    rules: ["Cite your data sources", "Stay analytical", "No pure opinion pieces"],
    visibility: "read-only",
  },
  {
    name: "coaches-corner",
    description: "A private space for coaches and analysts to exchange tactics and training secrets.",
    rules: ["Verified coaches only", "No screenshots outside", "Confidentiality respected"],
    visibility: "private",
  },
  {
    name: "general",
    description: "All sports, all the time. Hot takes, highlights, and highlights.",
    rules: ["Be respectful", "Keep it sports-related"],
    visibility: "public",
  },
];

const USER_POSTS = [
  { authorUsername: "alex_thompson", description: "Unbelievable end to last night's match. 94th minute equaliser after being 2-0 down at half time. That is why we watch football." },
  { authorUsername: "alex_thompson", description: "Transfer window hot take: spending £80m on a striker when your midfield can't keep possession for more than 3 passes is just expensive window dressing." },
  { authorUsername: "ben_rodriguez", description: "Just finished watching the playoffs highlights. The defensive intensity in the 4th quarter was on another level. That switch-heavy scheme completely neutralised their star player." },
  { authorUsername: "ben_rodriguez", description: "Unpopular opinion: box scores lie. A 28-point game on 10-28 shooting with 6 turnovers is a bad game regardless of the final line." },
  { authorUsername: "chloe_nguyen", description: "Week 12 of marathon training. Hit my long run PB — 32km at goal marathon pace. Legs felt like jelly after but mentally I feel UNSTOPPABLE. Race day in 6 weeks!" },
  { authorUsername: "dan_foster", description: "Day 2 of the Test. England declared 100 runs behind with 3 sessions left. Classic. Aggressive cricket or outright madness? I'm going with genius until proven otherwise." },
  { authorUsername: "sara_patel", description: "Coaching note of the week: most club players try to hit winners too early. The point you win isn't the one where you go for the line — it's the one you set up three shots before." },
  { authorUsername: "dan_foster", description: "The GOAT debate in cricket is settled for me: it's Bradman, by a distance that no other sport can claim for any single player. 99.94 career average. The next best is 60-something." },
];

const CHANNEL_POSTS = [
  { authorUsername: "alex_thompson", channelName: "football", description: "Preview: Saturday's top-of-the-table clash looks fascinating tactically. Home side's high press vs away team's quick transitions. The team that controls the tempo wins." },
  { authorUsername: "ben_rodriguez", channelName: "football", description: "This window's most underrated signing has to go to Brighton. A deep-lying playmaker who averages 87% pass accuracy and 7.2 progressive passes per 90. Bargain at £9m." },
  { authorUsername: "alex_thompson", channelName: "football", description: "LIVE: 87 mins — still 1-1. Both managers going for it with the subs. If this finishes all-square everyone will be frustrated except the neutrals." },
  { authorUsername: "chloe_nguyen", channelName: "football", description: "Interesting to see how many Premier League clubs are now using GPS load monitoring in training. The sports science convergence between football and endurance running is real." },
  { authorUsername: "ben_rodriguez", channelName: "analytics", description: "New xG model post: Accounting for shot pressure (defender proximity) adds 0.04 R² over basic xG. Pressure is real and measurable. Dataset: 15k shots, last 3 seasons." },
  { authorUsername: "sara_patel", channelName: "analytics", description: "Tennis rally length by surface: Hard (4.3 avg), Clay (6.1 avg), Grass (3.8 avg). Modern grass is faster than hard courts after Wimbledon's surface change in 2001." },
  { authorUsername: "alex_thompson", channelName: "general", description: "Greatest sporting comebacks of all time — mine is Liverpool 3-3 AC Milan, Istanbul 2005. 0-3 at half time. What's yours?" },
  { authorUsername: "chloe_nguyen", channelName: "general", description: "Just signed up for an ultra-marathon. 60km through mountain trails. My therapist would not approve. My Garmin is very excited." },
  { authorUsername: "dan_foster", channelName: "general", description: "Mandatory hot take Friday: Cricket's 5-day Test format should never be shortened. It's the only sport that legitimately tests mental endurance as much as physical skill." },
  { authorUsername: "alex_thompson", channelName: "general", description: "Weekend sport schedule loading: Saturday — 3 football matches. Sunday — F1 race + tennis final. Who needs sleep?" },
  { authorUsername: "sara_patel", channelName: "coaches-corner", description: "Training session design: I've moved away from block periodization to a wave-loading approach. Harder sessions on Tuesday/Thursday with active recovery Wednesday. Recovery metrics have improved 18%." },
  { authorUsername: "ben_rodriguez", channelName: "coaches-corner", description: "Film session gem this week: spacing concepts — when your corner shooter catches in the short corner vs the slot position changes the defensive collapse time by ~0.4 seconds. That's a make or miss proposition." },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Follow graph: who follows whom  [follower, following]
// ─────────────────────────────────────────────────────────────────────────────

const USER_FOLLOWS = [
  ["alex_thompson", "ben_rodriguez"],
  ["alex_thompson", "chloe_nguyen"],
  ["alex_thompson", "sara_patel"],
  ["ben_rodriguez", "alex_thompson"],
  ["ben_rodriguez", "dan_foster"],
  ["chloe_nguyen", "sara_patel"],
  ["chloe_nguyen", "alex_thompson"],
  ["dan_foster", "alex_thompson"],
  ["dan_foster", "ben_rodriguez"],
  ["sara_patel", "chloe_nguyen"],
  ["sara_patel", "ben_rodriguez"],
  ["sara_patel", "dan_foster"],
];

// Channel members [username, channelName]
const CHANNEL_MEMBERS = [
  ["alex_thompson", "football"],
  ["ben_rodriguez", "football"],
  ["chloe_nguyen", "football"],
  ["dan_foster", "football"],
  ["sara_patel", "football"],
  ["ben_rodriguez", "analytics"],
  ["sara_patel", "analytics"],
  ["alex_thompson", "analytics"],
  ["alex_thompson", "general"],
  ["ben_rodriguez", "general"],
  ["chloe_nguyen", "general"],
  ["dan_foster", "general"],
  // coaches-corner — coaches only
  ["sara_patel", "coaches-corner"],
  ["ben_rodriguez", "coaches-corner"],
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

  const userMap = {};
  USERS.forEach((u, i) => { userMap[u.username] = userDocs[i]; });

  // ── Create channels ───────────────────────────────────────────────────────
  console.log("Creating channels...");
  const adminFedId = fedId("admin_sports");
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

  // ── Create posts ──────────────────────────────────────────────────────────
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

  // ── User follows ──────────────────────────────────────────────────────────
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
  for (const [follower, following] of USER_FOLLOWS) {
    await User.findOneAndUpdate({ federatedId: fedId(follower) }, { $inc: { followingCount: 1 } });
    await User.findOneAndUpdate({ federatedId: fedId(following) }, { $inc: { followersCount: 1 } });
  }
  console.log(`  Created ${followDocs.length} user follows`);

  // ── Channel memberships ───────────────────────────────────────────────────
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
  console.log("  Admin credentials: admin@sports.com / Admin1234!");
  console.log("─────────────────────────────────────────────");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

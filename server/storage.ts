import { 
  users, characters, conversations, messages, ratings, payments,
  type User, type InsertUser, type Character, type InsertCharacter,
  type Conversation, type InsertConversation, type Message, type InsertMessage,
  type Rating, type InsertRating, type Payment, type InsertPayment
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, avg, count, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCoins(userId: number, coins: number): Promise<void>;
  updateUserLastLogin(userId: number): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Characters
  getAllCharacters(): Promise<Character[]>;
  getCharacterByKey(key: string): Promise<Character | undefined>;
  getCharacterById(id: number): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: number, character: Partial<InsertCharacter>): Promise<Character | undefined>;
  deleteCharacter(id: number): Promise<void>;

  // Conversations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getUserActiveConversation(userId: number, characterId: number): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  deleteConversation(id: number, userId: number): Promise<void>;
  endConversation(id: number): Promise<void>;
  incrementMessageCount(conversationId: number): Promise<void>;
  updateConversationLastMessage(conversationId: number): Promise<void>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: number): Promise<Message[]>;

  // Ratings
  createRating(rating: InsertRating): Promise<Rating>;
  getCharacterRatings(characterId: number): Promise<Rating[]>;
  getCharacterAverageRating(characterId: number): Promise<number>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getAllPayments(): Promise<Payment[]>;
  updatePaymentStatus(id: number, status: string, paymentId?: string): Promise<void>;

  // Analytics
  getTotalUsers(): Promise<number>;
  getTotalConversations(): Promise<number>;
  getOverallAverageRating(): Promise<number>;
  getDailyLoginStats(): Promise<{ newUsers: number; returningUsers: number }>;
  getUserAnalytics(): Promise<{
    totalUsers: number;
    totalPaidUsers: number;
    totalFreeUsers: number;
    registeredButNoMessages: number;
    partialFreeMessages: number;
    completedFreeNoPayment: number;
    averageMessagesPerUser: number;
    conversionRate: number;
    dailySignups: number;
    weeklySignups: number;
    monthlySignups: number;
  }>;
  getDetailedUserList(): Promise<{
    id: number;
    username: string;
    coins: number;
    totalMessages: number;
    lastLoginAt: string | null;
    createdAt: string;
    isPaid: boolean;
    paymentCount: number;
  }[]>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserCoins(userId: number, coins: number): Promise<void> {
    await db
      .update(users)
      .set({ coins })
      .where(eq(users.id, userId));
  }

  async updateUserLastLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<any[]> {
    const usersWithPayments = await db
      .select({
        id: users.id,
        username: users.username,
        coins: users.coins,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        totalPayments: sql<number>`COUNT(${payments.id})`.as('totalPayments')
      })
      .from(users)
      .leftJoin(payments, and(
        eq(payments.userId, users.id),
        eq(payments.status, 'completed')
      ))
      .groupBy(users.id, users.username, users.coins, users.lastLoginAt, users.createdAt)
      .orderBy(users.createdAt);

    return usersWithPayments.map(user => ({
      ...user,
      isPaid: user.totalPayments > 0
    }));
  }

  // Characters
  async getAllCharacters(): Promise<Character[]> {
    return await db.select().from(characters).where(eq(characters.isActive, true));
  }

  async getCharacterByKey(key: string): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.key, key));
    return character || undefined;
  }

  async getCharacterById(id: number): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character || undefined;
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    const [newCharacter] = await db
      .insert(characters)
      .values(character)
      .returning();
    return newCharacter;
  }

  async updateCharacter(id: number, character: Partial<InsertCharacter>): Promise<Character | undefined> {
    const [updated] = await db
      .update(characters)
      .set(character)
      .where(eq(characters.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCharacter(id: number): Promise<void> {
    await db
      .update(characters)
      .set({ isActive: false })
      .where(eq(characters.id, id));
  }

  // Conversations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getUserActiveConversation(userId: number, characterId: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.userId, userId),
        eq(conversations.characterId, characterId),
        eq(conversations.isActive, true)
      ))
      .orderBy(desc(conversations.createdAt))
      .limit(1);
    return conversation || undefined;
  }

  async endConversation(id: number): Promise<void> {
    await db
      .update(conversations)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(conversations.id, id));
  }

  async incrementMessageCount(conversationId: number): Promise<void> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (conversation) {
      await db
        .update(conversations)
        .set({ messageCount: conversation.messageCount + 1 })
        .where(eq(conversations.id, conversationId));
    }
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async deleteConversation(id: number, userId: number): Promise<void> {
    // First delete all messages in the conversation
    await db
      .delete(messages)
      .where(eq(messages.conversationId, id));
    
    // Then delete the conversation (ensure user owns it)
    await db
      .delete(conversations)
      .where(and(
        eq(conversations.id, id),
        eq(conversations.userId, userId)
      ));
  }

  async updateConversationLastMessage(conversationId: number): Promise<void> {
    await db
      .update(conversations)
      .set({ 
        lastMessageAt: new Date() 
      })
      .where(eq(conversations.id, conversationId));
  }

  // Messages
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  // Ratings
  async createRating(rating: InsertRating): Promise<Rating> {
    const [newRating] = await db
      .insert(ratings)
      .values(rating)
      .returning();
    return newRating;
  }

  async getCharacterRatings(characterId: number): Promise<Rating[]> {
    return await db
      .select()
      .from(ratings)
      .where(eq(ratings.characterId, characterId));
  }

  async getCharacterAverageRating(characterId: number): Promise<number> {
    const [result] = await db
      .select({ average: avg(ratings.rating) })
      .from(ratings)
      .where(eq(ratings.characterId, characterId));
    return Number(result?.average) || 0;
  }

  // Payments
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }

  async updatePaymentStatus(id: number, status: string, paymentId?: string): Promise<void> {
    const updateData: any = { status };
    if (paymentId) {
      updateData.paymentId = paymentId;
    }
    await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, id));
  }

  // Analytics
  async getTotalUsers(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(users);
    return result?.count || 0;
  }

  async getTotalConversations(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(conversations);
    return result?.count || 0;
  }

  async getOverallAverageRating(): Promise<number> {
    const [result] = await db.select({ average: avg(ratings.rating) }).from(ratings);
    return Number(result?.average) || 0;
  }

  async getDailyLoginStats(): Promise<{ newUsers: number; returningUsers: number }> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // New users (registered in last 24 hours)
    const [newUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} >= ${twentyFourHoursAgo}`);

    // Returning users (logged in last 24 hours but registered before)
    const [returningUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        sql`${users.lastLoginAt} >= ${twentyFourHoursAgo}`,
        sql`${users.createdAt} < ${twentyFourHoursAgo}`
      ));

    return {
      newUsers: Number(newUsersResult?.count || 0),
      returningUsers: Number(returningUsersResult?.count || 0)
    };
  }

  async getUserAnalytics(): Promise<{
    totalUsers: number;
    totalPaidUsers: number;
    totalFreeUsers: number;
    registeredButNoMessages: number;
    partialFreeMessages: number;
    completedFreeNoPayment: number;
    averageMessagesPerUser: number;
    conversionRate: number;
    dailySignups: number;
    weeklySignups: number;
    monthlySignups: number;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total users
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const totalUsers = Number(totalUsersResult?.count || 0);

    // Get paid users (users with any payments - pending or completed)
    const [paidUsersResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
      .from(users)
      .innerJoin(payments, eq(payments.userId, users.id));
    const totalPaidUsers = Number(paidUsersResult?.count || 0);

    const totalFreeUsers = totalUsers - totalPaidUsers;

    // Get users with no messages (registered but never used)
    const [noMessagesResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
      .from(users)
      .leftJoin(conversations, eq(conversations.userId, users.id))
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .where(sql`${messages.id} IS NULL`);
    const registeredButNoMessages = Number(noMessagesResult?.count || 0);

    // Get users who used 1-4 free messages (partial usage)
    const [partialFreeResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
      .from(users)
      .innerJoin(conversations, eq(conversations.userId, users.id))
      .where(
        and(
          sql`${conversations.messageCount} > 0`,
          sql`${conversations.messageCount} < 5`,
          sql`${users.id} NOT IN (SELECT DISTINCT user_id FROM payments)`
        )
      );
    const partialFreeMessages = Number(partialFreeResult?.count || 0);

    // Get users who used all 5 free messages but didn't pay
    const [completedFreeResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
      .from(users)
      .innerJoin(conversations, eq(conversations.userId, users.id))
      .where(
        and(
          sql`${conversations.messageCount} >= 5`,
          sql`${users.id} NOT IN (SELECT DISTINCT user_id FROM payments)`
        )
      );
    const completedFreeNoPayment = Number(completedFreeResult?.count || 0);

    // Get average messages per user
    const [avgMessagesResult] = await db
      .select({ avg: sql<number>`COALESCE(AVG(${conversations.messageCount}), 0)` })
      .from(conversations);
    const averageMessagesPerUser = Number(avgMessagesResult?.avg || 0);

    // Calculate conversion rate
    const conversionRate = totalUsers > 0 ? (totalPaidUsers / totalUsers) * 100 : 0;

    // Get signup trends
    const [dailySignupsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`DATE(${users.createdAt}) = DATE(${today})`);
    const dailySignups = Number(dailySignupsResult?.count || 0);

    const [weeklySignupsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} >= ${weekAgo}`);
    const weeklySignups = Number(weeklySignupsResult?.count || 0);

    const [monthlySignupsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} >= ${monthAgo}`);
    const monthlySignups = Number(monthlySignupsResult?.count || 0);

    return {
      totalUsers,
      totalPaidUsers,
      totalFreeUsers,
      registeredButNoMessages,
      partialFreeMessages,
      completedFreeNoPayment,
      averageMessagesPerUser,
      conversionRate,
      dailySignups,
      weeklySignups,
      monthlySignups
    };
  }

  async getDetailedUserList(): Promise<{
    id: number;
    username: string;
    coins: number;
    totalMessages: number;
    lastLoginAt: string | null;
    createdAt: string;
    isPaid: boolean;
    paymentCount: number;
  }[]> {
    // Get all users first
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        coins: users.coins,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get message counts for each user
    const messageCounts = await db
      .select({
        userId: conversations.userId,
        totalMessages: sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`.as('totalMessages')
      })
      .from(conversations)
      .groupBy(conversations.userId);

    // Get payment counts for each user
    const paymentCounts = await db
      .select({
        userId: payments.userId,
        paymentCount: sql<number>`COUNT(${payments.id})`.as('paymentCount')
      })
      .from(payments)
      .groupBy(payments.userId);

    // Combine the data
    return allUsers.map(user => {
      const messageData = messageCounts.find(m => m.userId === user.id);
      const paymentData = paymentCounts.find(p => p.userId === user.id);
      
      return {
        ...user,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        totalMessages: Number(messageData?.totalMessages || 0),
        paymentCount: Number(paymentData?.paymentCount || 0),
        isPaid: (paymentData?.paymentCount || 0) > 0,
      };
    });
  }
}

export const storage = new DatabaseStorage();

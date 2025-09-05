import { User, HistoryEntry, LogAnalysis } from '../types';

// --- User Management ---

const USERS_KEY = 'logSleuthUsers';
const SESSION_KEY = 'logSleuthSession';

/**
 * A centralized function to ensure the default admin user is created on first run.
 * This function is the single source of truth for retrieving the user data object.
 */
const initializeAndGetUsers = (): { [email: string]: User & { password?: string } } => {
  const usersJson = localStorage.getItem(USERS_KEY);
  if (!usersJson) {
    // Initialize with a default admin user if none exist
    const adminUser: User = { id: 'admin-user', email: 'admin@log-sleuth.com', role: 'admin' };
    const initialUsers = {
      'admin@log-sleuth.com': { ...adminUser, password: 'admin123' }
    };
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }
  return JSON.parse(usersJson);
};


const getStoredUsers = (): User[] => {
  const userMap = initializeAndGetUsers();
  return Object.values(userMap).map((u: any) => ({ id: u.id, email: u.email, role: u.role }));
};

const getStoredUsersWithPasswords = (): { [email: string]: User & { password?: string } } => {
    return initializeAndGetUsers();
};

export const register = (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getStoredUsersWithPasswords();
      if (users[email]) {
        return reject(new Error('User with this email already exists.'));
      }
      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        role: 'user',
      };
      users[email] = { ...newUser, password };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      resolve(newUser);
    }, 500);
  });
};

export const login = (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
        const users = getStoredUsersWithPasswords();
        const user = users[email];
        if (user && user.password === password) {
            const userToReturn: User = { id: user.id, email: user.email, role: user.role };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(userToReturn));
            resolve(userToReturn);
        } else {
            reject(new Error('Invalid email or password.'));
        }
    }, 500);
  });
};

export const logout = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const userJson = sessionStorage.getItem(SESSION_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

// --- History Management ---

const HISTORY_KEY = 'logSleuthHistory';

const getStoredHistory = (): { [userId: string]: HistoryEntry[] } => {
  const historyJson = localStorage.getItem(HISTORY_KEY);
  return historyJson ? JSON.parse(historyJson) : {};
};

const saveStoredHistory = (history: { [userId: string]: HistoryEntry[] }) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const getHistory = (userId: string): Promise<HistoryEntry[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
        const allHistory = getStoredHistory();
        resolve(allHistory[userId] || []);
    }, 300);
  });
};

export const saveAnalysis = (userId: string, logContent: string, analysis: LogAnalysis): Promise<HistoryEntry> => {
    return new Promise((resolve) => {
        const allHistory = getStoredHistory();
        if (!allHistory[userId]) {
            allHistory[userId] = [];
        }
        const newEntry: HistoryEntry = {
            id: `hist-${Date.now()}`,
            userId,
            createdAt: new Date().toISOString(),
            logContent,
            analysis,
        };
        allHistory[userId].unshift(newEntry);
        saveStoredHistory(allHistory);
        resolve(newEntry);
    });
};

export const deleteHistory = (userId: string, historyId: string): Promise<void> => {
    return new Promise((resolve) => {
        const allHistory = getStoredHistory();
        if (allHistory[userId]) {
            allHistory[userId] = allHistory[userId].filter(entry => entry.id !== historyId);
            saveStoredHistory(allHistory);
        }
        resolve();
    });
};

export const clearHistory = (userId: string): Promise<void> => {
     return new Promise((resolve) => {
        const allHistory = getStoredHistory();
        if (allHistory[userId]) {
            allHistory[userId] = [];
            saveStoredHistory(allHistory);
        }
        resolve();
    });
};

// --- Admin ---

export const getAllHistoryForAdmin = (): Promise<{ user: User, history: HistoryEntry[] }[]> => {
    return new Promise((resolve) => {
        const allUsers = getStoredUsers();
        const allHistory = getStoredHistory();
        
        const result = allUsers
            .filter(user => user.role !== 'admin')
            .map(user => ({
                user,
                history: allHistory[user.id] || [],
            }));

        resolve(result);
    });
};
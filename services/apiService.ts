import { User, HistoryEntry, LogAnalysis, AlertRule, TriggeredAlert, ExportOptions } from '../types';

// --- User Management ---

const USERS_KEY = 'logSleuthUsers';
const SESSION_KEY = 'logSleuthSession';

type StoredUser = User & { 
    password?: string;
    resetToken?: string;
    resetTokenExpiry?: number;
};

/**
 * A centralized function to ensure the default admin user is created on first run.
 * This function is the single source of truth for retrieving the user data object.
 */
const initializeAndGetUsers = (): { [email: string]: StoredUser } => {
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

const getStoredUsersWithPasswords = (): { [email: string]: StoredUser } => {
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

export const forgotPassword = (email: string): Promise<string> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const users = getStoredUsersWithPasswords();
            const user = users[email];
            if (user) {
                const token = `token-${Date.now()}-${Math.random()}`;
                // Token expires in 1 hour
                const expiry = Date.now() + 3600 * 1000;
                user.resetToken = token;
                user.resetTokenExpiry = expiry;
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                resolve(token); // In real app, you'd email this. We return for simulation.
            }
            // Still resolve to prevent user enumeration attacks
            resolve(''); 
        }, 500);
    });
};

export const resetPassword = (token: string, newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const users = getStoredUsersWithPasswords();
            const userEntry = Object.entries(users).find(([, u]) => u.resetToken === token);

            if (!userEntry) {
                return reject(new Error('Invalid or expired reset token.'));
            }

            const [email, user] = userEntry;

            if (!user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
                delete user.resetToken;
                delete user.resetTokenExpiry;
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                return reject(new Error('Invalid or expired reset token.'));
            }
            
            user.password = newPassword;
            delete user.resetToken;
            delete user.resetTokenExpiry;

            users[email] = user;
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            resolve();

        }, 500);
    });
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

// --- Alert Rules Management ---

const ALERT_RULES_KEY = 'logSleuthAlertRules';
const TRIGGERED_ALERTS_KEY = 'logSleuthTriggeredAlerts';

const getStoredAlertRules = (): { [userId: string]: AlertRule[] } => {
  const rulesJson = localStorage.getItem(ALERT_RULES_KEY);
  return rulesJson ? JSON.parse(rulesJson) : {};
};

const saveStoredAlertRules = (rules: { [userId: string]: AlertRule[] }) => {
  localStorage.setItem(ALERT_RULES_KEY, JSON.stringify(rules));
};

export const getAlertRules = (userId: string): Promise<AlertRule[]> => {
  return new Promise((resolve) => {
    const allRules = getStoredAlertRules();
    resolve(allRules[userId] || []);
  });
};

export const saveAlertRule = (userId: string, rule: Omit<AlertRule, 'id' | 'userId'>): Promise<AlertRule> => {
  return new Promise((resolve) => {
    const allRules = getStoredAlertRules();
    if (!allRules[userId]) {
      allRules[userId] = [];
    }
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      userId,
    };
    allRules[userId].push(newRule);
    saveStoredAlertRules(allRules);
    resolve(newRule);
  });
};

export const deleteAlertRule = (userId: string, ruleId: string): Promise<void> => {
  return new Promise((resolve) => {
    const allRules = getStoredAlertRules();
    if (allRules[userId]) {
      allRules[userId] = allRules[userId].filter(r => r.id !== ruleId);
      saveStoredAlertRules(allRules);
    }
    resolve();
  });
};


// --- Triggered Alerts Management ---

const getStoredTriggeredAlerts = (): { [userId: string]: TriggeredAlert[] } => {
  const alertsJson = localStorage.getItem(TRIGGERED_ALERTS_KEY);
  return alertsJson ? JSON.parse(alertsJson) : {};
};

const saveStoredTriggeredAlerts = (alerts: { [userId: string]: TriggeredAlert[] }) => {
  localStorage.setItem(TRIGGERED_ALERTS_KEY, JSON.stringify(alerts));
};

export const getTriggeredAlerts = (userId: string): Promise<TriggeredAlert[]> => {
    return new Promise((resolve) => {
        const allAlerts = getStoredTriggeredAlerts();
        resolve((allAlerts[userId] || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });
};

export const createTriggeredAlerts = (userId: string, newAlerts: Omit<TriggeredAlert, 'id' | 'userId'>[]): Promise<TriggeredAlert[]> => {
    return new Promise((resolve) => {
        if (newAlerts.length === 0) {
            resolve([]);
            return;
        }
        const allAlerts = getStoredTriggeredAlerts();
        if (!allAlerts[userId]) {
            allAlerts[userId] = [];
        }
        const createdAlerts: TriggeredAlert[] = newAlerts.map((alert, index) => ({
            ...alert,
            id: `alert-${Date.now()}-${index}`,
            userId,
        }));
        
        allAlerts[userId].unshift(...createdAlerts);
        
        if(allAlerts[userId].length > 50) {
            allAlerts[userId] = allAlerts[userId].slice(0, 50);
        }
        saveStoredTriggeredAlerts(allAlerts);
        resolve(createdAlerts);
    });
};


export const markAllAlertsAsRead = (userId: string): Promise<TriggeredAlert[]> => {
    return new Promise((resolve) => {
        const allAlerts = getStoredTriggeredAlerts();
        if (allAlerts[userId]) {
            const updatedAlerts = allAlerts[userId].map(a => ({...a, isRead: true}));
            allAlerts[userId] = updatedAlerts;
            saveStoredTriggeredAlerts(allAlerts);
            resolve(updatedAlerts);
        } else {
            resolve([]);
        }
    });
};

// --- External Export ---

export const exportToWebhook = async (options: ExportOptions, payload: string | object): Promise<void> => {
    const headers: HeadersInit = {};
    let body: string;

    if (options.format === 'JSON') {
        headers['Content-Type'] = 'application/json';
        body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    } else {
        headers['Content-Type'] = 'text/plain';
        body = String(payload);
    }

    if (options.authToken) {
        headers['Authorization'] = `Bearer ${options.authToken}`;
    }

    try {
        const response = await fetch(options.url, {
            method: 'POST',
            headers,
            body,
            mode: 'cors'
        });

        if (!response.ok) {
            const responseBody = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${responseBody || 'No response body'}`);
        }
    } catch (error) {
         if (error instanceof TypeError) { // Often indicates a network error or CORS issue
            throw new Error('Export failed. This could be due to a network issue or a CORS policy on the destination server. Please check the browser console for more details.');
        }
        throw error;
    }
};
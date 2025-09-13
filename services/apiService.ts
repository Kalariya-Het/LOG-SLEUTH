import { supabase } from './supabaseClient';
import { HistoryEntry, LogAnalysis, User } from '../types';

// --- History Management ---

export const getHistory = async (userId: string): Promise<HistoryEntry[]> => {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching history:', error);
    throw error;
  }
  
  // Map Supabase data to HistoryEntry type
  return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      createdAt: item.created_at,
      logContent: item.log_content,
      analysis: item.analysis_result as LogAnalysis,
  }));
};

export const saveAnalysis = async (userId: string, logContent: string, analysis: LogAnalysis): Promise<HistoryEntry> => {
    const { data, error } = await supabase
        .from('analyses')
        .insert([{ user_id: userId, log_content: logContent, analysis_result: analysis }])
        .select()
        .single();

    if (error) {
        console.error('Error saving analysis:', error);
        throw error;
    }

    return {
        id: data.id,
        userId: data.user_id,
        createdAt: data.created_at,
        logContent: data.log_content,
        analysis: data.analysis_result as LogAnalysis,
    };
};

export const deleteHistory = async (historyId: string): Promise<void> => {
    const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', historyId);

    if (error) {
        console.error('Error deleting history:', error);
        throw error;
    }
};

export const clearHistory = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error clearing history:', error);
        throw error;
    }
};

// --- Admin ---

export const getAllHistoryForAdmin = async (): Promise<{ user: User, history: HistoryEntry[] }[]> => {
    // This requires more advanced RLS policies or a database function.
    // For now, this will only work if the user has an 'admin' role with bypass RLS privileges.
    // Or, you would create a view or function that the admin role can access.
    console.warn("getAllHistoryForAdmin requires elevated privileges and specific RLS policies for admin users.");
    
    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, role');

    if (usersError) {
        console.error('Error fetching users for admin:', usersError);
        throw usersError;
    }

    const historyPromises = users.map(async (user) => {
        const { data: historyData, error: historyError } = await supabase
            .from('analyses')
            .select('*')
            .eq('user_id', user.id);
        
        if (historyError) {
            console.error(`Error fetching history for user ${user.id}:`, historyError);
            return { user, history: [] };
        }

        const history: HistoryEntry[] = historyData.map(item => ({
            id: item.id,
            userId: item.user_id,
            createdAt: item.created_at,
            logContent: item.log_content,
            analysis: item.analysis_result as LogAnalysis,
        }));

        return { user: {id: user.id, email: user.email || '', role: user.role || 'user'}, history };
    });

    return Promise.all(historyPromises);
};

// --- User Profile ---
export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return data ? { id: data.id, email: data.email || '', role: data.role || 'user' } : null;
}
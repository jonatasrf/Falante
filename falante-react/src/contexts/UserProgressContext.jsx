import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { calculateLevel, sentencesNeededForLevel, sentencesNeededForNextLevel, getRandomLevelUpMessage } from '../utils.js';
import { useToast } from './ToastContext';

const UserProgressContext = createContext(null);

const GUEST_PROGRESS = {
    correct_sentences_count: 0,
    current_streak: 0,
    session_completed_count_listen: 0,
    last_level_up_count: 0,
    last_diamond_count: 0,
    isGuest: true,
    conversationProgress: {},
};

export const UserProgressProvider = ({ children, session }) => {
    const [progress, setProgress] = useState(null);
    const [conversationProgress, setConversationProgress] = useState({});
    const [loading, setLoading] = useState(true);
    const showToast = useToast();

    useEffect(() => {
        const fetchUserProgress = async () => {
            if (session && session.user) {
                // Fetch main progress
                const { data: mainData, error: mainError } = await supabase
                    .from('user_progress')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();

                if (mainError && mainError.code !== 'PGRST116') {
                    showToast('Failed to load user progress.', 'error');
                    setLoading(false);
                    return;
                }

                if (mainData) {
                    setProgress({ ...mainData, isGuest: false });
                } else {
                    const { data: newProgress } = await supabase.from('user_progress').insert({ user_id: session.user.id }).select().single();
                    if (newProgress) setProgress({ ...newProgress, isGuest: false });
                }

                // Fetch conversation progress
                const { data: convData, error: convError } = await supabase
                    .from('conversation_progress')
                    .select('*')
                    .eq('user_id', session.user.id);
                
                if (convError) {
                    showToast('Failed to load conversation progress.', 'error');
                } else {
                    const progressMap = convData.reduce((acc, item) => {
                        acc[item.conversation_id] = item;
                        return acc;
                    }, {});
                    setConversationProgress(progressMap);
                }

                setLoading(false);
            } else {
                setProgress(GUEST_PROGRESS);
                setConversationProgress({});
                setLoading(false);
            }
        };

        fetchUserProgress();
    }, [session]);

    const updateConversationProgress = async (conversationId, progressData) => {
        if (!session || !session.user) return;

        const { data, error } = await supabase
            .from('conversation_progress')
            .upsert({ user_id: session.user.id, conversation_id: conversationId, ...progressData }, { onConflict: 'user_id,conversation_id' })
            .select()
            .single();

        if (error) {
            showToast('Failed to save conversation progress.', 'error');
        } else if (data) {
            setConversationProgress(prev => ({ ...prev, [conversationId]: data }));
        }
    };

    const updateProgress = async (newProgress) => {
        if (progress && progress.isGuest) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from('user_progress')
                .update(newProgress)
                .eq('user_id', user.id);
            if (error) {
                showToast('Failed to save user progress.', 'error');
            } else {
                setProgress(prev => ({...prev, ...newProgress}));
            }
        }
    };

    const incrementCorrectSentences = useCallback(() => {
        if (progress && !progress.isGuest) {
            const newCount = progress.correct_sentences_count + 1;
            updateProgress({ correct_sentences_count: newCount, current_streak: progress.current_streak + 1 });
        }
    }, [progress]);

    const resetStreak = useCallback(() => {
        if (progress && !progress.isGuest) {
            updateProgress({ current_streak: 0 });
        }
    }, [progress]);

    // Popups state
    const [isDiamondPopupOpen, setIsDiamondPopupOpen] = useState(false);
    const [diamondsEarned, setDiamondsEarned] = useState(0);
    const [isLevelUpPopupOpen, setIsLevelUpPopupOpen] = useState(false);
    const [levelUpMessage, setLevelUpMessage] = useState('');
    const [newLevel, setNewLevel] = useState(0);

    useEffect(() => {
        if (progress && !progress.isGuest) {
            const currentDiamonds = Math.floor(progress.correct_sentences_count / 100);
            if (currentDiamonds > progress.last_diamond_count) {
                setDiamondsEarned(currentDiamonds);
                setIsDiamondPopupOpen(true);
                updateProgress({ last_diamond_count: currentDiamonds });
            }

            const calculatedLevel = calculateLevel(progress.correct_sentences_count);
            if (calculatedLevel > progress.last_level_up_count) {
                setNewLevel(calculatedLevel);
                setLevelUpMessage(getRandomLevelUpMessage());
                setIsLevelUpPopupOpen(true);
                updateProgress({ last_level_up_count: calculatedLevel });
            }
        }
    }, [progress]);

    const closeDiamondPopup = useCallback(() => setIsDiamondPopupOpen(false), []);
    const closeLevelUpPopup = useCallback(() => setIsLevelUpPopupOpen(false), []);

    if (loading || !progress) {
        return <div>Loading...</div>;
    }

    const value = {
        ...progress,
        conversationProgress,
        updateConversationProgress,
        incrementCorrectSentences,
        resetStreak,
        level: progress ? calculateLevel(progress.correct_sentences_count) : 0,
        diamonds: progress ? Math.floor(progress.correct_sentences_count / 100) : 0,
        progressPercentage: progress ? ( (progress.correct_sentences_count - sentencesNeededForLevel(calculateLevel(progress.correct_sentences_count))) / (sentencesNeededForNextLevel(calculateLevel(progress.correct_sentences_count)) - sentencesNeededForLevel(calculateLevel(progress.correct_sentences_count))) * 100) : 0,
        isDiamondPopupOpen,
        diamondsEarned,
        isLevelUpPopupOpen,
        levelUpMessage,
        newLevel,
        closeDiamondPopup,
        closeLevelUpPopup,
    };

    return (
        <UserProgressContext.Provider value={value}>
            {children}
        </UserProgressContext.Provider>
    );
};

export const useUserProgress = () => {
    const context = useContext(UserProgressContext);
    if (context === undefined) {
        throw new Error('useUserProgress must be used within a UserProgressProvider');
    }
    return context;
};
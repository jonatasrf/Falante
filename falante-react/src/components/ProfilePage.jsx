import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, List, ListItem, ListItemText, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Alert } from '@mui/material';
import { useUserProgress } from '../contexts/UserProgressContext';
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import { calculateStarRating } from '../utils.js';
import { supabase } from '../supabaseClient';
import { useToast } from '../contexts/ToastContext';

export default function ProfilePage() {
    const { level, diamonds, correct_sentences_count, current_streak, isGuest, conversationProgress } = useUserProgress();
    const [conversations, setConversations] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [errorConversations, setErrorConversations] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const showToast = useToast();

    useEffect(() => {
        const fetchConversations = async () => {
            setLoadingConversations(true);
            setErrorConversations(null);
            try {
                const { data, error } = await supabase
                    .from('conversations')
                    .select('id, title'); // Only need id and title for this view

                if (error) {
                    throw error;
                }
                setConversations(data);
            } catch (err) {
                console.error("Error fetching conversations:", err);
                setErrorConversations(err.message);
            } finally {
                setLoadingConversations(false);
            }
        };

        fetchConversations();
    }, []);

    const handleDeleteAccount = () => {
        setShowConfirmDialog(true);
    };

    const confirmDeleteAccount = async () => {
        setShowConfirmDialog(false);
        try {
            await supabase.auth.signOut();
            showToast('Your account has been signed out. To permanently delete your account, please visit the Supabase dashboard.', 'info');
        } catch (error) {
            showToast(`Error signing out: ${error.message}`, 'error');
        }
    };

    if (isGuest) {
        return (
            <Container component="main" maxWidth="xs">
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Typography component="h1" variant="h5" gutterBottom>
                        Profile
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2, width: '100%' }}>
                        Please log in to view your profile and saved progress.
                    </Alert>
                </Box>
            </Container>
        );
    }

    return (
        <Container component="main" maxWidth="md">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h4" gutterBottom>
                    Your Profile
                </Typography>
                <Paper elevation={3} sx={{ p: 4, mt: 3, width: '100%', maxWidth: 500 }}>
                    <Typography variant="h6" gutterBottom>General Progress</Typography>
                    <Typography variant="body1"><strong>Level:</strong> {level}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body1" sx={{ mr: 1 }}><strong>Diamonds:</strong></Typography>
                        <DiamondOutlinedIcon sx={{ mr: 0.5, color: '#b9f2ff' }} fontSize="small" />
                        <Typography variant="body1">{diamonds}</Typography>
                    </Box>
                    <Typography variant="body1"><strong>Correct Sentences:</strong> {correct_sentences_count}</Typography>
                    <Typography variant="body1"><strong>Current Streak:</strong> {current_streak}</Typography>
                </Paper>

                <Paper elevation={3} sx={{ p: 4, mt: 3, width: '100%', maxWidth: 500 }}>
                    <Typography variant="h6" gutterBottom>Conversation Progress</Typography>
                    {loadingConversations ? (
                        <Typography>Loading conversations...</Typography>
                    ) : errorConversations ? (
                        <Typography color="error">Error loading conversations: {errorConversations}</Typography>
                    ) : conversations.length === 0 ? (
                        <Typography>No conversations found.</Typography>
                    ) : (
                        <List>
                            {conversations.map((conv) => {
                                const progress = conversationProgress[conv.id];
                                const isDialogueComplete = progress && progress.dialogue_completed;
                                const starRating = progress ? calculateStarRating(progress.quiz_score, progress.quiz_max_score) : 0;

                                return (
                                    <ListItem key={conv.id} divider>
                                        <ListItemText 
                                            primary={conv.title}
                                            secondary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    {isDialogueComplete && <CheckCircleIcon color="success" fontSize="small" />}
                                                    {starRating > 0 && Array.from({ length: starRating }).map((_, i) => (
                                                        <StarIcon key={`star-filled-${i}`} sx={{ color: '#ffc107' }} fontSize="small" />
                                                    ))}
                                                    {starRating < 3 && Array.from({ length: 3 - starRating }).map((_, i) => (
                                                        <StarIcon key={`star-empty-${i}`} sx={{ color: 'grey.700' }} fontSize="small" />
                                                    ))}
                                                    {!isDialogueComplete && starRating === 0 && (
                                                        <Typography variant="caption" color="text.secondary">Not started</Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}
                </Paper>

                <Button
                    variant="outlined"
                    color="error"
                    sx={{ mt: 3 }}
                    onClick={handleDeleteAccount}
                >
                    Delete Account
                </Button>

                <Dialog
                    open={showConfirmDialog}
                    onClose={() => setShowConfirmDialog(false)}
                    aria-labelledby="confirm-delete-title"
                    aria-describedby="confirm-delete-description"
                >
                    <DialogTitle id="confirm-delete-title">
                        Confirm Account Deletion
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="confirm-delete-description">
                            Are you sure you want to delete your account? This action cannot be undone.
                            Your progress will be permanently lost.
                            To complete the deletion, you will need to visit the Supabase dashboard after signing out.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
                        <Button onClick={confirmDeleteAccount} color="error" autoFocus>
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Container>
    );
}

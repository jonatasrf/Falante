import React, { useState, useEffect } from 'react';
import { useUserProgress } from '../contexts/UserProgressContext';
import { supabase } from '../supabaseClient';
import { AppBar, Toolbar, Button, Container, Box, Typography, Card, CardContent, CardMedia, Alert, Skeleton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined';
import { calculateStarRating } from '../utils.js';
import ConversationListenType from './ConversationListenType';
import ConversationQuiz from './ConversationQuiz';
import Login from './Login';
import DiamondPopup from './DiamondPopup';
import LevelUpPopup from './LevelUpPopup';
import UpdatePassword from './UpdatePassword';
import ProfilePage from './ProfilePage';

const VIEWS = {
  HOME: 'Home',
  CONVERSATION_LISTEN_TYPE: 'Conversation Listen & Type',
  LOGIN: 'Login',
  UPDATE_PASSWORD: 'Update Password',
  PROFILE: 'Profile',
};

export default function MainApp({ session }) {
  const [activeView, setActiveView] = useState(VIEWS.HOME);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [quizReady, setQuizReady] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('id, title, image_url, phrases, objective_questions, level');

        if (error) {
          throw error;
        }

        const formattedConversations = data.map(c => ({ ...c, objectiveQuestions: c.objective_questions }));
        setConversations(formattedConversations);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

    const { isDiamondPopupOpen, diamondsEarned, closeDiamondPopup, isLevelUpPopupOpen, newLevel, levelUpMessage, closeLevelUpPopup, level, diamonds, conversationProgress, isGuest } = useUserProgress();

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (activeView === VIEWS.CONVERSATION_LISTEN_TYPE) {
        // Conversation Listen & Type shortcuts
        if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
          event.preventDefault();
          document.getElementById('speak-button')?.click();
        } else if (event.key === 'Tab') {
          event.preventDefault();
          document.getElementById('hint-button')?.click();
        } else if (event.key === 'Enter' && !isInputFocused) {
          event.preventDefault();
          const checkButton = document.getElementById('check-button');
          const nextButton = document.getElementById('next-button');
          if (checkButton && !checkButton.disabled) {
            checkButton.click();
          } else if (nextButton && !nextButton.disabled) {
            nextButton.click();
          }
        }
      } else if (activeView === VIEWS.CONVERSATION_QUIZ) {
        // Conversation Quiz shortcuts
        if (event.key === 'Enter' && !isInputFocused) {
          event.preventDefault();
          document.getElementById('next-question-button')?.click();
        } else if (event.key >= '1' && event.key <= '4') { // Assuming max 4 options
          event.preventDefault();
          const optionButton = document.getElementById(`option-${event.key - 1}`);
          if (optionButton) {
            optionButton.click();
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [activeView]);

  const handleConversationStart = (conv) => {
    setSelectedConversation(conv);
    setActiveView(VIEWS.CONVERSATION_LISTEN_TYPE);
  };

  const handleConversationComplete = () => {
    setQuizReady(true);
  };

  const handleQuizComplete = () => {
    setSelectedConversation(null);
    setQuizReady(false);
    setActiveView(VIEWS.HOME);
  };

  const renderView = () => {
    if (activeView === VIEWS.LOGIN) {
        return <Login />;
    }
    if (activeView === VIEWS.UPDATE_PASSWORD) {
        return <UpdatePassword />;
    }
    if (activeView === VIEWS.PROFILE) {
        return <ProfilePage />;
    }
    if (loading && activeView === VIEWS.HOME) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Choose a Conversation
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Card key={index} sx={{ width: 200 }}>
                            <Skeleton variant="rectangular" width={200} height={120} />
                            <CardContent>
                                <Skeleton variant="text" width="80%" />
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            </Box>
        );
    }
    if (loading) {
      return <Typography>Loading...</Typography>;
    }
    if (error) {
      return <Typography color="error">Error: {error}. Please check your Supabase connection and table setup.</Typography>;
    }
    if (conversations.length === 0) {
      return <Typography>No conversations found. Please add some to your Supabase 'conversations' table.</Typography>;
    }

    switch (activeView) {
      case VIEWS.HOME:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Choose a Conversation
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
              {conversations.map((conv) => {
                const progress = !isGuest && conversationProgress[conv.id];
                const isDialogueComplete = progress && progress.dialogue_completed;
                
                const starRating = progress ? calculateStarRating(progress.quiz_score, progress.quiz_max_score) : 0;

                return (
                <Card
                  key={conv.id}
                  sx={{ width: 200, cursor: 'pointer' }}
                  onClick={() => handleConversationStart(conv)}
                >
                  <CardMedia
                    component="img"
                    height="120"
                    image={conv.image_url}
                    alt={conv.title}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div" align="center">
                      {conv.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
                      {conv.level ? conv.level.toUpperCase() : 'N/A'}
                    </Typography>
                    {!isGuest && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, minHeight: 24 }}>
                            {isDialogueComplete && <CheckCircleIcon color="success" fontSize="small" />}
                            {starRating > 0 && Array.from({ length: starRating }).map((_, i) => (
                                <StarIcon key={`star-filled-${i}`} sx={{ color: '#ffc107' }} fontSize="small" />
                            ))}
                            {starRating < 3 && Array.from({ length: 3 - starRating }).map((_, i) => (
                                <StarIcon key={`star-empty-${i}`} sx={{ color: 'grey.700' }} fontSize="small" />
                            ))}
                        </Box>
                    )}
                  </CardContent>
                </Card>
              )})}
            </Box>
          </Box>
        );
      case VIEWS.CONVERSATION_LISTEN_TYPE:
        if (!selectedConversation) return <Typography>No conversation selected.</Typography>;
        return (
          <>
            <ConversationListenType conversation={selectedConversation} onConversationComplete={handleConversationComplete} />
            {quizReady && (
              <Box sx={{ mt: 4 }}>
                <ConversationQuiz conversation={selectedConversation} onQuizComplete={handleQuizComplete} />
              </Box>
            )}
          </>
        );
      default:
        return <Typography>Select a view</Typography>;
    }
  };

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between' }}>
               <Box>
                  <Button color="inherit" onClick={() => setActiveView(VIEWS.HOME)}>Home</Button>
               </Box>
              {session ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ mr: 2 }}>
                    Level: {level}
                  </Typography>
                  <DiamondOutlinedIcon sx={{ mr: 1, color: '#b9f2ff' }} />
                  <Typography sx={{ mr: 2 }}>
                    {diamonds}
                  </Typography>
                  <Button color="inherit" onClick={() => setActiveView(VIEWS.UPDATE_PASSWORD)}>
                    Update Password
                  </Button>
                  <Button color="inherit" onClick={() => setActiveView(VIEWS.PROFILE)}>
                    Profile
                  </Button>
                  <Button color="inherit" onClick={() => supabase.auth.signOut()}>
                    Sign Out
                  </Button>
                </Box>
              ) : (
                <Button color="inherit" onClick={() => setActiveView(VIEWS.LOGIN)}>
                  Login
                </Button>
              )}
            </Box>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Container component="main" maxWidth="lg" sx={{ mt: 4 }}>
        {!session && activeView !== VIEWS.LOGIN && (
            <Alert severity="warning" sx={{ mb: 2 }}>
                You are not logged in. Your progress will not be saved.
            </Alert>
        )}
        {renderView()}
      </Container>
      <DiamondPopup open={isDiamondPopupOpen} diamondsEarned={diamondsEarned} onClose={closeDiamondPopup} />
      <LevelUpPopup open={isLevelUpPopupOpen} newLevel={newLevel} levelUpMessage={levelUpMessage} onClose={closeLevelUpPopup} />
    </>
  );
}
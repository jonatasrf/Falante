import React, { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeText, generateWordDiffHtml } from '../utils.js';
import { useTts } from '../hooks/useTts';
import { useToast } from '../contexts/ToastContext';
import { useUserProgress } from '../contexts/UserProgressContext';
import {
    Button, Card, CardContent, Typography, TextField, Box, LinearProgress, List, ListItem, ListItemText, IconButton, useTheme
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

export default function ConversationListenType({ conversation, onConversationComplete }) {
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState({ message: 'Listen to the phrase first.', type: 'default', severity: 'info' });
    const [isCorrect, setIsCorrect] = useState(false);
    const [isPracticeComplete, setIsPracticeComplete] = useState(false);

    const textFieldRef = useRef(null);

    const { speak } = useTts();
    const { incrementCorrectSentences, resetStreak, updateConversationProgress } = useUserProgress();
    const theme = useTheme();

    const currentPhrase = conversation.phrases[currentPhraseIndex];

    useEffect(() => {
        if (!isPracticeComplete && currentPhrase) {
            setFeedback({ message: 'Playing audio...', type: 'default', severity: 'info' });
            speak(currentPhrase, () => {
                setFeedback({ message: 'Now type what you heard.', type: 'default', severity: 'info' });
            }, (errorEvent) => {
                setFeedback({ message: `Audio error: ${errorEvent.error || errorEvent.message || 'Unknown error'}`, type: 'incorrect', severity: 'error' });
            });
        }
    }, [currentPhrase, isPracticeComplete, speak]);

    useEffect(() => {
        if (textFieldRef.current && !isPracticeComplete) {
            textFieldRef.current.focus();
        }
    }, [currentPhraseIndex, isPracticeComplete]);

    const handleCheck = () => {
        if (!currentPhrase) return;

        const normalizedUser = normalizeText(userInput);
        const normalizedCorrect = normalizeText(currentPhrase.text);

        if (normalizedUser === normalizedCorrect) {
            setFeedback({ message: `Correct!<br/>${currentPhrase.text}`, type: 'correct', severity: 'success' });
            setIsCorrect(true);
            incrementCorrectSentences();
        } else {
            const diffHtml = generateWordDiffHtml(currentPhrase.text, userInput);
            setFeedback({ message: `Incorrect: ${diffHtml}`, type: 'incorrect', severity: 'error' });
            setIsCorrect(false);
            resetStreak();
        }
    };

    const giveHint = () => {
        if (!currentPhrase) {
            setFeedback({ message: 'No phrase to get a hint for.', type: 'default', severity: 'info' });
            return;
        }

        const correctWords = currentPhrase.text.split(/\s+/).filter(Boolean);
        const userWords = userInput.split(/\s+/).filter(Boolean);

        let hintGiven = false;
        for (let i = 0; i < correctWords.length; i++) {
            if (i >= userWords.length || normalizeText(userWords[i]) !== normalizeText(correctWords[i])) {
                const userWord = userWords[i] || '';
                const correctWord = correctWords[i];
                setFeedback({ message: `Hint: The word "<strong>${userWord}</strong>" should be "<strong>${correctWord}</strong>"`, type: 'default', severity: 'info' });
                hintGiven = true;
                break;
            }
        }

        if (!hintGiven) {
            setFeedback({ message: 'Hint: Your input looks correct so far!', type: 'default', severity: 'info' });
        }
    };

    const handleNextPhrase = () => {
        if (currentPhraseIndex < conversation.phrases.length - 1) {
            setCurrentPhraseIndex(prevIndex => prevIndex + 1);
            setUserInput('');
            setIsCorrect(false);
            setFeedback({ message: 'Listen to the phrase first.', type: 'default', severity: 'info' });
            textFieldRef.current?.focus();
        } else {
            updateConversationProgress(conversation.id, { dialogue_completed: true });
            setIsPracticeComplete(true);
            onConversationComplete(conversation);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isCorrect) {
                handleCheck();
            } else {
                handleNextPhrase();
            }
        }
    };

    const getFeedbackSx = () => {
        const baseSx = { p: 2, borderRadius: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 1 };
        switch (feedback.severity) {
            case 'success':
                return { ...baseSx, bgcolor: theme.palette.success.dark, color: theme.palette.success.contrastText };
            case 'error':
                return { ...baseSx, bgcolor: theme.palette.error.dark, color: theme.palette.error.contrastText };
            case 'info':
                return { ...baseSx, bgcolor: theme.palette.info.dark, color: theme.palette.info.contrastText };
            default:
                return { ...baseSx, bgcolor: 'background.paper', color: 'text.primary' };
        }
    };

    const FeedbackIcon = () => {
        switch (feedback.severity) {
            case 'success': return <CheckCircleOutlineIcon />;
            case 'error': return <HighlightOffIcon />;
            default: return null;
        }
    };

    if (isPracticeComplete) {
        return (
            <Card sx={{ width: '100%' }}>
                <CardContent>
                    <Typography variant="h5" component="h2" gutterBottom>
                        Full Dialogue: {conversation.title}
                    </Typography>
                    <List>
                        {conversation.phrases.map((phrase, index) => (
                            <ListItem key={index} secondaryAction={
                                <IconButton edge="end" aria-label="play" onClick={() => speak(phrase)}>
                                    <PlayArrowIcon />
                                </IconButton>
                            }>
                                <ListItemText primary={phrase.text} />
                            </ListItem>
                        ))}
                    </List>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ width: '100%' }}>
            <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                    Conversation: {conversation.title}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                    Phrase {currentPhraseIndex + 1} of {conversation.phrases.length}
                </Typography>

                <Box sx={getFeedbackSx()}>
                    <FeedbackIcon />
                    <Typography dangerouslySetInnerHTML={{ __html: feedback.message }} />
                </Box>

                <TextField
                    multiline
                    rows={3}
                    fullWidth
                    variant="outlined"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type what you hear..."
                    disabled={!currentPhrase || isCorrect}
                    ref={textFieldRef}
                />

                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button id="speak-button" variant="contained" onClick={() => speak(currentPhrase)} disabled={!currentPhrase}>Speak</Button>
                    <Button id="check-button" variant="outlined" onClick={handleCheck} disabled={!currentPhrase || isCorrect}>Check</Button>
                    <Button id="hint-button" variant="outlined" onClick={giveHint} disabled={!currentPhrase || isCorrect}>Hint</Button>
                    <Button id="next-button" variant="contained" color="secondary" onClick={handleNextPhrase} disabled={!isCorrect}>
                        {currentPhraseIndex === conversation.phrases.length - 1 ? 'Finish Practice' : 'Next Phrase'}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}

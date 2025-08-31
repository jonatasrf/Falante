import React, { useState } from 'react';
import { Card, CardContent, Typography, Button, Box, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, LinearProgress } from '@mui/material';
import { useUserProgress } from '../contexts/UserProgressContext';

export default function ConversationQuiz({ conversation, onQuizComplete }) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);
    const { updateConversationProgress } = useUserProgress();

    const currentQuestion = conversation.objectiveQuestions[currentQuestionIndex];

    const handleRetry = () => {
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setShowResults(false);
        setScore(0);
    };

    const handleAnswerChange = (event) => {
        setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: event.target.value }));
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < conversation.objectiveQuestions.length - 1) {
            setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        } else {
            // All questions answered, show results
            checkQuizAnswers();
        }
    };

    const checkQuizAnswers = () => {
        let correctCount = 0;
        conversation.objectiveQuestions.forEach((q, index) => {
            if (userAnswers[index] === q.correctAnswer) {
                correctCount++;
            }
        });
        setScore(correctCount);
        setShowResults(true);
        updateConversationProgress(conversation.id, { 
            quiz_score: correctCount,
            quiz_max_score: conversation.objectiveQuestions.length
        });
    };

    const handleFinishQuiz = () => {
        onQuizComplete();
    };

    return (
        <Card sx={{ width: '100%' }}>
            <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                    Quiz: {conversation.title}
                </Typography>
                {!showResults ? (
                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            Question {currentQuestionIndex + 1} of {conversation.objectiveQuestions.length}
                        </Typography>
                        <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                            <FormLabel component="legend">{currentQuestion.question}</FormLabel>
                            <RadioGroup
                                value={userAnswers[currentQuestionIndex] || ''}
                                onChange={handleAnswerChange}
                            >
                                {currentQuestion.options.map((option, optIndex) => (
                                    <FormControlLabel 
                                        key={optIndex} 
                                        value={option} 
                                        control={<Radio />} 
                                        label={option} 
                                        id={`option-${optIndex}`}
                                    />
                                ))}
                            </RadioGroup>
                        </FormControl>
                        <Button id="next-question-button" variant="contained" onClick={handleNextQuestion} sx={{ mt: 2 }}>
                            {currentQuestionIndex < conversation.objectiveQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                        </Button>
                    </Box>
                ) : (
                    <Box>
                        <Typography variant="h6">Results</Typography>
                        <Typography variant="body1">You got {score} out of {conversation.objectiveQuestions.length} correct!</Typography>
                        <LinearProgress variant="determinate" value={(score / conversation.objectiveQuestions.length) * 100} sx={{ mt: 2 }} />
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button variant="outlined" onClick={handleRetry}>
                                Try Again
                            </Button>
                            <Button variant="contained" onClick={handleFinishQuiz}>
                                Back to Home
                            </Button>
                        </Box>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
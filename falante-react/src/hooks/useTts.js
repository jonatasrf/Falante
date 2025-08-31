import { useState, useEffect, useCallback, useRef } from 'react';

export const useTts = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const currentAudioRef = useRef(null); // To store the Audio object

    const speak = useCallback((sentence, onEnd, onError) => {
        const audioPath = sentence?.audioPath;

        if (!audioPath) {
            setIsSpeaking(false);
            if (onEnd) onEnd();
            return;
        }

        // Clear any existing timeout to debounce calls
        if (window.speechSynthesis.__speakTimeout) {
            clearTimeout(window.speechSynthesis.__speakTimeout);
        }

        // Stop any currently playing audio
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            currentAudioRef.current = null;
        }
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        window.speechSynthesis.__speakTimeout = setTimeout(() => {
            setIsSpeaking(true);

            const audio = new Audio(audioPath);
            currentAudioRef.current = audio; // Store the audio object
            audio.onended = () => {
                setIsSpeaking(false);
                currentAudioRef.current = null; // Clear ref on end
                if (onEnd) onEnd();
            };
            audio.onerror = (event) => {
                setIsSpeaking(false);
                currentAudioRef.current = null; // Clear ref on error
                if (onError) onError(event);
                console.error("Audio playback error:", event);
            };
            audio.play();
        }, 100); // Debounce for 100ms
    }, []);

    return { speak, isSpeaking };
};

import React, { useState, useEffect } from 'react';
import { ToastProvider } from './contexts/ToastContext';
import { UserProgressProvider } from './contexts/UserProgressContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { supabase } from './supabaseClient';
import MainApp from './components/MainApp';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ToastProvider>
        <UserProgressProvider session={session}>
          <MainApp session={session} />
        </UserProgressProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Typography } from '@mui/material';
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined';

export default function DiamondPopup({ open, starsEarned: diamondsEarned, onClose }) {
    return (
        <Dialog open={open} onClose={onClose} aria-labelledby="diamond-popup-title">
            <DialogTitle id="diamond-popup-title" sx={{ textAlign: 'center', color: '#b9f2ff' }}>
                <DiamondOutlinedIcon sx={{ fontSize: 60 }} />
            </DialogTitle>
            <DialogContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" component="div" gutterBottom>
                    Congratulations!
                </Typography>
                <DialogContentText>
                    You've earned a new diamond!
                </DialogContentText>
                <Typography variant="h4" sx={{ mt: 2 }}>
                    Total Diamonds: {diamondsEarned}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center' }}>
                <Button onClick={onClose} variant="contained">Awesome!</Button>
            </DialogActions>
        </Dialog>
    );
}
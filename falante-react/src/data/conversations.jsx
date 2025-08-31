export const conversations = [
    {
        id: 'conversation-1',
        title: 'Morning Routine',
        image_url: 'https://via.placeholder.com/150/FF5733/FFFFFF?text=Morning', // Placeholder image
        phrases: [
            { text: 'Good morning, how are you today?', audioPath: '' },
            { text: `I'm doing great, thanks! And you?`, audioPath: '' },
            { text: `I'm a bit tired, but ready for the day.`, audioPath: '' },
            { text: 'Did you sleep well?', audioPath: '' },
            { text: 'Yes, like a baby. The bed was so comfortable.', audioPath: '' },
        ],
        objectiveQuestions: [
            {
                question: 'What is the first person feeling?',
                options: ['Happy', 'Tired', 'Excited', 'Sad'],
                correctAnswer: 'Tired',
            },
            {
                question: 'How did the second person sleep?',
                options: ['Badly', 'Like a baby', 'Not at all', 'Restlessly'],
                correctAnswer: 'Like a baby',
            },
        ],
    },
    {
        id: 'conversation-2',
        title: 'At the Coffee Shop',
        image_url: 'https://via.placeholder.com/150/33FF57/FFFFFF?text=Coffee', // Placeholder image
        phrases: [
            { text: 'Can I get a latte, please?', audioPath: '' },
            { text: 'Sure, anything else?', audioPath: '' },
            { text: 'Yes, a croissant too, please.', audioPath: '' },
            { text: 'For here or to go?', audioPath: '' },
            { text: 'To go, please.', audioPath: '' },
        ],
        objectiveQuestions: [
            {
                question: 'What did the customer order first?',
                options: ['Tea', 'Espresso', 'Latte', 'Cappuccino'],
                correctAnswer: 'Latte',
            },
            {
                question: 'Did the customer want to eat the croissant there?',
                options: ['Yes', 'No'],
                correctAnswer: 'No',
            },
        ],
    },
];

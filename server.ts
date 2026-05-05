import express from 'express';
import ViteExpress from 'vite-express';

const PORT = 3001;

const app = express();


ViteExpress.listen(app, PORT, () => {
    console.log(`Server listening on port ${PORT}.`);
});
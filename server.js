import express from 'express';
import axios from 'axios';
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'sk_prod_TfMbARhdgues5AuIosvvdAC9WsA5kXiZlW8HZPaRDlIbCpSpLsXBeZO7dCVZQwHAY3P4VSBPiiC33poZ1tdUj2ljOzdTCCOSpUZ_3912';

const FILLOUT_API_BASE_URL = 'https://api.fillout.com/v1';

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/:formId/filteredResponses', (req, res) => {
    // Check if the request is coming from a browser
    const userAgent = req.get('User-Agent');
    if (userAgent && userAgent.includes('Mozilla')) {
        res.render('filteredResponses');
    } else {
        res.status(200).json({ message: 'This endpoint accepts only POST requests with JSON data.' });
    }
});

app.post('/:formId/filteredResponses', async (req, res) => {
    const formId = req.params.formId;
    const filters = req.body.filters;

    try {
        const response = await axios.post(`${FILLOUT_API_BASE_URL}/forms/${formId}/filteredResponses`, {
            filters: filters
        }, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({
            responses: response.data.responses,
            totalResponses: response.data.totalResponses,
            pageCount: response.data.pageCount
        });
    } catch (error) {
        console.error('Error fetching responses:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

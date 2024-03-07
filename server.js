import express from 'express';
import axios from 'axios';
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'sk_prod_TfMbARhdgues5AuIosvvdAC9WsA5kXiZlW8HZPaRDlIbCpSpLsXBeZO7dCVZQwHAY3P4VSBPiiC33poZ1tdUj2ljOzdTCCOSpUZ_3912';

const FILLOUT_API_BASE_URL = 'https://api.fillout.com/v1/api';

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.render('index');
});
app.get('/:formId/filteredResponses', async (req, res) => {
    const userAgent = req.get('User-Agent');
    if (userAgent && userAgent.includes('Mozilla')) {
        res.render('filteredResponses');
    } else {
        res.status(200).json({ message: 'This endpoint accepts only POST requests with JSON data.' });
    }
});
function getType(input) {
    if (!isNaN(parseFloat(input)) && isFinite(input)) {
        return 'number';
    }
    if (!isNaN(Date.parse(input))) {
        return 'date';
    }
    return 'string';
}
app.post('/:formId/filteredResponses', async (req, res) => {
    const formId = req.params.formId;
    let filtersJson;
    if (Array.isArray(req.body.filters)) {
        filtersJson = req.body.filters
    } else {
        try {
            filtersJson = JSON.parse(req.body.filters);
        } catch (error) {
            const jsonString = req.body.filters.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ');
            filtersJson = JSON.parse(jsonString);
        }
    }
    try {
        const apiResponse = await axios.get(`${FILLOUT_API_BASE_URL}/forms/${formId}/submissions`, {
            headers: {
                Authorization: `Bearer ${API_KEY}`
            }
        });
        const filteredResponses = apiResponse?.data?.responses?.filter(response => {
            try {
                let responseMatchesFilter = true;
                for (const filter of filtersJson) {
                    const question = response.questions.find(q => q.id === filter.id);
                    if (!question) {
                        responseMatchesFilter = false;
                        break;
                    }

                    const filterKeys = Object.keys(filter);
                    for (const key of filterKeys) {
                        if (question.hasOwnProperty(key) && key !== 'condition') {
                            switch (filter.condition) {
                                case 'equals':
                                    if (question[key] !== filter[key]) {
                                        responseMatchesFilter = false;
                                    }
                                    break;
                                case 'does_not_equal':
                                    if (question[key] === filter[key]) {
                                        responseMatchesFilter = false;
                                    }
                                    break;
                                case 'less_than':
                                    if (getType(filter[key]) === 'date') {
                                        if (!(new Date(question[key]).getTime() < new Date(filter[key]).getTime())) {
                                            responseMatchesFilter = false;
                                        }
                                    } else {
                                        if (question[key] !== null &&
                                            parseFloat(question[key]) >= parseFloat(filter[key])) {
                                            responseMatchesFilter = false;
                                        }
                                    }
                                    break;
                                case 'greater_than':
                                    if (getType(filter[key]) === 'date') {
                                        if (!(new Date(question[key]).getTime() > new Date(filter[key]).getTime())) {
                                            responseMatchesFilter = false;
                                        }
                                    } else {
                                        if (question[key] === null || (parseFloat(question[key]) <= parseFloat(filter[key]))) {
                                            responseMatchesFilter = false;
                                        }
                                    }
                                    break;
                                default:
                                    responseMatchesFilter = false;
                                    break;
                            }
                        }
                    }
                    if (!responseMatchesFilter) {
                        break;
                    }
                }
                return responseMatchesFilter;
            } catch (error) {
                console.error('Error filtering responses:', error);
                return false;
            }
        });
        res.json({
            responses: filteredResponses,
            totalResponses: filteredResponses.length,
            pageCount: Math.ceil(filteredResponses?.length)
        });
    }
    catch (error) {
        console.error('Error fetching responses:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

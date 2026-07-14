# RevCast AI

Probabilistic revenue forecasting and budget optimization platform for paid media. Uses Monte Carlo simulation to generate confidence intervals and AI-generated summaries.

**Live Demo:** [https://revcast-frontend.onrender.com](https://revcast-frontend.onrender.com)

## Tech Stack

`FastAPI` `Next.js 14` `Python` `TypeScript` `Monte Carlo Simulation` `REST API`

## Getting Started

See [GUIDEME.md](GUIDEME.md) for full setup instructions.

## Skills

See [SKILLS.md](SKILLS.md) for a breakdown of technologies used.

---
*Built by [KeerthiShree TS](https://github.com/keerthishree20)*

# RevCast-AI

**Live Demo:** https://revcast-frontend.onrender.com

RevCast-AI is an AI-powered movie review sentiment analysis application built with **FastAPI**, **Next.js**, and **Machine Learning**.

## Repository

```bash
git clone https://github.com/keerthishree20/RevCast-AI.git
cd RevCast-AI
```

## Python Version

Python **3.10+**

## Install Dependencies

### Backend

```bash
cd backend
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Run the Application

### Backend

```bash
cd backend
uvicorn main:app --reload
```

Runs at:

```
http://localhost:8000
```

### Frontend

```bash
cd frontend
npm run dev
```

Runs at:

```
http://localhost:3000
```

## Live Application

https://revcast-frontend.onrender.com

## Hackathon Prediction Pipeline

The automated evaluation command is:

```bash
./run.sh ./data ./pickle/model.pkl ./output/predictions.csv
```

where:

* `data/` contains the input dataset.
* `pickle/model.pkl` contains the trained model.
* Predictions are written to `output/predictions.csv`.

## Project Structure

```
RevCast-AI/
├── backend/
├── frontend/
├── data/
├── pickle/
│   └── model.pkl
├── src/
├── output/
├── run.sh
├── requirements.txt
├── README.md
├── GUIDEME.md
├── CLAUDE.md
└── SKILLS.md
```

## Technologies Used

* Python
* FastAPI
* Next.js
* React
* Scikit-learn
* Pandas
* NumPy

## Author

**KeerthiShree T S**

Email: [keerthishreets@gmail.com](mailto:keerthishreets@gmail.com)
